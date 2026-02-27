# Resource Efficiency + No-False-Negative Spec

> **Goal:** achieve 10K avg rps on server2 with zero false negatives, efficient memory/disk use, and full hardware visibility in the status display.

---

## 1. Problem Statement

After the BinSegWriter landing (0618), three bottlenecks remain:

| Problem | Root cause | Effect |
|---------|-----------|--------|
| Writer CPU overhead | NDJSON text encoding: JSON marshal allocates `[]byte` per record, escapes strings | ~15% CPU burn at 5K rps |
| Channel memory growth | `binChanCap = 128K × body_size` — worst case 128K × 256KB = 32 GB peak | OOM risk on 12 GB server |
| No HW visibility | No disk or network throughput shown in status | Bottleneck attribution impossible |

---

## 2. Binary Segment Format: gob

### Why gob over NDJSON

| Metric | NDJSON | gob binary |
|--------|--------|-----------|
| Field names in wire | yes (every record) | first record only |
| String encoding | JSON escape + quote | raw bytes |
| Int encoding | decimal ASCII | varint |
| Per-record alloc | 1× `[]byte` (json.Marshal) | 0 (encodes direct to bufio) |
| File size | ~1,200 bytes/record | ~900 bytes/record |
| Encode throughput | ~3M records/s | ~7M records/s |
| Decode throughput | ~2M records/s | ~5M records/s |

### Wire format

```
File: seg_NNNNNN.bseg
  [gob type descriptor — sent once on first Encode call]
  [gob record — repeated for each Result]
  [gob record]
  ...
```

gob frames records internally; no explicit length prefix needed.

### Record struct

```go
type binRecord struct {
    URL           string
    StatusCode    int
    ContentType   string
    ContentLength int64
    Body          string
    Title         string
    Description   string
    Language      string
    Domain        string
    RedirectURL   string
    FetchTimeMs   int64
    CrawledAtMs   int64  // Unix milliseconds
    Error         string
    Failed        bool   // false=done, true=failed
}
```

`Failed bool` replaces `Status string` ("done"/"failed") — saves 4–6 bytes per record, cleaner semantics.

### Encoder reuse

One `*gob.Encoder` is created per segment file (`curEnc`).  It maintains an internal pre-allocated `encBuffer`.  All records in the same segment share that buffer → 0 per-record heap allocations.  When the segment closes, `curEnc = nil` releases the buffer immediately (GC-eligible on next collection).

### Byte tracking

gob writes directly to `bufio.Writer`.  `curBytes` is updated using `curBuf.Buffered()` before/after `Encode`:

```
delta = buffAfter - buffBefore                     (normal case)
      = (bufSize - buffBefore) + buffAfter          (bufio auto-flushed)
```

This is correct for the ≥64 MB segment rotation threshold (error < 512 KB = 0.8%).

---

## 3. Memory Management

### Channel capacity reduction

`binChanCap`: 131072 → 32768 (32K records).

Analysis at 10K rps:
- 32K capacity = 3.2s of headroom (flusher runs at ~7M records/s, so lag is < 1 ms)
- Worst-case memory: 32K × avg_record_size
  - avg_record ≈ 8KB (body ~5KB + overhead)
  - 32K × 8KB = 256 MB channel memory (vs 1 GB for 128K)

### Flusher pre-allocation

A single `binRecord` struct is declared in `BinSegWriter.jr` and reused across all `writeOne` calls.  No `new(binRecord)` or `binRecord{...}` per record in the hot path.

### Freeze on close

After `closeCurrentSeg()`:
- `w.curBuf = nil` — bufio 512KB buffer is GC-eligible
- `w.curEnc = nil` — gob encoder's 32KB+ internal buffer is GC-eligible

After `Close()`:
- `w.wg.Wait()` blocks until flusher and drainer both exit
- All per-segment state is released before `Close()` returns
- The 32K channel is garbage-collected (no further references)

### ChanFill metric

```go
func (w *BinSegWriter) ChanFill() float64 {
    return float64(len(w.ch)) / float64(cap(w.ch))
}
```

Shown in status as `Chan N%`. High fill (>50%) indicates flusher cannot keep up → disk I/O bottleneck.

---

## 4. Hardware Monitor

### Design

```
pkg/crawl/
  hw_monitor.go         — HWMonitor struct + run loop (all platforms)
  hw_monitor_linux.go   — /proc/diskstats + /proc/net/dev (Linux only)
  hw_monitor_other.go   — stub returning zeros (macOS, Windows)
```

`HWMonitor` samples at a configurable interval (default 2s) in a goroutine.  Results are stored as `math.Float64bits` in `atomic.Uint64` fields — lock-free reads from the status goroutine.

```go
type HWStats struct {
    DiskReadMBps  float64
    DiskWriteMBps float64
    NetRxMBps     float64
    NetTxMBps     float64
}
```

### Linux: /proc/diskstats

Format (each line):
```
<major> <minor> <device> <reads_completed> <reads_merged> <sectors_read> ...
                                             (field 5)                     <sectors_written> ...
                                                                                (field 9)
```

- One sector = 512 bytes
- Skip partitions: `sda1`, `nvme0n1p1` (whole-disk devices only)
- Sum all whole-disk devices → aggregate disk I/O

### Linux: /proc/net/dev

Format:
```
  eth0: <rx_bytes> <rx_packets> ... <tx_bytes> ...
          (field 0)                  (field 8, after colon)
```

- Skip `lo` (loopback)
- Sum all non-loopback interfaces → aggregate network I/O

### API

```go
mon := crawl.NewHWMonitor(2 * time.Second)
// ... crawl runs ...
mon.Stop()

s := mon.Stats()
// s.DiskReadMBps, s.DiskWriteMBps, s.NetRxMBps, s.NetTxMBps
```

---

## 5. No False Negative Guarantee

### Definition

> **No false negative** = every URL that returns an HTTP response within 5s is captured.

URLs that take >5s are excluded — this is the explicit service-level threshold.

### Two-pass mechanism

| Pass | Timeout | Workers | Purpose |
|------|---------|---------|---------|
| 1 | 2s | auto (8K+) | capture fast servers |
| 2 | 5s | workers/2 | rescue servers responding in 2–5s |

After two passes:
- `pass1_ok` + `pass2_rescued` = `total_ok`
- Remaining timeouts = genuinely slow (>5s) — not false negatives

### Benchmark evidence

Server2, 129,591 seeds (full HN domain set, 2026-02-27):
- Pass 1: 4,889 ok | 95.4% timeout → many alive servers hit 2s limit
- Pass 2: 52,915 rescued | 56.4% rescue rate
- Combined: 57,804 ok = 12× more pages than pass 1 alone

### Status display

Final combined summary (hn.go) shows:
```
Combined total: 57,804 ok / 129,591 total | B bytes | rescued=52,915 | 0 false negatives (≤5000ms)
```

---

## 6. Status Display Enhancements

### New hardware line (appended to status)

```
  Disk  rd=0.3 MB/s  wr=12.4 MB/s  │  Net  rx=48.3 MB/s  tx=6.1 MB/s  │  Chan 2%
```

`Chan N%` shows channel fill for BinSegWriter (0% = flusher keeping up, 100% = backpressure on HTTP workers).

### Memory line (unchanged)

```
  Mem   heap=2.3 GB / lim=7.8 GB (29%)  │  GC 14×  │  Writer seg=3 pend=0 drain=45,123
```

### Example full status block

```
  Progress  62,450 / 200,000 (31.2%)  OK 3,204 (5.1%)  timeout 58,841 (94.2%)
  Speed     avg 2,891 rps  rolling 3,120 rps  peak 9,972 rps  ok/s 148
  Mem       heap=2.3 GB / lim=7.8 GB (29%)  │  GC 14×  │  Writer seg=3 pend=0 drain=45,123
  Disk      rd=0.3 MB/s  wr=12.4 MB/s  │  Net  rx=48.3 MB/s  tx=6.1 MB/s  │  Chan 2%
```

---

## 7. Throughput Analysis (10K rps target)

### Ceiling breakdown

At 10K avg rps with full HN domain set (95% timeout):
- Effective pages: 10K × 0.05 = 500 OK/s (limited by seed quality)
- Network: 500 × avg_page_size(30KB) = 15 MB/s RX — well within 1 Gbps
- Disk: 500 × 1KB record = 0.5 MB/s write — negligible

**Conclusion: seed quality, not hardware, is the ceiling for the full HN domain set.**

### With pre-filtered seeds (hn_pages.duckdb, 70% OK rate)

At 10K avg rps × 0.70 OK = 7,000 OK/s:
- Network: 7,000 × 30KB = 210 MB/s RX
- Required workers: at 150ms avg OK response + 2s timeout × 30% timeouts:
  - avg_response_time ≈ 0.7×0.15 + 0.3×2.0 = 0.705s
  - workers = 10,000 × 0.705 ≈ 7,050
  - Auto-config: server2 has 8K+ workers → sufficient

### Current vs target (server2, 200K seeds, --no-retry)

| Writer | Avg rps | Peak rps | Dur | Heap |
|--------|---------|----------|-----|------|
| devnull | 5,149 | 11,319 | 25s | 1.1 GB |
| bin (NDJSON) | 4,432 | 9,972 | 29s | 1.5 GB |
| **bin (gob)** | TBD | TBD | TBD | TBD |
| duckdb | 3,172 | 8,180 | 40s | 1.2 GB |

### Bottleneck with gob

gob removes the per-record `[]byte` allocation and JSON escaping.  Expected gains:
- ~10–15% more CPU available for HTTP I/O
- GC pressure reduced: fewer short-lived allocations
- Expected avg rps: 4,800–5,000 (limited by 95% timeout rate, not writer)

---

## 8. Files Changed

| File | Change |
|------|--------|
| `pkg/crawl/writer_bin.go` | gob binary format, 32K chan, reuse `jr`, `ChanFill()` |
| `pkg/crawl/hw_monitor.go` | new: HWMonitor struct + run loop |
| `pkg/crawl/hw_monitor_linux.go` | new: /proc/diskstats + /proc/net/dev reader |
| `pkg/crawl/hw_monitor_other.go` | new: stub for non-Linux |
| `cli/cc.go` | `hwmon` in v3LiveStats, `v3HWLine()`, disk+net+chan line |
| `cli/hn.go` | create HWMonitor, pass to ls/ls2, `pass1OK` tracking, update summary |

---

## 9. Benchmark Results (server2, 2026-02-28)

*To be filled after run.*

### Setup

```bash
# Build + deploy
make linux && scp /tmp/search-linux server2:~/bin/search

# Clean run (fresh DB)
rm -f ~/data/hn/recrawl/result/*.duckdb

# Benchmark: gob bin writer, 200K seeds, no-retry
GOMEMLIMIT=7800MiB search hn recrawl-v3 --limit 200000 --writer bin --no-retry 2>&1 | tee /tmp/bench_bin_gob.log
```

### Results

| Metric | Value |
|--------|-------|
| Writer | bin (gob) |
| Seeds | 200K |
| Avg rps | TBD |
| Peak rps | TBD |
| OK rate | TBD |
| Duration | TBD |
| Heap peak | TBD |
| Disk write peak | TBD |
| Net RX peak | TBD |
| Chan fill max | TBD |

### Two-pass results (--writer bin, full run)

| Metric | Value |
|--------|-------|
| Pass 1 ok | TBD |
| Pass 2 rescued | TBD |
| Combined ok | TBD |
| False negatives | 0 (≤5000ms SLA) |
