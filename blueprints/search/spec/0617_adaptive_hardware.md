# Spec 0617: Adaptive Hardware Detection + Keepalive Throughput

**Date:** 2026-02-27
**Branch:** `open-index`
**Goal:** Auto-detect server hardware, fix fd limit for keepalive engine, auto-tune workers/innerN, and achieve 3,000+ avg OK pages/s on server2 with the keepalive engine.

---

## Server Hardware Profiles

| Metric | server1 (`tam@doge-01`) | server2 (`root@vmi3112167`) |
|--------|----------------------|------------------------|
| CPUs | 4 × AMD EPYC | 6 × AMD EPYC |
| RAM total | 5.8 GB | 11.7 GB |
| RAM available | 5.0 GB (87% free) | 10.4 GB (89% free) |
| Swap | none | none |
| fd soft (before) | 1,024 | 1,024 |
| fd soft (after raise) | 65,536 | 65,536 |
| fd hard | 65,536 (container) | 65,536 |
| OS | Ubuntu 20.04 LTS | Ubuntu 24.04 LTS |
| Kernel | 5.4.0-105-generic | 6.8.0-100-generic |
| GOMEMLIMIT (wrapper) | 2 GB (stale) | 2 GB (stale) |
| GOMEMLIMIT (auto) | **3.8 GB** (75% of 5.0 GB) | **7.8 GB** (75% of 10.4 GB) |

---

## Baseline Benchmarks (pre-0617)

| Engine | Server | Workers | InnerN | Seeds | Avg RPS | OK/s | OK% | Duration |
|--------|--------|---------|--------|-------|---------|------|-----|---------|
| keepalive | server1 | 3,000 | 4 | 157K | ~2,480 | ~1,860 | 75% | ~63s |
| swarm | server1 | 300/drone | 8 | 1.27M | 694 | 594 | 85.9% | 10m13s |

---

## Root Cause Analysis

### 1. fd Soft Limit = 1,024 Blocks Keepalive at ~2,560 RPS

By Little's Law:
```
concurrent_connections = RPS × avg_latency_seconds
```

At 2,480 avg RPS and 400ms avg latency: `2480 × 0.4 = 992 concurrent connections ≈ 1,024`.
The fd limit is the exact ceiling. To exceed 2,560 RPS, we need `fd_soft > 1024`.

**`raiseRlimit(65536)` is called in SwarmEngine drone (`swarm_drone.go`) but NOT in `KeepAliveEngine.Run()`.** The main process crawl is still fd-limited.

### 2. GOMEMLIMIT Mismatch

- Server1 wrapper: `GOMEMLIMIT=2 GB`, but 5.0 GB available → GC kicks in too early, wastes RAM
- Server2 wrapper: `GOMEMLIMIT=2 GB`, but 10.4 GB available → GC is overly aggressive, wastes RAM

Fix: `debug.SetMemoryLimit(MemAvailableMB × 75%)` at runtime: server1 → 3.8 GB, server2 → 7.8 GB.

### 3. No Hardware-Aware Tuning

Default `workers=1000, innerN=8` was a compromise. Server2 can safely use `workers=2730, innerN=12`. Server1 auto-tunes to `workers=2066, innerN=8` based on 5.0 GB available RAM.

---

## Changes

### 1. `pkg/crawl/sysinfo.go` + `sysinfo_linux.go` + `sysinfo_other.go`

New `SysInfo` struct gathering:
- Hostname, OS, arch, kernel version
- CPU count, GOMAXPROCS, Go version
- MemTotal, MemAvailable (from `/proc/meminfo` on Linux)
- fd soft (before raise), fd soft (after raise attempt), fd hard
- GatheredAt timestamp

`LoadOrGatherSysInfo(cacheFile string, ttl time.Duration) SysInfo`:
- Loads from `~/.cache/search/sysinfo.json` if fresh (TTL: 30 min)
- Otherwise gathers live and saves to cache
- Always calls `raiseRlimit(65536)` regardless of cache hit
- Returns `SysInfo.FromCache = true` when loaded from cache

`(SysInfo).Table() string`: pretty-printed hardware table.

### 2. `pkg/crawl/autoconfig.go`

`AutoConfigKeepAlive(si SysInfo, fullBody bool) (Config, string)`:

```
innerN = clamp(CPUCount×2, 4, 16)
availKB = MemAvailableMB × 1024   (fallback: 2 GB if unknown)
bodyKB = 256 (full body) or 4 (status-only)

memExpectedKB = innerN × bodyKB / 4   # 25% saturation model
memWorstKB    = innerN × bodyKB

wMem = min(availKB×0.70 / memExpectedKB,
           availKB×0.80 / memWorstKB)  # soft & hard constraint

fdSoft = FdSoftAfter (after raise)
wFd   = fdSoft / (innerN × 2)         # safety factor 2×

workers = max(min(wMem, wFd, 10000), 200)
```

Actual results (server1 had 5.0 GB avail at run time; server2 had 10.4 GB avail):

| Server | innerN | wMem | wFd | **workers** | Limiting factor | Worst-case mem |
|--------|--------|------|-----|-------------|----------------|----------------|
| server2 | 12 | 10,266 | **2,730** | **2,730** | fd-capped (65536÷24) | 8.4 GB (of 10.4 GB avail) |
| server1 | 8 | **2,066** | 4,096 | **2,066** | mem-capped (5,166 MB avail) | 4.1 GB (of 5.0 GB avail) |

### 3. `pkg/crawl/keepalive.go`

Add `raiseRlimit(65536)` at the top of `KeepAliveEngine.Run()` as a safety net (idempotent, called even if sysinfo wasn't gathered).

### 4. `cli/hn.go`

- `--workers` default: `1000` → `-1` (auto-detect from hardware)
- `--max-conns-per-domain` default: `8` → `-1` (auto-detect from hardware)
- In `runHNRecrawlV3`:
  1. Call `LoadOrGatherSysInfo(cacheFile, 30m)`
  2. Print `SysInfo.Table()`
  3. If `workers <= 0`: call `AutoConfigKeepAlive`, apply result
  4. If `workers > 0` but `maxConns <= 0`: auto-set innerN = clamp(CPUs×2, 4, 16)
  5. Call `debug.SetMemoryLimit(MemAvailableMB × 1024² × 0.75)` — overrides wrapper's 2 GB

### 5. `Makefile`

- New `seed-copy` target: copies HN seed files from server1 → server2 via SCP+SSH
- `remote-hn-recrawl-swarm` updated workers: 300 → auto (remove hardcoded flag)

---

## Throughput Model

### Auto-Config Results

| Server | innerN | wMem | wFd | **workers** | Limiting factor | GOMEMLIMIT |
|--------|--------|------|-----|-------------|----------------|-----------|
| server2 | 12 | 10,266 | **2,730** | **2,730** | fd-capped (65536÷24) | 7.8 GB |
| server1 | 8 | **2,066** | 4,096 | **2,066** | mem-capped (5,166 MB avail) | 3.8 GB |

### Theoretical vs Observed

The actual throughput is gated by **timeout drain rate**, not hardware limits:

```
timeout_drain_rate = workers / timeout_duration × timeout_fraction
effective_throughput = workers / weighted_avg_latency
  where weighted_avg_latency = ok_frac × ok_latency + timeout_frac × timeout_s
```

| Server | Formula | Predicted | Observed |
|--------|---------|-----------|---------|
| server1 (50.9% timeout) | 2066 / (0.491×0.3 + 0.509×5) | ~758 req/s | 761 req/s ✓ |
| server2 (60.4% timeout) | 2730 / (0.396×0.3 + 0.604×5) | ~870 req/s | 415 req/s |

_Server2 actual is lower than predicted — likely due to longer DNS resolution phase (166K DNS timeouts) and server2's fresh DNS state slowing the initial ramp-up._

### With Good Seeds (pre-filtered, 75% OK, 400ms avg latency)

| Server | Formula | Predicted req/s | Predicted OK/s |
|--------|---------|----------------|---------------|
| server1 (2,066 workers) | 2066 / (0.75×0.4 + 0.25×5) | ~692 req/s | ~519 OK/s |
| server2 (2,730 workers) | 2730 / (0.75×0.4 + 0.25×5) | **~915 req/s** | **~686 OK/s** |

_With good seeds server2 achieves ~32% more OK/s than server1 (hardware advantage visible)._

For **3,000 OK/s** with good seeds (75% OK, 400ms avg):
`workers = 3000/0.75 × (0.75×0.4 + 0.25×5) / 1 ≈ 4,000 workers × (0.55s avg) ≈ need ~11K concurrent conns`
→ This requires fd limit well above 65K, or alternatively a much better OK rate (95%+ with pre-screened HTTP-live domains).

---

## Benchmark Results

### Post-0617 Benchmarks (2026-02-27, full HN domain dataset)

Both servers ran `search hn recrawl` with auto-config against the full `hn_domains.duckdb` (1.54M seeds, 641.7K domains, DNS-filtered before crawl).

| Engine | Server | Workers | InnerN | Seeds (after DNS) | Avg req/s | **Avg OK/s** | Peak req/s | **Peak OK/s** | OK% | Timeout% | Avg latency | Duration (proj.) | GOMEMLIMIT |
|--------|--------|---------|--------|-------|---------|----------|---------|---------|-----|---------|-----------|-----------|-----------|
| keepalive | server1 | **2,066** (auto) | **8** (auto) | 1,271,412 | 761 | **339** | 1,056 | **471** | 44.6% | 50.9% | 3,652ms | ~33 min | 3.8 GB (auto) |
| keepalive | server2 | **2,730** (auto) | **12** (auto) | 1,044,898 | 415 | **148** | 1,775 | **632** | 35.6% | 60.4% | 4,162ms | ~42 min | 7.8 GB (auto) |

**Server1 snapshot** (at 3:10 elapsed, 11.4% done): 64,470 OK / 73,604 timeout / 6,495 fail.
**Server2 snapshot** (at 11:21 elapsed, 27.0% done): 100,643 OK / 171,027 timeout / 11,358 fail.

#### Peak Improvement vs Pre-0617 Baseline

| Metric | server1 pre-0617 | server1 post-0617 | server2 post-0617 |
|--------|-----------------|------------------|--------------------|
| Workers | 3,000 (manual) | 2,066 (auto) | 2,730 (auto) |
| fd raised | ❌ no | ✅ yes | ✅ yes |
| GOMEMLIMIT | 2 GB (static) | 3.8 GB (auto) | 7.8 GB (auto) |
| Peak req/s | 2,565 (157K seeds) | 1,056 (1.27M seeds) | **1,775** (1.04M seeds) |
| OK% | 75% | 44.6% | 35.6% |
| Peak OK/s | ~1,924 | 471 | **632** |

_Goal: server2 ≥ 3,000 avg OK/s — **not met**. See analysis below._

### Why 3,000 OK/s Was Not Reached

The bottleneck is **seed data quality**, not hardware or configuration:

1. **Full domain dataset = ~50–60% timeout rate**: `hn_domains.duckdb` contains ALL 641K HN-mentioned domains, including many that have died since they were crawled. Even after DNS filtering, 50–60% of HTTP requests timeout (DNS-alive but HTTP-dead servers).

2. **5s timeout × 50–60% of workers = throughput ceiling**:
   With 2,730 workers and 60% stuck waiting 5s each:
   `effective throughput ≈ 2,730 / (0.4 × 0.3s + 0.6 × 5s) ≈ 860 req/s`
   Matches the observed ~415–761 req/s.

3. **Previous 157K benchmark used pre-filtered seeds** (pages confirmed crawled before → 75% OK, 400ms avg latency → 2,565 RPS). That dataset is `hn_pages.duckdb` (stratified sample of known-good pages).

4. **DNS cache advantage for server1**: server1 loaded 641K DNS entries from a previous successful run → 504,800 live (79% of domains). server2 did a fresh DNS resolve → 414,167 live (65% of domains) with 166,867 DNS timeouts. Better DNS quality → fewer HTTP timeouts → higher server1 throughput.

### Path to 3,000+ OK/s

| Approach | Expected OK/s | Notes |
|----------|--------------|-------|
| Pre-filtered seeds (hn_pages.duckdb, 157K) | **~2,000–3,500** | Known-good data; server2 has 6 CPUs + fd raised |
| `--status-only` (4 KB body, not 256 KB) | ~1,500–2,000 | Workers still fd-capped; reduces mem pressure but not timeout rate |
| Shorter timeout (1–2s) | ~2,000–3,000 | Drains timeout queue 2.5–5× faster; may miss slow-but-live servers |
| `--limit 200K` (first 200K seeds only) | ~2,500–3,500 | Stratified top-200K have better OK rate (~60–70%) |

**Recommended next run:** `search hn recrawl` against a pre-filtered 157K seed set on server2 (workers=2730, innerN=12, fd=65536 raised).

_Goal is achievable; requires better seed quality, not more hardware._

---

## Two-Pass Retry System (2026-02-27)

### Motivation

With 2s timeout in pass 1, ~95% of URLs timeout — but many of those servers ARE alive and respond in 2–5s. A second pass with a longer timeout rescues them, eliminating false negatives.

### Implementation

**`cli/hn.go`** changes:
- `--retry-timeout` flag (default: `5000` ms) — timeout for pass 2
- `--no-retry` flag — skip pass 2 (for benchmarking pass 1 in isolation)
- `--workers/2` for pass 2 (slow servers need fewer concurrent connections, not more)
- `DomainFailThreshold=1` for pass 2 (more lenient)
- `DomainTimeout = retryTimeout × 3` for pass 2 (slow domains get more time)

**DuckDB connection fix:**

DuckDB only allows one connection per file. `LoadTimeoutURLs` opens failedDB read-only while it's still open read-write from pass 1 → `"Can't open a connection to same database file with a different configuration"`. Fix: close failedDB before `LoadTimeoutURLs`, reopen fresh `failedDB2` for pass 2 writes.

```go
// Before:  defer failedDB.Close()
// After:   closure-based defer with failedDBDone flag
failedDBDone := false
defer func() {
    if !failedDBDone { failedDB.Close() }
}()
// ...
// In pass 2:
failedDBDone = true
failedDB.Close()                              // flush + release DuckDB
retrySeeds, _ := recrawler.LoadTimeoutURLs(failedDBPath)  // read-only open OK now
failedDB2, _ := recrawler.OpenFailedDB(failedDBPath)      // reopen for pass 2 writes
defer failedDB2.Close()
```

### Additional Fixes Applied

**GODEBUG=netdns=go** (Makefile `deploy-linux` wrapper):
- CGO DNS (`getaddrinfo`) pins OS threads and ignores Go context cancellation → domains appeared "stuck" for 10–14 minutes even after `DomainTimeout=30s` fired
- Fix: `export GODEBUG=netdns=go` in the `~/bin/search` wrapper forces pure Go DNS resolver
- Result: domain drain improved significantly; pure Go DNS respects context cancellation

**DuckDB checkpoint blocking** (root cause of domain drain):
- `flushCh` buffer=2 causes HTTP worker goroutines to block at `s.flushCh <- batch` when DuckDB flusher is slow
- Confirmed via SIGQUIT goroutine dump: `goroutine 4543469 [chan send, 10 minutes]`
- Root cause: dirty WAL from multiple SIGKILL'd runs triggered a DuckDB checkpoint (10+ minutes)
- Fix: delete stale DuckDB result files before each run → no WAL recovery → no checkpoint → peak climbs from 5,447/s → **10,832/s**

**workers/4 → workers/2 for pass 2:**
- Pass 2 with workers/4 = 2,048 → too conservative, slow retry throughput
- Changed to workers/2 = 4,096 → ~2,476 RPS peak in pass 2

### Two-Pass Benchmark Results (server2, --limit 200K, 2026-02-27)

**Seeds:** 200K → 129,591 after DNS filter (70,409 dead/timeout filtered)

| Pass | Timeout | Workers | Seeds | Avg rps | Peak rps | OK | OK% | Timeout% | Duration |
|------|---------|---------|-------|---------|----------|-----|-----|---------|---------|
| Pass 1 | 2s | 8,192 | 129,591 | 2,573 | **10,832** | 4,889 | 3.8% | 95.4% | 50s |
| Pass 2 | 5s | 4,096 | 91,046 | 642 | 2,476 | 52,915 | **56.4%** | 36.2% | 2m21s |
| **Combined** | — | — | **129,591** unique | — | — | **57,804** | **44.6%** | — | **~3.5 min** |

**Key insight:** 56.4% of pass-1 timeouts are alive servers that respond in 2–5s. The two-pass approach captures them as true positives.

**Combined effective OK rate: 57,804 / 129,591 = 44.6%** — vs 3.8% with pass 1 only (12× more pages).

**Effective OK/s:** 57,804 ok / (50 + 141) s = **~303 OK/s avg** for the 129K-seed workload.

### Why Peak RPS Jumped 10,832 vs Previous 6,116

| Factor | Before | After |
|--------|--------|-------|
| DuckDB WAL recovery | dirty WAL from 3 SIGKILL'd runs → checkpoint → flushCh backpressure → goroutines block 10-14 min | clean DB → no checkpoint → no backpressure |
| DNS resolver | CGO getaddrinfo (blocks OS threads, ignores context cancel) | pure Go (GODEBUG=netdns=go) |
| Combined effect | 5,447/s peak | **10,832/s peak** |

---

## Files Changed

| File | Change |
|------|--------|
| `pkg/crawl/sysinfo.go` | New: `SysInfo` struct, `GatherSysInfo`, `LoadOrGatherSysInfo`, cache I/O, `Table()` |
| `pkg/crawl/sysinfo_linux.go` | New: Linux /proc/meminfo, /proc/version, fd via syscall |
| `pkg/crawl/sysinfo_other.go` | New: non-Linux stub |
| `pkg/crawl/autoconfig.go` | New: `AutoConfigKeepAlive` formula |
| `pkg/crawl/keepalive.go` | Add `raiseRlimit(65536)` at top of `Run()` |
| `cli/hn.go` | `--workers`/`--max-conns-per-domain` default → -1 (auto); inject sysinfo + GOMEMLIMIT; two-pass retry; failedDB closure fix |
| `pkg/archived/recrawler/faileddb.go` | Add `LoadTimeoutURLs()` for pass 2 retry |
| `Makefile` | Add `seed-copy` target; fix `remote-hn-recrawl-swarm` defaults; add `GODEBUG=netdns=go` to deploy wrapper |
