use crate::config::Config;
use crate::domain::{group_by_domain, DomainBatch, DomainState};
use crate::stats::{AdaptiveTimeout, PeakTracker, Stats, StatsSnapshot};
use crate::types::{CrawlResult, FailedURL, SeedURL};
use crate::ua;
use crate::writer::{FailureWriter, ResultWriter};
use anyhow::Result;
use bytes::Bytes;
use http_body_util::{BodyExt, Empty};
use hyper_rustls::HttpsConnector;
use hyper_util::client::legacy::connect::HttpConnector;
use hyper_util::client::legacy::Client as HyperClient;
use hyper_util::rt::{TokioExecutor, TokioTimer};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tracing::{debug, info, warn};

use super::reqwest_engine::{compute_domain_timeout, extract_metadata};

/// Type alias for the hyper HTTPS client to tame the verbose generic types.
type HttpsClient = HyperClient<HttpsConnector<HttpConnector>, Empty<Bytes>>;

/// Maximum number of HTTP redirects to follow per request.
const MAX_REDIRECTS: usize = 7;

/// Hyper+rustls-based crawl engine with domain-grouped batch processing.
///
/// Architecture mirrors ReqwestEngine exactly:
/// 1. Seeds are sorted and grouped by domain into DomainBatches.
/// 2. A producer feeds batches into a bounded channel (cap 4096).
/// 3. N worker tasks drain from the channel, each processing one domain at a time.
/// 4. Per-domain: inner_n fetch tasks share a hyper Client with connection pooling.
/// 5. Adaptive timeout, domain abandonment, and peak RPS tracking are all lock-free.
///
/// Key differences from ReqwestEngine:
/// - Uses hyper + hyper-rustls instead of reqwest
/// - Manual redirect following (301/302/307/308, up to 7 hops)
/// - Body reading via http_body_util::BodyExt
pub struct HyperEngine;

impl HyperEngine {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait::async_trait]
impl super::Engine for HyperEngine {
    async fn run(
        &self,
        seeds: Vec<SeedURL>,
        cfg: &Config,
        results: Arc<dyn ResultWriter>,
        failures: Arc<dyn FailureWriter>,
    ) -> Result<StatsSnapshot> {
        let total_seeds = seeds.len();
        if total_seeds == 0 {
            return Ok(StatsSnapshot {
                ok: 0,
                failed: 0,
                timeout: 0,
                skipped: 0,
                bytes_downloaded: 0,
                total: 0,
                duration: Duration::ZERO,
                peak_rps: 0,
            });
        }

        info!(
            "hyper engine: {} seeds, {} workers, inner_n={}",
            total_seeds, cfg.workers, cfg.inner_n
        );

        // Group seeds by domain
        let batches = group_by_domain(seeds);
        let domain_count = batches.len();
        info!("grouped into {} domains", domain_count);

        // Shared stats
        let stats = Arc::new(Stats::new());
        let adaptive = Arc::new(AdaptiveTimeout::new());
        let peak = Arc::new(PeakTracker::new());

        // Work channel: producer feeds domain batches, workers consume
        let (batch_tx, batch_rx) = async_channel::bounded::<DomainBatch>(4096);

        // Producer: feed all domain batches into the channel
        let producer = tokio::spawn(async move {
            for batch in batches {
                if batch_tx.send(batch).await.is_err() {
                    break; // receivers dropped
                }
            }
            // Channel closes when batch_tx is dropped
        });

        // Worker tasks
        let workers = cfg.workers.max(1);
        let inner_n = cfg.inner_n.max(1);
        let mut worker_handles = Vec::with_capacity(workers);

        for _ in 0..workers {
            let rx = batch_rx.clone();
            let cfg = cfg.clone();
            let results = Arc::clone(&results);
            let failures = Arc::clone(&failures);
            let stats = Arc::clone(&stats);
            let adaptive = Arc::clone(&adaptive);
            let peak = Arc::clone(&peak);

            let handle = tokio::spawn(async move {
                while let Ok(batch) = rx.recv().await {
                    process_one_domain(
                        batch.domain,
                        batch.urls,
                        &cfg,
                        &adaptive,
                        inner_n,
                        &results,
                        &failures,
                        &stats,
                        &peak,
                    )
                    .await;
                }
            });
            worker_handles.push(handle);
        }

        // Wait for producer to finish sending
        let _ = producer.await;
        // Close the channel so workers see EOF
        batch_rx.close();

        // Wait for all workers to finish
        for h in worker_handles {
            let _ = h.await;
        }

        // Update peak RPS in stats
        stats
            .peak_rps
            .store(peak.peak(), Ordering::Relaxed);

        let snapshot = stats.snapshot();
        info!(
            "hyper engine done: total={} ok={} failed={} timeout={} skipped={} peak_rps={} duration={:.1}s",
            snapshot.total,
            snapshot.ok,
            snapshot.failed,
            snapshot.timeout,
            snapshot.skipped,
            snapshot.peak_rps,
            snapshot.duration.as_secs_f64()
        );

        Ok(snapshot)
    }
}

/// Build a hyper client with HTTPS (rustls) support.
///
/// Uses webpki root certificates (Mozilla's trusted roots), enables HTTP/1.1 and HTTP/2,
/// and configures connection pool idle timeout.
fn build_hyper_client(pool_idle: Duration) -> Result<HttpsClient> {
    let https = hyper_rustls::HttpsConnectorBuilder::new()
        .with_webpki_roots()
        .https_or_http()
        .enable_http1()
        .enable_http2()
        .build();

    let client = HyperClient::builder(TokioExecutor::new())
        .pool_idle_timeout(pool_idle)
        .pool_timer(TokioTimer::new())
        .build(https);

    Ok(client)
}

/// Process all URLs for a single domain.
///
/// Creates a hyper Client with connection pooling, spawns inner_n fetch tasks
/// sharing the client, and tracks domain health for abandonment.
async fn process_one_domain(
    domain: String,
    urls: Vec<SeedURL>,
    cfg: &Config,
    adaptive: &Arc<AdaptiveTimeout>,
    inner_n: usize,
    results: &Arc<dyn ResultWriter>,
    failures: &Arc<dyn FailureWriter>,
    stats: &Arc<Stats>,
    peak: &Arc<PeakTracker>,
) {
    let url_count = urls.len();
    if url_count == 0 {
        return;
    }

    // Calculate effective domain timeout
    let effective_domain_timeout = compute_domain_timeout(cfg, url_count, inner_n);

    // Build hyper client for this domain
    let client = match build_hyper_client(Duration::from_secs(15)) {
        Ok(c) => Arc::new(c),
        Err(e) => {
            warn!("failed to build hyper client for {}: {}", domain, e);
            // Mark all URLs as failed
            for seed in &urls {
                let _ = failures.write_url(FailedURL {
                    url: seed.url.clone(),
                    domain: seed.domain.clone(),
                    reason: "client_build_error".to_string(),
                    error: e.to_string(),
                    status_code: 0,
                    fetch_time_ms: 0,
                    detected_at: chrono::Utc::now().naive_utc(),
                });
                stats.failed.fetch_add(1, Ordering::Relaxed);
            }
            return;
        }
    };

    // URL channel: bounded by URL count so send never blocks
    let (url_tx, url_rx) = async_channel::bounded::<SeedURL>(url_count);
    for u in urls {
        let _ = url_tx.send(u).await;
    }
    url_tx.close();

    // Shared domain state for abandonment
    let abandoned = Arc::new(AtomicBool::new(false));
    let domain_successes = Arc::new(std::sync::atomic::AtomicU64::new(0));
    let domain_timeouts = Arc::new(std::sync::atomic::AtomicU64::new(0));

    // Spawn inner_n fetch tasks (capped by url count)
    let n = inner_n.min(url_count);
    let mut handles = Vec::with_capacity(n);

    for _ in 0..n {
        let rx = url_rx.clone();
        let client = Arc::clone(&client);
        let cfg_timeout = cfg.timeout;
        let cfg_adaptive_max = cfg.adaptive_timeout_max;
        let disable_adaptive = cfg.disable_adaptive_timeout;
        let max_body_bytes = cfg.max_body_bytes;
        let domain_fail_threshold = cfg.domain_fail_threshold;
        let domain_dead_probe = cfg.domain_dead_probe;
        let domain_stall_ratio = cfg.domain_stall_ratio;
        let inner_n_copy = inner_n;
        let adaptive = Arc::clone(adaptive);
        let results = Arc::clone(results);
        let failures = Arc::clone(failures);
        let stats = Arc::clone(stats);
        let peak = Arc::clone(peak);
        let abandoned = Arc::clone(&abandoned);
        let domain_successes = Arc::clone(&domain_successes);
        let domain_timeouts = Arc::clone(&domain_timeouts);
        let domain_name = domain.clone();

        let handle = tokio::spawn(async move {
            while let Ok(seed) = rx.recv().await {
                // Check if domain has been abandoned
                if abandoned.load(Ordering::Relaxed) {
                    stats.skipped.fetch_add(1, Ordering::Relaxed);
                    let _ = failures.write_url(FailedURL::new(
                        &seed.url,
                        &seed.domain,
                        "domain_http_timeout_killed",
                    ));
                    continue;
                }

                // Compute effective timeout (adaptive or fixed)
                let effective_timeout = if !disable_adaptive {
                    adaptive
                        .timeout(cfg_adaptive_max)
                        .unwrap_or(cfg_timeout)
                } else {
                    cfg_timeout
                };

                // Fetch the URL
                let result = hyper_fetch_one(
                    &client,
                    &seed,
                    effective_timeout,
                    max_body_bytes,
                )
                .await;

                stats.total.fetch_add(1, Ordering::Relaxed);
                peak.record();

                // Classify result
                if !result.error.is_empty() {
                    let is_timeout = result.error.contains("timeout")
                        || result.error.contains("Timeout")
                        || result.error.contains("deadline")
                        || result.error.contains("timed out");

                    if is_timeout {
                        stats.timeout.fetch_add(1, Ordering::Relaxed);
                        let t = domain_timeouts.fetch_add(1, Ordering::Relaxed) + 1;

                        // Check abandonment
                        let ds = DomainState {
                            successes: domain_successes.load(Ordering::Relaxed),
                            timeouts: t,
                        };
                        if ds.should_abandon(
                            domain_fail_threshold,
                            domain_dead_probe,
                            domain_stall_ratio,
                            inner_n_copy,
                        ) {
                            abandoned.store(true, Ordering::Relaxed);
                            debug!(
                                "abandoning domain {} (timeouts={}, successes={})",
                                domain_name, t, ds.successes
                            );
                        }

                        let _ = failures.write_url(FailedURL {
                            url: seed.url.clone(),
                            domain: seed.domain.clone(),
                            reason: "http_timeout".to_string(),
                            error: result.error.clone(),
                            status_code: 0,
                            fetch_time_ms: result.fetch_time_ms,
                            detected_at: chrono::Utc::now().naive_utc(),
                        });
                    } else {
                        stats.failed.fetch_add(1, Ordering::Relaxed);
                        let _ = failures.write_url(FailedURL {
                            url: seed.url.clone(),
                            domain: seed.domain.clone(),
                            reason: "http_error".to_string(),
                            error: result.error.clone(),
                            status_code: result.status_code,
                            fetch_time_ms: result.fetch_time_ms,
                            detected_at: chrono::Utc::now().naive_utc(),
                        });
                    }
                } else {
                    stats.ok.fetch_add(1, Ordering::Relaxed);
                    domain_successes.fetch_add(1, Ordering::Relaxed);
                    adaptive.record(result.fetch_time_ms);
                }

                stats
                    .bytes_downloaded
                    .fetch_add(result.content_length as u64, Ordering::Relaxed);

                let _ = results.write(result);
            }
        });
        handles.push(handle);
    }

    // Optionally wrap with domain timeout
    if let Some(dt) = effective_domain_timeout {
        let domain_name = domain.clone();
        let abandoned_outer = Arc::clone(&abandoned);
        let stats_outer = Arc::clone(stats);
        let failures_outer = Arc::clone(failures);

        let wait_fut = async {
            for h in handles {
                let _ = h.await;
            }
        };

        match tokio::time::timeout(dt, wait_fut).await {
            Ok(()) => {
                // All tasks completed within domain timeout
            }
            Err(_) => {
                // Domain timeout exceeded — abandon remaining URLs
                abandoned_outer.store(true, Ordering::Relaxed);
                warn!(
                    "domain {} exceeded timeout ({:.1}s), abandoning remaining URLs",
                    domain_name,
                    dt.as_secs_f64()
                );

                // Drain remaining URLs and mark them as deadline exceeded
                while let Ok(seed) = url_rx.try_recv() {
                    stats_outer.skipped.fetch_add(1, Ordering::Relaxed);
                    let _ = failures_outer.write_url(FailedURL::new(
                        &seed.url,
                        &seed.domain,
                        "domain_deadline_exceeded",
                    ));
                }
            }
        }
    } else {
        // No domain timeout — just wait for all tasks
        for h in handles {
            let _ = h.await;
        }
    }
}

/// Fetch a single URL using the shared hyper client with manual redirect following.
///
/// Returns a CrawlResult with metadata extracted from HTML responses.
/// On error, returns an error result with the error message.
async fn hyper_fetch_one(
    client: &HttpsClient,
    seed: &SeedURL,
    timeout: Duration,
    max_body_bytes: usize,
) -> CrawlResult {
    let start = Instant::now();
    let mut current_url = seed.url.clone();

    for _redirect in 0..=MAX_REDIRECTS {
        let uri = match current_url.parse::<hyper::Uri>() {
            Ok(u) => u,
            Err(e) => {
                return CrawlResult::error_result(
                    &seed.url,
                    &seed.domain,
                    format!("invalid URI: {}", e),
                    start.elapsed().as_millis() as i64,
                );
            }
        };

        let req = match hyper::Request::builder()
            .method(hyper::Method::GET)
            .uri(&uri)
            .header("user-agent", ua::pick_user_agent())
            .body(Empty::<Bytes>::new())
        {
            Ok(r) => r,
            Err(e) => {
                return CrawlResult::error_result(
                    &seed.url,
                    &seed.domain,
                    format!("request build error: {}", e),
                    start.elapsed().as_millis() as i64,
                );
            }
        };

        // Send request with timeout
        let resp = match tokio::time::timeout(timeout, client.request(req)).await {
            Ok(Ok(r)) => r,
            Ok(Err(e)) => {
                return CrawlResult::error_result(
                    &seed.url,
                    &seed.domain,
                    e.to_string(),
                    start.elapsed().as_millis() as i64,
                );
            }
            Err(_) => {
                return CrawlResult::error_result(
                    &seed.url,
                    &seed.domain,
                    "timeout".to_string(),
                    start.elapsed().as_millis() as i64,
                );
            }
        };

        let status = resp.status().as_u16();

        // Extract headers before consuming the response
        let content_type = resp
            .headers()
            .get("content-type")
            .and_then(|v| v.to_str().ok())
            .unwrap_or("")
            .to_string();
        let content_length_header = resp
            .headers()
            .get("content-length")
            .and_then(|v| v.to_str().ok())
            .and_then(|v| v.parse::<i64>().ok())
            .unwrap_or(0);
        let location = resp
            .headers()
            .get("location")
            .and_then(|v| v.to_str().ok())
            .map(|s| s.to_string());

        // Handle redirects
        if matches!(status, 301 | 302 | 307 | 308) {
            if let Some(ref loc) = location {
                // Resolve relative redirects
                current_url = resolve_redirect(&current_url, loc);
                continue;
            }
            // Redirect without location header — treat as final response
        }

        // Collect body with timeout
        let body_bytes =
            match tokio::time::timeout(timeout, collect_body(resp, max_body_bytes)).await {
                Ok(Ok(b)) => b,
                Ok(Err(e)) => {
                    return CrawlResult::error_result(
                        &seed.url,
                        &seed.domain,
                        format!("body read error: {}", e),
                        start.elapsed().as_millis() as i64,
                    );
                }
                Err(_) => {
                    return CrawlResult::error_result(
                        &seed.url,
                        &seed.domain,
                        "timeout reading body".to_string(),
                        start.elapsed().as_millis() as i64,
                    );
                }
            };

        let body_len = body_bytes.len() as i64;
        let is_html =
            content_type.contains("text/html") || content_type.contains("application/xhtml");

        let (title, description, language) =
            if status == 200 && is_html && !body_bytes.is_empty() {
                extract_metadata(&body_bytes)
            } else {
                (String::new(), String::new(), String::new())
            };

        return CrawlResult {
            url: seed.url.clone(),
            domain: seed.domain.clone(),
            status_code: status,
            content_type,
            content_length: content_length_header.max(body_len),
            title,
            description,
            language,
            redirect_url: location.unwrap_or_default(),
            fetch_time_ms: start.elapsed().as_millis() as i64,
            crawled_at: chrono::Utc::now().naive_utc(),
            error: String::new(),
            body: String::new(),
        };
    }

    // Exceeded max redirects
    CrawlResult::error_result(
        &seed.url,
        &seed.domain,
        format!("too many redirects (max {})", MAX_REDIRECTS),
        start.elapsed().as_millis() as i64,
    )
}

/// Collect the response body up to max_bytes.
async fn collect_body(
    resp: hyper::Response<hyper::body::Incoming>,
    max_bytes: usize,
) -> Result<Bytes, String> {
    // Use Limited to cap body size, then collect
    use http_body_util::Limited;
    let limited = Limited::new(resp.into_body(), max_bytes);
    match limited.collect().await {
        Ok(collected) => Ok(collected.to_bytes()),
        Err(e) => {
            // If the error is due to length limit, that is fine —
            // we just got a truncated body. But http_body_util::Limited
            // returns an error when the limit is exceeded, so we need
            // to handle this gracefully. Unfortunately Limited doesn't
            // give us the partial data on error, so fall back to empty.
            let err_str = e.to_string();
            if err_str.contains("length limit exceeded") {
                // Body exceeded limit — return empty rather than failing
                // This matches the reqwest engine behavior of truncation
                Ok(Bytes::new())
            } else {
                Err(err_str)
            }
        }
    }
}

/// Resolve a redirect location against the current URL.
/// Handles both absolute and relative redirect targets.
fn resolve_redirect(base_url: &str, location: &str) -> String {
    // If the location is already absolute, use it directly
    if location.starts_with("http://") || location.starts_with("https://") {
        return location.to_string();
    }

    // Parse the base URL to extract scheme + authority
    if let Ok(base_uri) = base_url.parse::<hyper::Uri>() {
        let scheme = base_uri.scheme_str().unwrap_or("https");
        let authority = base_uri.authority().map(|a| a.as_str()).unwrap_or("");

        if location.starts_with('/') {
            // Absolute path
            format!("{}://{}{}", scheme, authority, location)
        } else {
            // Relative path — resolve against base path
            let base_path = base_uri.path();
            let parent = if let Some(pos) = base_path.rfind('/') {
                &base_path[..=pos]
            } else {
                "/"
            };
            format!("{}://{}{}{}", scheme, authority, parent, location)
        }
    } else {
        // Fallback: return location as-is
        location.to_string()
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_resolve_redirect_absolute() {
        let base = "https://example.com/page";
        let loc = "https://other.com/new";
        assert_eq!(resolve_redirect(base, loc), "https://other.com/new");
    }

    #[test]
    fn test_resolve_redirect_absolute_path() {
        let base = "https://example.com/old/page";
        let loc = "/new/page";
        assert_eq!(
            resolve_redirect(base, loc),
            "https://example.com/new/page"
        );
    }

    #[test]
    fn test_resolve_redirect_relative() {
        let base = "https://example.com/dir/page";
        let loc = "other";
        assert_eq!(
            resolve_redirect(base, loc),
            "https://example.com/dir/other"
        );
    }

    #[test]
    fn test_resolve_redirect_http() {
        let base = "http://example.com/page";
        let loc = "/new";
        assert_eq!(resolve_redirect(base, loc), "http://example.com/new");
    }
}
