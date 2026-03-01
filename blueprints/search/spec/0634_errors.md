# Crawler Error Investigation & Classification

> Living document — updated as new error patterns are discovered.

## Error Classification Architecture

### Previous approach (broken): String matching on `e.to_string()`

reqwest's `Error::to_string()` only shows the **outer wrapper**, not the inner cause:
```
"error sending request for url (http://example.com/)"
```

The actual inner error (DNS failure, TLS error, timeout, connection refused) is only
available via the `source()` chain. String-matching on the outer message misclassifies
almost everything as "Connection" because `"error sending request"` matches our
connection pattern.

**Result**: 99,845 "conn" errors in 200K benchmark — almost all misclassified.

### Current approach: reqwest typed methods + error chain walking

```rust
fn classify_reqwest_error(e: &reqwest::Error) -> ErrorCategory {
    if e.is_timeout()  → Timeout
    if e.is_builder()  → InvalidUrl
    if e.is_connect()  → walk chain → DNS / TLS / Connection
    if e.is_request()  → walk chain → DNS / TLS / Timeout / Connection
    else               → Other
}
```

`error_chain_string()` walks `source()` to build the full error message for logging.

---

## Error Categories

### 1. InvalidUrl (builder error)
**reqwest method**: `is_builder() == true`
**Cause**: URL is so malformed that reqwest can't even construct an HTTP request.
**fetch_time_ms**: 0 (no network call made)

**Common patterns in HN seed data**:
- Template syntax leaked: `{page.url|replace`, `{{...}}`
- Random garbage: `$$t%$.issomerandom!@`, `0963347006` (phone number)
- URL-encoded junk as domain: `%22+http`, `%22http`
- HTML entities as domain: `&lt;ahref=&quot;bugreport.cgi`
- Article slugs as domain: `2021-11-10-world-starting-to-notice-...`
- Leading dots: `.com`, `.nytimes.com`
- Wildcards: `*.travian.*`
- Facebook numeric IDs: `100009676428753`

**Scale**: ~35/10K seeds (0.35%), ~700/200K estimated

**Fix**: These are seed data quality issues. Should be pre-filtered during seed import,
but the crawler handles them gracefully (instant fail, no network overhead).

---

### 2. DNS Errors
**reqwest method**: `is_connect() == true` with `source()` chain containing DNS keywords
**Cause**: Domain doesn't resolve — NXDOMAIN, no A/AAAA records, resolver failure.
**fetch_time_ms**: 1-50ms typically (hickory-dns async resolver, fast NXDOMAIN)

**Inner error patterns** (from `source()` chain):
- `dns error: failed to lookup address information`
- `dns error: no record found for name: example.com type: A class: IN`
- `resolve error: no addresses returned`
- `nxdomain`

**Scale**: ~942/10K seeds (9.4%). This is the expected dead-domain rate for HN URLs.

**Sub-categories** (10K benchmark):

| Sub-category | Count | % of DNS | Pattern |
|-------------|-------|----------|---------|
| **nxdomain** | 911 | 97.9% | `no records found`, `nxdomain`, `name or service not known`, `no address associated` |
| **malformed** | 18 | 1.9% | `malformed`, `invalid character`, `label bytes exceed 63` |
| **other** | 0 | 0.0% | servfail, network error, etc. |

NXDOMAIN dominates — 98% of DNS errors are dead domains. Malformed labels (1.9%) are
seed quality issues (domain with invalid characters, oversized labels).

**Note**: With hickory-dns (async DNS), NXDOMAIN returns in <5ms. Without it (system DNS
via getaddrinfo), NXDOMAIN takes 3-15s and gets misclassified as timeout.

---

### 3. Connection Errors
**reqwest method**: `is_connect() == true` (after excluding DNS/TLS from chain)
**Cause**: DNS resolved but TCP connection failed — server is down, port closed, firewall.
**fetch_time_ms**: 50-250ms (TCP SYN timeout, RST response, or ICMP unreachable)

**Inner error patterns**:
- `tcp connect error: Connection refused (os error 111)`
- `tcp connect error: Connection reset by peer`
- `tcp connect error: Network is unreachable (os error 101)`
- `tcp connect error: No route to host (os error 113)`
- `connection closed before message completed`

**Scale**: ~78/10K seeds (0.78%). These are genuinely dead servers.

**Sub-categories** (10K benchmark):

| Sub-category | Count | % of Conn | Pattern |
|-------------|-------|-----------|---------|
| **refused** | 38 | 48.7% | `connection refused` — server exists but not listening on 80/443 |
| **eof** | 15 | 19.2% | `unexpected eof`, `connection closed`, `broken pipe` — server closes mid-request |
| **reset** | 2 | 2.6% | `reset by peer`, `connection reset` — server actively rejects |
| **other** | 23 | 29.5% | Network unreachable, no route to host, other OS errors |

**Notable sub-patterns**:
- **Connection refused** (port closed): server exists but not listening on 80/443
- **Connection reset**: server actively rejects the connection (rate limiting, IP blocking)
- **EOF/closed**: server accepts TCP but drops connection before response (load balancers, WAFs)
- **Network unreachable**: routing failure
- **Localhost URLs**: `127.0.0.1:8000`, `0.0.0.0:8080` — HN submissions with dev URLs

---

### 4. TLS Errors
**reqwest method**: `is_connect() == true` with `source()` chain containing TLS keywords
**Cause**: TCP connected but TLS handshake failed — expired cert, wrong hostname, unsupported protocol.
**fetch_time_ms**: 100-500ms (TCP handshake + partial TLS handshake)

**Inner error patterns**:
- `ssl error: certificate verify failed`
- `tls error: handshake failure`
- `tls error: alert received: handshake_failure`
- `ssl error: unsupported protocol`

**Scale**: ~13/10K seeds (0.13%)

**Note**: We use `danger_accept_invalid_certs(true)`, so most TLS errors are protocol-level
failures (ancient TLS 1.0 servers, broken SNI, etc.), not certificate validation.

**HTTP-only server investigation**: Many TLS errors may come from HTTP-only servers where
the seed URL has `https://` but the server only supports HTTP. Since our reqwest engine
uses `native-tls-vendored` without HTTPS→HTTP fallback, these fail permanently. Potential
fix: detect TLS handshake failures and retry with `http://` scheme. The hyper engine
already supports this via `.https_or_http()` in its connector. For reqwest: would need
explicit retry logic or URL normalization to test both schemes.

---

### 5. Timeout
**reqwest method**: `is_timeout() == true`
**Cause**: Server didn't respond within the configured timeout (default 1s).
**fetch_time_ms**: ~= timeout value (1000ms for pass 1, 15000ms for pass 2)

**Scale**: ~3,747/10K seeds (37.5%). This is the largest error category.

**Sub-categories** (10K benchmark):

| Sub-category | Count | % of Timeout | Meaning |
|-------------|-------|-------------|---------|
| **response** | 3,732 | 99.6% | Full HTTP timeout — server didn't respond within 1s |
| **connect** | 15 | 0.4% | TCP/TLS connect timeout — couldn't establish connection |

**Classification logic**: `timeout_connect` when `fetch_ms < 90% × cfg.timeout`,
`timeout_response` otherwise. Response timeouts dominate overwhelmingly.

**Root causes**:
- **Dead servers that accept TCP but don't respond** (SYN-ACK then silence)
- **Bot-holding**: Some servers detect crawler User-Agent and hold the connection open
  (respond in <200ms for browser UAs, >5s for crawler UAs) — see spec/0635
- **Overloaded servers**: legitimate sites that are too slow for 1s
- **Firewall drop**: SYN gets through but response is dropped (vs refused)

**Mitigation**: Pass 2 retries timeouts with 15s timeout — rescues ~86% of timeout URLs.

**Timeout layer analysis**: 99.6% of timeouts are response timeouts (full 1s). This means
nearly all timeouts are servers that accepted TCP but never replied within 1s. A multi-layer
timeout strategy (1s → 3s → 15s) could incrementally rescue more, but pass 2 at 15s already
achieves 86% rescue rate. The jump from 1s→15s is large; a 3-5s intermediate pass could
rescue servers that are "slow but alive" without the 15s cost per URL. See analysis below.

---

### 6. Other
**Catch-all**: Anything not matching the above categories.
**reqwest methods**: `is_body()`, `is_decode()`, `is_redirect()` (loop), or unknown.

**Scale**: ~0/10K seeds (0.0%) — currently perfect classification.

---

## Historical Misclassification Bug

### The 99K "conn" errors (pre-fix)

**Before** (string-based `e.to_string()` classification):
```
Failed: 101,013 (50.5%)
  dns: 171  conn: 99,845  tls: 686  other: 311
```

**After** (typed `reqwest::Error` method classification):
```
Timeout: 3,674 (36.7%)     ← were hidden in "conn"
Failed:  1,069 (10.7%)
  inv: 35  dns: 942  conn: 75  tls: 17  other: 0
```

**What happened**: `reqwest::Error::to_string()` produces:
```
"error sending request for url (http://example.com/)"
```
Our string matcher had `"error sending request"` → Connection. But the inner `source()`
chain could be:
- `operation timed out` → should be Timeout
- `dns error: no record found` → should be DNS
- `ssl error: certificate verify failed` → should be TLS

The fix: use `e.is_timeout()`, `e.is_connect()`, `e.is_builder()`, `e.is_request()`
for primary classification, then walk `source()` chain for sub-classification within
`is_connect()` and `is_request()`.

---

## Worker Count Impact on Error Rate

| Workers | OK Rate | Timeout | Connection | Notes |
|---------|---------|---------|------------|-------|
| 200     | 69.4%   | low     | moderate   | Sweet spot for reliability |
| 2,000   | 49.5%   | 36.7%   | 0.75%      | Current default, good balance |
| 16,000  | 5.1%    | ~90%    | ~5%        | OS DNS/TCP stack overwhelmed |

**Root cause at 16K workers**: All 16K tokio tasks fire DNS lookups + TCP handshakes
simultaneously, overwhelming the OS network stack. DNS resolver gets backlogged,
TCP SYN queue overflows, ephemeral ports exhausted.

**Fix**: Capped `auto_config` workers at 2,000.

---

## Error Chain Examples

### Timeout (was misclassified as Connection)
```
error sending request for url (http://example.com/)
  └─ error trying to connect: tcp connect error
       └─ operation timed out
```
`e.is_timeout() == true` catches this correctly.

### DNS (was misclassified as Connection)
```
error sending request for url (http://dead-domain.com/)
  └─ error trying to connect: dns error
       └─ failed to lookup address information: Name or service not known
```
`e.is_connect() == true`, chain contains "dns" → DNS.

### True Connection Error
```
error sending request for url (http://down-server.com/)
  └─ error trying to connect: tcp connect error
       └─ Connection refused (os error 111)
```
`e.is_connect() == true`, chain has no DNS/TLS keywords → Connection.

### Invalid URL
```
builder error for url (http://$$t%$.issomerandom!@)
```
`e.is_builder() == true` → InvalidUrl.

---

## Seed Data Quality (HN)

Total seeds: 1,539,560

| Issue | Count | % |
|-------|-------|---|
| No dot in domain | 282 | 0.018% |
| Leading dot | 5 | 0.0003% |
| Leading dash | 3 | 0.0002% |
| Space in domain | 93 | 0.006% |
| Wildcard in domain | 1 | 0.0001% |
| **Total garbage** | **~384** | **0.025%** |

Most seed URLs are syntactically valid but point to dead/unreachable servers.
The actual error breakdown at 10K scale: 52.0% OK, 37.5% Timeout, 9.3% DNS dead,
0.78% Connection dead, 0.34% Invalid URL, 0.13% TLS error.

---

## Timeout Layer Analysis

### Current strategy: 2-pass (1s → 15s)
- Pass 1: 1s timeout — catches fast sites, timeouts = 37.5% of seeds
- Pass 2: 15s timeout — retries pass-1 timeouts, rescues ~86%
- Gap: 1s to 15s is a 15× jump

### Why 1s is too short (but right for pass 1)
At 1s, we capture all sites responding in <1s (~52% OK rate). The remaining 37.5%
timeouts include:
- **Bot-holding servers** (~30-40% of timeouts): Hold connection >5s for crawler UAs
- **Genuinely slow servers** (~20-30%): Server alive but slow (2-5s response)
- **Dead servers** (~30-40%): Accept TCP SYN-ACK but never respond

1s is correct for pass 1 — it's fast enough for throughput and catches the healthy sites.
The question is whether the 1s→15s jump loses information.

### Potential 3-pass strategy: 1s → 5s → 15s
| Pass | Timeout | Target | Expected rescue |
|------|---------|--------|-----------------|
| 1 | 1s | Fast sites | 52% OK rate |
| 2 | 5s | Slow-but-alive sites | ~40-50% of P1 timeouts |
| 3 | 15s | Bot-holding + very slow | ~60-70% of P2 timeouts |

**Trade-off**: An intermediate 5s pass would:
- Separate "slow-but-alive" (2-5s) from "bot-holding" (>5s) and "dead" (never responds)
- Cost ~5× more time than pass 1 per URL, vs 15× for current pass 2
- Reduce pass-3 input size by ~40-50%, making the expensive 15s pass much smaller

**Recommendation**: Current 2-pass (86% rescue) is good enough. A 3-pass adds complexity
for marginal gain. Better ROI: fix bot-holding via UA rotation (see spec/0635).

---

## Full 10K Benchmark Results (with sub-categories)

```
OK:      5,199 (52.0%)
Timeout: 3,747 (37.5%)
  timeout: connect=15 response=3,732
Failed:  1,054 (10.5%)
  inv: 34  dns: 929  conn: 78  tls: 13  other: 0
  dns:  nxdomain=911 malformed=18 other=0
  conn: refused=38 reset=2 eof=15 other=23
```

Workers: 2,000, Timeout: 1s, Engine: reqwest, hickory-dns enabled.
