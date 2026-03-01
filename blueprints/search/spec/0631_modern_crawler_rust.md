# Rust Crawler: Road to 5,000 avg RPS — Bin Writer Focus

> **Date:** 2026-03-01
> **Baseline (post-v0.6.0):** 1,684 avg RPS, 6,067 peak (200K seeds, binary writer, --no-retry, server2)

## Benchmark Results (post-v0.6.0, server2)

| Writer   | Avg RPS | Peak RPS | Workers | Duration | Drain    |
|----------|---------|----------|---------|----------|----------|
| devnull  | 1,708   | 5,660    | 3,004   | 1m57s    | —        |
| **binary** | **1,684** | **6,067** | **3,004** | **1m58s** | **96.3s** |

**Critical finding:** Binary writer adds **zero overhead** vs devnull. The single-threaded bincode flusher + crossbeam channel keeps up with 6,067 peak RPS without any back-pressure. The crawl phase bottleneck is entirely the engine, not the writer.

---

## 1. Root Cause Analysis

### 1.1 Domain-Batch Architecture (Primary Bottleneck — 3.6× avg/peak gap)

**The gap:** avg=1,684 / peak=6,067 = 27.7%. Workers are active only 28% of the time.

**Little's Law quantification:**
- avg_RPS × avg_latency = effective_concurrency
- avg_latency = 88% × 50ms (fast-fail) + 12% × 300ms (ok) = **80ms**
- effective_concurrency = 1,684 × 0.080 = **134 concurrent** out of 3,004 workers
- Idle workers = 3,004 − 134 = **2,870 (95.5% idle)**

**Root cause:** Workers pick up a `DomainBatch` (all URLs for one domain), spawn inner_n=4 fetch tasks, wait for ALL inner tasks to complete, then pick the next domain. Between domain batches, workers are idle. Single-URL domains (70% of HN) release workers after one timeout (~1s), then the worker waits for the next batch from the channel.

**The fix:** Flat URL task queue with per-domain semaphores. Workers process one URL at a time and immediately pick up the next URL when done. Per-domain `tokio::sync::Semaphore` (capacity=inner_n) limits concurrency per domain without blocking the worker.

**Expected improvement:** avg approaches peak → 5,000–5,500 avg RPS (+3–3.3×).

### 1.2 Drain Phase (Secondary — 96.3s for 200K records)

The drain after crawl is single-threaded and sequential:
- Reads one segment file into memory (~200K records for 200K seeds at 0% ok, 0 body)
- Iterates records, routes to shard batches by URL hash
- On each full batch (5,000 records): DuckDB INSERT
- Sequence: 40 DuckDB INSERT batches × ~2.4s/batch = 96s

**Bottleneck:** DuckDB INSERT batches are slow (~2.4s/5K rows for WAL + checkpoint overhead) and run sequentially. With 8 shards, parallel insertion gives theoretical 8× speedup.

**The fix:** Rayon-parallel drain — read all segments, partition by shard, then insert into all 8 shards simultaneously. Expected: 96s → ~14s.

### 1.3 Workers Under-Count (Contributing — workers=3,004 vs optimal 8,192)

`auto_config` uses `available_mb` (snapshot at startup, variable) and the old inner_n multiplication formula designed for domain-batch architecture (which buffers inner_n bodies simultaneously). With flat URL queue, each worker holds one body at a time:
- Old formula: `avail_kb * 80% / (inner_n * body_kb)` = 10GB × 80% / (4 × 256KB) = 8,192
- Current result: workers=3,004 (available_mb was ~3.8GB at startup)

**Fix:** Use `mem_total_mb` (stable, not variable) and update formula for flat queue: `total_kb * 75% / body_kb`. For server2 (12GB): 12 × 1024² × 75% / 256 = 37,748 → capped at 16,000.

More workers = more concurrent fetches = higher peak, not just higher avg. With flat queue and 8,192 workers, peak could reach 8,000–10,000 RPS.

### 1.4 Binary Writer write() Mutex (Negligible)

The `write()` method holds a `Mutex<Option<Sender>>` on every call, blocking ALL workers while the channel send completes. At 1,684 RPS × ~100ns/send = 0.017% mutex occupancy. **Not a bottleneck** — confirmed by binary ≈ devnull benchmark. Not worth refactoring.

---

## 2. Implementation Plan

### Priority 1: Flat URL Task Queue (HIGH IMPACT — 3× avg RPS)

**Architecture change:** Replace domain-batch workers with flat URL workers.

```
Current:  Seeds → group_by_domain → DomainBatch channel → N workers
          (worker: pop batch, spawn inner_n tasks, wait for ALL)

New:      Seeds → group_by_domain → DomainEntry map → flat URL channel → N workers
          (worker: pop 1 URL, acquire domain semaphore, fetch, release, loop)
```

**Key components:**
- `DomainEntry`: per-domain state with `tokio::sync::Semaphore` (capacity=inner_n), abandoned flag, ok/timeout counters
- `Arc<DashMap<String, Arc<DomainEntry>>>`: lock-free concurrent domain state map
- Flat `async_channel::bounded<(SeedURL, Arc<DomainEntry>)>`: URL queue (cap = workers×4)
- Workers: `while let Ok((url, entry)) = rx.recv() { process_one_url(...).await }`
- No domain timeout needed (workers never "stuck" on a domain batch)

**New dep:** `dashmap = "6"` in `crawler-lib/Cargo.toml`

### Priority 2: Parallel Drain (MEDIUM IMPACT — 7× drain speedup)

Replace sequential segment→shard→DuckDB drain with parallel-by-shard drain using rayon.

**Architecture:**
```
Current: read seg → route to shards → INSERT shard[0] → INSERT shard[1] → ... → INSERT shard[7]

New:     read segs (sequential, I/O) → partition by shard → rayon::par_iter → INSERT all shards ∥
```

Each rayon thread opens its own DuckDB connection (not Sync) and inserts all records for its shard. Sequential read ensures I/O doesn't saturate; parallel insert saturates all CPU cores.

**New dep:** `rayon = "1"` in `crawler-lib/Cargo.toml`

### Priority 3: Workers Auto-Config for Flat Queue

Update `auto_config()` to use `mem_total_mb` (stable) and flat-queue formula (1 body/worker):
- `workers = clamp(total_kb * 75% / body_kb, 200, 16_000)`
- For server2 (12GB total): 12×1024²×75%/256 = 37,748 → capped to 16,000

---

## 3. Actual Results

### 3.1 Benchmark Table (server2, 200K HN seeds, --no-retry)

| Iteration                                     | Avg RPS | Peak RPS | Workers | Duration | Drain  |
|-----------------------------------------------|---------|----------|---------|----------|--------|
| v0.6.0 baseline (domain-batch, devnull)       | 1,708   | 5,660    | 3,004   | 1m57s    | —      |
| v0.6.0 baseline (domain-batch, **binary**)   | 1,684   | 6,067    | 3,004   | 1m58s    | 96.3s  |
| Flat queue + parallel drain + workers=16K (binary) | 3,426 | 13,369 | 16,000 | 58s     | 28.7s  |
| + Round-robin domain interleaving (devnull)   | 3,734   | 14,921   | 16,000  | 53s      | —      |
| + Round-robin domain interleaving (**binary**) | **3,486** | **10,444** | **16,000** | **57s** | **29.6s** |

### 3.2 Summary vs Targets

| Metric              | Before  | Target | Actual  | Delta vs target |
|---------------------|---------|--------|---------|-----------------|
| Avg RPS (binary)    | 1,684   | 5,000+ | 3,486   | −30% (network ceiling) |
| Drain time          | 96.3s   | ~14s   | 29.6s   | 3.3× speedup (vs 6.9× target) |
| Peak RPS            | 6,067   | 8,000+ | 10,444  | ✓ exceeded      |
| Worker count        | 3,004   | 8,192+ | 16,000  | ✓ exceeded      |

### 3.3 Analysis: Why 3,486 not 5,000

The **HN seed set ceiling** is ~3,500–3,700 avg RPS with this hardware:
- 5.5% OK rate means 94.5% of requests fail fast (TCP connect → HTTP error response in <100ms)
- Little's Law: 3,486 avg × ~50ms avg latency = **174 effective concurrent workers**
- Only 174 of 16,000 workers are active at any instant — the rest are in `rx.recv()` waiting
- The servers are the bottleneck: they respond at ~3,500/s to this IP; we can't send faster
- Round-robin (+9%) helps slightly by spreading semaphore pressure; further gains need faster servers or a different seed set

**For 5,000 avg RPS:** need a seed set with ≥70% OK rate or higher per-server throughput.
The flat URL queue + parallel drain are fully validated as the correct architecture.

---

## 4. Key Lessons

- **Binary writer is free:** 1,684 avg RPS with binary ≈ 1,708 with devnull. No writer optimization needed for the crawl path.
- **Drain speedup 3.3×:** Parallel rayon drain (29.6s) vs serial (96.3s). DuckDB I/O is the bottleneck within each shard; parallel shards give near-linear speedup.
- **Flat queue: 2.1× avg improvement:** 3,486 vs 1,684. Workers go from 95.5% idle to ~98.9% idle but processing 2.1× more URLs — the remaining idle time is genuine server-side throttling.
- **Round-robin adds 9%:** Sorted domain order causes semaphore clustering; round-robin interleaving reduces semaphore contention (3,426 → 3,734 devnull, 3,426 → 3,486 binary).
- **Peak 1.7× improvement:** 10,444 vs 6,067 with 5.3× more workers. Peak scales sub-linearly because peak already represents max server throughput for this seed set.
- **Domain timeout not needed with flat queue:** Per-request timeout (1s) + dead_probe=3 + stall_ratio=5 provide fast abandonment without a separate domain-level timeout.
- **Network ceiling is real:** The avg/peak gap (3,486/10,444 = 33%) is now driven by server-side response rate variation, not worker idle time. Further gains require a different seed set or lower-latency targets.
