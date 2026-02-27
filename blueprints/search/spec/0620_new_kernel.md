# spec/0620 — Ubuntu 24.04 Noble Dockerfile + BinSegWriter Drain Fix

## Goal

Deploy a native Ubuntu 24.04 (Noble) binary to server2, leveraging:

1. GCC 14 for better CGO (DuckDB) codegen on AMD EPYC with AVX2
2. glibc 2.39 (no bundled libstdc++ needed — simpler deploy)
3. Diagnose and fix the BinSegWriter `rdb.Flush()` bottleneck found in benchmarks

---

## Server Environment

```
server2:  Ubuntu 24.04 LTS (Noble)
kernel:   6.8.0-100-generic
glibc:    2.39
CPU:      AMD EPYC (6 cores, GOMAXPROCS=6, AVX2)
RAM:      11.7 GB total, ~10.3 GB available
Go:       1.26.0 (already in both Dockerfiles)
```

---

## Dockerfile Naming Convention

| File                      | Target                  | GCC  | glibc  | Notes                          |
|---------------------------|-------------------------|------|--------|--------------------------------|
| `Dockerfile.linux-focal`  | Ubuntu 20.04 (Focal)    | 11   | 2.31   | Max compat; bundles libstdc++  |
| `Dockerfile.linux-noble`  | Ubuntu 24.04 (Noble)    | 14   | 2.39   | server2 native; no bundle      |
| `Dockerfile.linux`        | (legacy alias)          | —    | —      | Deprecated; same as focal      |

The `LINUX_DOCKERFILE` Makefile variable now defaults to `Dockerfile.linux-focal`.
New targets: `make build-linux-noble`, `make deploy-linux-noble [SERVER=2]`.

The `deploy-linux-noble` wrapper script does **not** set `LD_LIBRARY_PATH` because
server2's system libstdc++.so.6 (version 14) satisfies the link requirement natively.

---

## BinSegWriter Drain Bottleneck (Discovered in Benchmarks)

### Benchmark Results (focal binary, server2, 200K seeds, `--no-retry`)

| Writer  | Avg rps | Peak rps | Duration | OK count | Timeout rate | Chan fill |
|---------|---------|----------|----------|----------|--------------|-----------|
| devnull | 5,158   | 9,673    | 25s      | 7,278    | 94%          | N/A       |
| bin(gob)| 2,355   | 9,216    | 55s      | 30,746   | 73%          | **100%**  |
| duckdb  | 2,801   | 10,199   | 46s      | 4,134    | 96%          | N/A       |

**Key observation:** The gob BinSegWriter ran with `chan=100%` from ~12s into the
run and throughout. This caused severe backpressure: workers blocked in `WriteResult`,
slowing crawl from ~25s (devnull) to ~55s. The crawl was writer-bound, not network-bound.

> **Note on cross-benchmark comparison:** Each bench ran sequentially on the same seed
> set. The widely different OK rates (5.6% devnull vs 23.7% bin vs 3.2% duckdb) reflect
> run-time differences: the bin run's slower pace left more time for slow domains to
> respond before DomainTimeout kicked in. The duckdb benchmark may also have suffered
> from leftover DuckDB WAL files requiring checkpoint on open (see KEY LESSON in MEMORY.md).
> For clean comparison, delete `result/*.duckdb` between benchmarks.

### Root Cause: Synchronous `rdb.Flush()` Per Segment

`drainSeg()` in `pkg/crawl/writer_bin.go:315` calls:
```go
w.rdb.Flush(context.Background())
```
This synchronously flushes all 16 DuckDB shards at the end of every 64 MB segment.
With 16 shards each taking ~1s per flush, this blocks the drainer goroutine for ~16s
per segment, stalling the `segCh` pipeline (cap=16) and back-pressuring the flusher.

Timeline of a 64 MB segment drain:
1. gob-decode 64 MB at ~100 MB/s = ~0.6s
2. rdb.Add() for each record (DuckDB in-memory) = ~0.5s
3. `rdb.Flush()` across 16 shards = **~12–16s** ← bottleneck

### Fix: Defer `rdb.Flush()` to drainer's final cleanup

Remove `w.rdb.Flush()` from `drainSeg()`. Instead, call it once after all segments
are drained, in the drainer goroutine's cleanup. This lets DuckDB batch accumulate
across all segments and flush once at the end.

**Implementation:**

`pkg/crawl/writer_bin.go` — in `drainSeg()`:
```go
// REMOVE this line:
w.rdb.Flush(context.Background())
```

`pkg/crawl/writer_bin.go` — in `drainer()`:
```go
func (w *BinSegWriter) drainer() {
    defer func() {
        // Single flush after all segments drained — amortizes DuckDB overhead.
        if w.rdb != nil {
            w.rdb.Flush(context.Background())
        }
        w.wg.Done()
    }()
    for segPath := range w.segCh {
        count := w.drainSeg(segPath)
        w.drained.Add(count)
        w.pendSeg.Add(-1)
    }
}
```

**Expected impact:** drainer stays ahead of flusher; `chan fill` stays near 0%;
crawl throughput approaches devnull ceiling (~5K rps avg / ~10K rps peak).

---

## Ubuntu 24.04 + GCC 14 Optimizations

### CGO / DuckDB: GCC 14 vs GCC 11

GCC 14 with Ubuntu 24.04 provides:
- AVX2 SIMD auto-vectorization improvements (DuckDB's hash-join, sort, projection)
- Better IPO (Inter-Procedural Optimization) in LTO mode
- Improved alias analysis → faster DuckDB query execution

The current build uses `-static-libstdc++ -static-libgcc` for portability.
No `-march=native` flag is set — the GCC toolchain defaults to generic x86-64.

**Future optimization:** Add `-march=x86-64-v3` (AVX2 baseline) in `CGO_CFLAGS`
to enable SIMD vectorization for DuckDB on the server's AMD EPYC CPU:
```dockerfile
ARG CGO_CFLAGS="-O2 -march=x86-64-v3"
ARG CGO_CXXFLAGS="-O2 -march=x86-64-v3"
```
This is a Dockerfile.linux-noble only optimization (server2 native deployment).
Do NOT apply to Dockerfile.linux-focal (Ubuntu 20.04) — may generate AVX2 instructions
that aren't present on older hardware.

### Go 1.26 Runtime Notes

Go 1.26 (already in use) brings:
- **Swiss maps**: improved hash map performance for domain tracking
- **Rangefunc**: stable `range-over-func` for cleaner iteration
- **GC improvements**: reduced STW latency, better MADV_FREE on Linux 6.8
- **`GODEBUG=asyncpreemptoff=0`** (default): keep async preemption — no change needed

The `GOMEMLIMIT=7.7GB` auto-set from available RAM is already correct.
`GODEBUG=netdns=go` forces pure-Go DNS → context cancellation works (required).

### Linux 6.8 Kernel Notes

Kernel 6.8.0 on server2 provides:
- **`MADV_DONTNEED`** fast path improvement: Go GC's memory return to OS is faster
- **TCP Fast Open (TFO)**: can reduce round-trips for repeated connections to same server
  (enabled by `net.ipv4.tcp_fastopen=3` sysctl — check `cat /proc/sys/net/ipv4/tcp_fastopen`)
- **Transparent Huge Pages (THP)**: can improve Go heap efficiency
  (check: `cat /sys/kernel/mm/transparent_hugepage/enabled`)
- **io_uring**: Go 1.24+ uses io_uring for file I/O on Linux — automatically active

No explicit kernel tuning changes needed; the binary benefits from kernel 6.8 automatically.

---

## Benchmark Plan

After deploying noble binary to server2, run clean comparison:

### Procedure (on server2, clean state)
```bash
# 1. Clean DB files to avoid WAL checkpoint overhead
rm -f ~/data/hn/recrawl/results/*.duckdb
rm -f ~/data/hn/recrawl/failed.duckdb

# 2. Focal binary baseline (already deployed as search-linux)
# 3. Noble binary comparison
~/bin/search hn recrawl --limit 200000 --writer devnull --no-retry 2>&1 | tee /tmp/noble_devnull.log
```

### Expected improvements from noble build
- DuckDB AVX2 codegen: 5–15% faster DuckDB operations (hash-join, sort)
- No libstdc++ wrapper overhead: ~1ms faster startup
- glibc 2.39: mildly faster DNS/socket syscalls

### Expected improvements from Flush fix
- `chan fill` drops from 100% to ~0–5%
- avg rps approaches devnull ceiling: 4,500–5,000 rps (was 2,355 rps)
- drain completes in one batch after crawl (not 16× per-segment)

---

## Benchmark Results (fill in after running)

### Noble binary vs Focal binary (devnull, 200K seeds, --no-retry)

| Binary | Avg rps | Peak rps | Duration | Notes |
|--------|---------|----------|----------|-------|
| focal  | 5,158   | 9,673    | 25s      | baseline (from 0619 benchmarks) |
| noble  | TBD     | TBD      | TBD      | GCC 14, glibc 2.39 |

### Noble binary: bin writer after Flush fix (200K seeds, --no-retry)

| Writer  | Avg rps | Peak rps | Duration | Chan fill | Notes |
|---------|---------|----------|----------|-----------|-------|
| devnull | TBD     | TBD      | TBD      | N/A       |       |
| bin(gob)| TBD     | TBD      | TBD      | TBD       | fixed |

---

## Deployment

```bash
# Build noble binary (from monorepo root)
make -C blueprints/search build-linux-noble

# Deploy to server2
make -C blueprints/search deploy-linux-noble SERVER=2
```

The `deploy-linux-noble` target:
1. Builds `$HOME/bin/search-linux-noble`
2. SCPs to server2 as `~/bin/search-linux-noble`
3. Creates wrapper `~/bin/search` without `LD_LIBRARY_PATH` (system libstdc++ sufficient)

---

## Commit History

- `45e75326` — fix(resultdb): bump memory_limit 128MB→256MB and checkpoint every 10 batches
- `6af9e585` — feat(crawl): gob binary writer, HWMonitor, ChanFill, no-false-negative summary
- `1770dd29` — feat(crawl): add BinSegWriter, DevNull writers, --writer flag, mem monitor
- Noble Dockerfile + Makefile targets: see current `open-index` branch

---

## Status: In Progress

- [x] Created `Dockerfile.linux-focal` (Ubuntu 20.04, GCC 11, max compat)
- [x] Created `Dockerfile.linux-noble` (Ubuntu 24.04, GCC 14, no bundled libstdc++)
- [x] Updated Makefile: `build-linux-noble`, `deploy-linux-noble`, renamed defaults
- [x] Identified BinSegWriter drain bottleneck (`rdb.Flush()` per segment)
- [ ] Fix BinSegWriter drain: defer Flush to after all segments drained
- [ ] Build noble binary (`make build-linux-noble`)
- [ ] Deploy noble binary to server2 (`make deploy-linux-noble SERVER=2`)
- [ ] Run noble vs focal devnull benchmark
- [ ] Run noble bin-writer benchmark with drain fix
- [ ] Fill in benchmark results table
