# Spec 0613: recrawl_v3 — Four-Engine High-Performance Recrawler

## Objective

Implement `pkg/recrawl_v3` with four independent engines, each using a fundamentally
different I/O strategy. Benchmark all four on the remote server against the same seed
set, report winner. All engines share the same input/output interface.

---

## Remote Server Context

| Parameter | Value |
|-----------|-------|
| CPUs | 4 AMD EPYC |
| RAM available | 1.5 GB (after fix: fd limit = 65536) |
| fd limit (after spec 0612 fix) | 65536 |
| Network latency | 1.9 ms to 8.8.8.8 |
| Expected avg HTTP response | 300–1200 ms (status-only) |
| Target throughput | ≥ 1000 pages/s sustained |

Key constraint: p:0 parquet has ~2.5 M URLs and ~40–50 K unique domains. Most domains
have 50–100 URLs; a few have thousands. With `status-only`, bodies are discarded — latency
is dominated by TCP+TLS handshake and server first-byte time.

---

## Common Interface

```go
// Engine is the interface all v3 engines implement.
type Engine interface {
    // Run crawls all seeds, writing results and failures to the provided writers.
    // Returns Stats when done or ctx is cancelled.
    Run(ctx context.Context, seeds []SeedURL, dns *DNSCache, cfg Config,
        results ResultWriter, failures FailureWriter) (*Stats, error)
}

// Stats holds performance counters for benchmarking.
type Stats struct {
    Total      int64
    OK         int64
    Failed     int64
    Timeout    int64
    PeakRPS    float64
    AvgRPS     float64
    Duration   time.Duration
    P95LatMs   int64
    MemRSS     int64 // bytes at end
}

// ResultWriter accepts crawl results (nil-safe).
type ResultWriter interface {
    Add(r recrawler.Result)
    Flush(ctx context.Context) error
    Close() error
}

// FailureWriter accepts failed URLs/domains (nil-safe).
type FailureWriter interface {
    AddURL(u recrawler.FailedURL)
    Close() error
}

// DNSCache is a pre-resolved hostname→IP map (read-only during Run).
type DNSCache interface {
    Lookup(host string) (ip string, ok bool)
    IsDead(host string) bool
}
```

All four engines use `recrawler.ResultDB` and `recrawler.FailedDB` from the existing
`pkg/recrawler` package (unchanged). Seeds are `[]recrawler.SeedURL`.

---

## Engine A: KeepAlive (domain-affine keep-alive pools)

### Core Idea

URL-centric workers (v1/v2) open a new TCP+TLS connection per request when
`MaxIdleConnsPerHost` is exceeded. With 50 K domains × 500 workers, most connections
are one-shot. Engine A reverses this: **one goroutine owns one domain** and processes all
URLs for that domain sequentially, reusing a single keep-alive connection.

### Architecture

```
Seeds → group by domain → domain queue (chan domainWork)
         ↓
Worker pool (N goroutines, N = min(domains, maxWorkers))
  └─ worker checks out domain from queue
  └─ worker opens http.Client{Transport: &http.Transport{MaxIdleConnsPerHost: 4}}
  └─ processes all URLs for domain in a loop (keep-alive reuse)
  └─ releases back to pool when domain is done or timed out
         ↓
Result channel → ResultWriter goroutine → DuckDB
```

### Key Details

- Per-domain `http.Client` with `IdleConnTimeout=10s`, `MaxIdleConnsPerHost=4`
- TLS skip verify (same as v1/v2), `DisableCompression=true` for status-only
- Domain worker abandons domain if 3 consecutive errors (marks dead)
- Semaphore limits total active domain workers (avoids fd exhaustion)
- Small domains (1–2 URLs) are batched: N micro-domains share 1 worker goroutine
  via a "domain carousel" to amortize goroutine overhead

### Performance Hypothesis

TLS handshake is ~100–300 ms. With keep-alive:
- avg latency per request drops from ~1133 ms to ~300–500 ms (after 1st request)
- 500 workers / 0.4 s ≈ 1250 pages/s

---

## Engine B: Epoll / Non-blocking (small goroutine pool + explicit deadlines)

### Core Idea

Go's net/http creates 1 goroutine per idle connection. With 50 K domains and pools, that's
50 K goroutines minimum just for idle connections — expensive for a 4-core box. Engine B
uses a **fixed-size goroutine pool** (e.g., 4 × nCPU = 16 goroutines) that each act as
an event loop, processing many in-flight requests via explicit `SetDeadline` on `net.Conn`.

### Architecture

```
Seeds → work queue (buffered chan)
         ↓
Fixed pool (16 goroutines = 4×nCPU)
  └─ each goroutine runs: dial → SetDeadline → write request → read status line → close
  └─ uses raw net.Conn (not http.Client)
  └─ non-blocking DNS via pre-resolved IP (dial by IP, not hostname)
  └─ minimal HTTP/1.1 request builder (no encoding/headers overhead)
         ↓
Result channel → ResultWriter
```

### Key Details

- Goroutine count: 4 × `runtime.NumCPU()` (=16 on 4-core server)
- Each goroutine handles sequential requests but uses `net.Conn.SetDeadline` for
  timeout without blocking other goroutines
- Raw `net.Dial("tcp", ip+":"+port)` using pre-resolved IPs (no DNS lookup overhead)
- Writes minimal HTTP/1.1: `GET / HTTP/1.1\r\nHost: …\r\n\r\n`
- Reads only status line (`HTTP/1.1 200 OK`) — discards body immediately
- TLS via `tls.Client(conn, cfg)` with `cfg.InsecureSkipVerify=true`

### Performance Hypothesis

Fewer goroutines → lower memory → more L1/L2 cache efficiency.
But sequential-per-goroutine means CPU-bound at 16 goroutines × (1/latency).
Expected: lower peak but more predictable throughput, lower memory footprint.

---

## Engine C: Swarm (multi-process queen/drone)

### Core Idea

Single-process fd limit and GC pauses are bypassed by spawning **N child processes**
(drones), each with their own fd table and goroutine scheduler. The parent (queen)
distributes shuffled URLs via stdin pipes; each drone writes its own DuckDB shard.

### Architecture

```
Queen (parent process)
  └─ reads seeds, shuffles by domain hash, partitions into N buckets
  └─ spawns N drone processes: exec.Command("search", "cc", "recrawl-drone", ...)
  └─ writes JSON-lines URLs to drone stdin
  └─ reads JSON-lines stats from drone stdout
  └─ aggregates + displays live dashboard

Drone (child process, new subcommand: cc recrawl-drone)
  └─ reads SeedURL JSON from stdin
  └─ runs Engine A (KeepAlive) or Engine D (RawHTTP) internally
  └─ writes stats JSON to stdout every 500ms
  └─ writes results to own DuckDB shard dir
```

### Key Details

- Queen splits seeds by `hash(domain) % N` for locality (all URLs of domain → same drone)
- N = 4 drones on 4-core server (1 drone per core)
- Each drone has its own fd limit (65536 / 4 = 16384 effective fds each)
- Drone result dirs: `results/drone_0/`, `results/drone_1/`, …
- `cc recrawl-drone` is a hidden subcommand (not shown in help)
- Queen merges stats in real-time; no shared memory between processes

### Performance Hypothesis

4 drones × 500 workers each = 2000 effective workers.
Expected: highest raw throughput (4× single-process baseline = ~1600+ pages/s).
Downside: complexity, process startup overhead, IPC latency.

---

## Engine D: RawHTTP (bypass net/http, custom HTTP/1.1)

### Core Idea

`net/http` allocates header maps, buffers, goroutines per idle connection. For a
status-only recrawler, none of those features are needed. Engine D speaks raw HTTP/1.1
over `net.Conn` (TCP + manual TLS via `crypto/tls`) with minimal allocation.

### Architecture

```
Seeds → work chan
         ↓
Worker pool (N goroutines, N configurable)
  └─ rawDial(host, ip, port, tls bool) → net.Conn
  └─ writeHTTPRequest(conn, method, url, host)
  └─ readStatusLine(conn) → statusCode
  └─ conn.Close()  (no keep-alive in basic mode; opt-in reuse)
         ↓
Result chan → ResultWriter
```

### Key Details

- HTTP request: hand-built `[]byte` — no `fmt.Sprintf`, one `conn.Write` call
- Status parse: read until `\n`, extract code from bytes 9–12
- TLS: `tls.Client(conn, &tls.Config{InsecureSkipVerify: true, ServerName: host})`
  with `Handshake()` called explicitly once
- Optional keep-alive mode: connection pool per host (map[string][]net.Conn)
  with locking; connections returned after use
- Redirect follow: up to 5 hops, each creates a new rawDial
- Header parsing: only `Location:` (for redirects) and `Content-Type:` (if !statusOnly)

### Performance Hypothesis

Zero `net/http` allocation overhead → lower GC pressure → more CPU for networking.
Expected: 10–20% faster than standard net/http at same worker count, lower memory.
Best combined with keep-alive mode for maximum gain.

---

## Benchmark Harness

A `BenchmarkEngines` function in `pkg/recrawl_v3/bench_test.go` runs all 4 engines
against the same 10 K seed URL slice (from a shared fixture), measures:

- `Stats.AvgRPS`, `Stats.PeakRPS`, `Stats.P95LatMs`, `Stats.MemRSS`

Also a CLI flag `--engine [keepalive|epoll|swarm|rawhttp|auto]`:
- `auto`: runs 5 s warmup with each engine, picks highest `AvgRPS`

---

## Package Structure

```
pkg/recrawl_v3/
  engine.go          # Engine interface, Stats, Config, DNSCache, Writer interfaces
  types.go           # shared types (re-exports recrawler.SeedURL, Result, etc.)
  keepalive.go       # Engine A
  epoll.go           # Engine B
  swarm.go           # Engine C  (queen side)
  swarm_drone.go     # Engine C  (drone side, registered as cc recrawl-drone)
  rawhttp.go         # Engine D
  rawhttp_pool.go    # Engine D  (connection pool)
  bench_test.go      # benchmark harness
  engine_test.go     # unit tests for each engine (small fixture, ~100 URLs)
```

---

## CLI Integration

In `cli/cc.go`, `newCCRecrawl()` gains a new flag:

```go
cmd.Flags().StringVar(&engine, "engine", "keepalive",
    "Engine: keepalive|epoll|swarm|rawhttp|auto")
```

When `--engine` is set, `runCCRecrawl` creates the appropriate engine via
`recrawl_v3.New(engine)`, runs it instead of the existing `recrawler.Recrawler`.

Existing `pkg/recrawler` is **unchanged** — `--engine ""` (default) falls back to it.

---

## Verification Plan

```bash
# Unit tests (local, small fixture)
go test ./pkg/recrawl_v3/... -v

# Benchmark (local, 10K URLs)
go test ./pkg/recrawl_v3/... -bench=. -benchtime=30s

# Remote (full p:0 parquet, no limit)
make deploy-linux
make remote-search ARGS="cc recrawl --file p:0 --status-only --engine keepalive --workers 1500"
make remote-search ARGS="cc recrawl --file p:0 --status-only --engine epoll"
make remote-search ARGS="cc recrawl --file p:0 --status-only --engine swarm"
make remote-search ARGS="cc recrawl --file p:0 --status-only --engine rawhttp --workers 1500"
make remote-search ARGS="cc recrawl --file p:0 --status-only --engine auto"
```

Expected results on remote (doge-01):

| Engine | Est. pages/s | Notes |
|--------|-------------|-------|
| KeepAlive | 1000–1500 | TLS reuse benefit |
| Epoll | 600–900 | Low goroutine count limits parallelism |
| Swarm | 1500–2500 | 4× parallelism |
| RawHTTP | 900–1200 | Low overhead |
| v1/v2 baseline | 400–427 | No keep-alive, fd-limited before fix |

---

## Actual Benchmark Results (Remote, CC-MAIN-2026-08, p:0)

Conditions: `--file p:0 --status-only --limit 10000 --workers 1500`
Server: 4× AMD EPYC, 1.5 GB RAM, fd limit = 65536
Dataset: 10,000 URLs across 55 domains (all DNS pre-resolved in cache)

### Local Microbenchmark (`go test -bench=. -benchtime=30s`)

200 seeds × 10 fake domains, against in-process `httptest.Server`:

| Engine | Avg throughput |
|--------|---------------|
| KeepAlive | ~11,000 urls/s |
| Epoll | ~1,300 urls/s (16 goroutines = 4×CPU) |
| RawHTTP | ~100 urls/s (connection setup overhead on localhost) |

### Remote Benchmark (10K real URLs, status-only)

| Engine | Avg RPS | Peak RPS | Wall time | OK / Total | OK rate |
|--------|---------|----------|-----------|------------|---------|
| **RawHTTP** | **359** | **853** | **27s** | 5,438/10,000 | 54% |
| KeepAlive | 319 | 713 | 27s | 5,441/10,000 | 54% |
| Epoll | 14 | 26 | ~2min | — | — |
| v1/v2 baseline | ~83 avg | 256 peak | 120s (incomplete) | ~6,426/9,926 | 65% |

Notes:
- **RawHTTP wins** by a small margin in raw throughput (avg 359 vs 319 rps). Both complete 10K URLs in 27s.
- **Epoll** is severely bottlenecked by its 16-goroutine pool (4×nCPU). On a 4-core machine this limits parallelism to 16 concurrent requests, far below what the network can sustain.
- **v1/v2 baseline** hit the 120s timeout at 99.3% complete. It downloads full response bodies (95.4 MB total, ~15 KB/page) while v3 reads only the status line — not a direct apples-to-apples comparison.
- v1/v2's higher apparent OK rate (65% vs 54%) reflects the different URL sets tested at different times; server availability varies.
- Both RawHTTP and KeepAlive have 44–45% timeout rate on this dataset (many slow/unreachable servers).

### Key Findings

1. **RawHTTP is the fastest engine** for status-only recrawling on this server (853 rps peak, 359 rps avg).
2. **KeepAlive** is nearly as fast and simpler to reason about for debugging.
3. **Epoll** (fixed goroutine pool) needs a much higher goroutine count (e.g., 16× latency/workers) to be competitive; the 4×nCPU default is tuned for CPU-bound work, not I/O-bound networking.
4. **v3 vs v1/v2**: v3 processes 10K URLs in 27s; v1/v2 needs 120s+ (4-5× slower) — but v1/v2 downloads full bodies, adding download time.

### HN Dataset Benchmarks (100K URLs, status-only, keepalive engine)

Server: 4× AMD EPYC, 1.5 GB RAM, fd limit = 65536
Dataset: 100K seeds → 87K after DNS filtering (13K NXDOMAIN/DNS-timeout removed)
DNS cache: 153K live, 38K dead, 5.8K timeout; 25.7K unique domains, avg 3.4 URLs/domain

| Workers | Timeout | Domain Fail Threshold | Avg RPS | Peak RPS | Time | OK Rate | Notes |
|---------|---------|----------------------|---------|----------|------|---------|-------|
| 3000 | 5s | 3 rounds (default) | **1903** | 4004 | 44s | **68.5%** | Best balance |
| 3000 | 5s | domain-timeout=20s | 1807 | 3340 | 47s | 69.9% | Slightly more OK, slower |
| 3000 | 3s | 3 rounds | 2113 | 4157 | 40s | 44.8% | Faster but loses 3-5s responders |
| 3000 | 2s | 3 rounds | 2931 | **5942** | 28s | 21.7% | Peak >5000 but 76% timeout |
| 4000 | 5s | 3 rounds | 1641 | 3789 | 52s | 57.9% | Worse than 3000w (rate-limiting) |
| 5000 | 5s | 3 rounds | 1878 | **5791** | 45s | 47% | Peak >5000 but 49% timeout |
| 3000 | 3s | 1 round | 2601 | 4491 | 30s | 47% | Aggressive abandon, fewer skips |

#### Key Findings (HN Dataset)

1. **Sweet spot is 3000 workers at 5s timeout**: avg 1903 rps, 68.5% OK rate, 44s for 87K URLs.
2. **Peak 5000+** is achievable: `--workers 5000` gives 5791 peak, `--timeout 2000` gives 5942 peak, but both come with high timeout rates (47-76%).
3. **4000 workers is worse than 3000**: servers start rate-limiting (429) at higher concurrency, reducing OK rate from 68.5% to 57.9%.
4. **Domain-timeout=20s** helps cut tail domains (ones taking >20s) but adds some overhead; modest improvement.
5. **Fundamental limit**: the dataset has ~27.5% inherent HTTP timeout rate. With 3000 workers and 5s timeout, theoretical avg ceiling ≈ 3000/2.46s = ~1220 rps steady-state; the observed 1903 is higher due to burst throughput early in the run. True 5000+ avg rps is not achievable with this dataset without either a different URL set or much lower timeout duration (accepting more timeouts).

#### Performance Improvements vs v1/v2

| Engine | Time for 87K HN URLs | OK Rate |
|--------|---------------------|---------|
| v1/v2 (legacy) | ~6 min (est.) | ~65% |
| v3 keepalive (3000w) | **44s** | 68.5% |
| **Speedup** | **~8×** | same |

### Critical Bug Fixed During Benchmarking

**RawHTTP TLS hang bug**: `net.DialContext` does NOT preserve its context deadline on the returned `net.Conn`. Without explicitly calling `rawConn.SetDeadline(time.Now().Add(cfg.Timeout))` before `tls.Handshake()`, workers block indefinitely on slow TLS servers. Fix: set deadline on raw conn before wrapping with `tls.Client()`.

```go
if pu.Scheme == "https" {
    // Must set deadline before TLS handshake — DialContext does NOT persist deadline on conn.
    rawConn.SetDeadline(time.Now().Add(cfg.Timeout))
    tlsConn := tls.Client(rawConn, &tls.Config{...})
    if err := tlsConn.Handshake(); err != nil { ... }
}
```
