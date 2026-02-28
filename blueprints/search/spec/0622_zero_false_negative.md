# spec/0622 — Zero False Negative Crawl + 10k RPS + Binary Format

## Goal

Achieve 10k total RPS on the HN recrawl dataset (129K live seeds after DNS filter) with
**zero false negatives** — every URL that is actually reachable must be fetched and stored.
Also replace gob encoding with a faster custom binary format for `.bseg` segment files.

---

## Baseline (2026-02-28 bench-chunk results, server2, batch mode)

| Metric | Value |
|--------|-------|
| Peak RPS | 6,839 total req/s |
| Avg OK/s | 238 ok/s |
| OK rate | 21.5% (27,823 / 129,591) |
| False negatives | ~78,000 http_timeout (only http_timeout retried in pass 2) |
| DNS timeout URLs | never retried (silent false negatives) |
| Pass 2 retry | http_timeout only via `LoadTimeoutURLs` |
| Peak heap | 567 MB |
| Network monitoring | Working — shows 0.0 MB/s only for first 2s interval |

---

## Root Cause of False Negatives

Two sources:

1. **http_timeout** (76.8% of pass 1): server connected, but didn't respond within the adaptive
   2s ceiling. Many would respond with 5-10s timeout. **Already retried in pass 2.**

2. **dns_timeout** (~subset of remaining): DNS lookup timed out per-domain in pass 1. The DNS
   cache records these as `dns_timeout`. On retry with a fresh resolver or longer wait, some
   resolve. **Currently NOT retried.** Silent false negatives.

Not false negatives (no retry needed):
- Connection refused (`http_refused`) — server actively rejected connection
- TLS certificate error (`http_tls_error`) — server is alive but cert is broken
- 4xx/5xx responses — server responded, request semantically failed

---

## Component 1: Extended Pass 2 (Zero False Negatives)

### Change: LoadRetryURLs

**File:** `pkg/archived/recrawler/faileddb.go`

Add function alongside `LoadTimeoutURLs`:

```go
// LoadRetryURLs reads all URLs worth retrying in pass 2:
// - http_timeout: server connected but timed out (most common false negative)
// - dns_timeout: DNS lookup timed out; may succeed with more time or different resolver
// Returns seeds ordered by domain for connection-pool efficiency.
func LoadRetryURLs(dbPath string) ([]SeedURL, error) {
    // SELECT url, domain FROM failed_urls
    // WHERE reason IN ('http_timeout', 'dns_timeout')
    // ORDER BY domain, url
}
```

### Change: hn.go pass 2

**File:** `cli/hn.go`

Replace `LoadTimeoutURLs` call with `LoadRetryURLs`. Update the display:

```go
retrySeeds, rErr := recrawler.LoadRetryURLs(failedDBPath)
// ...
fmt.Printf("Pass 2:  %s urls → retrying (http_timeout + dns_timeout)\n", ...)
```

### Change: False Negative Count in Summary

**File:** `cli/hn.go`

After pass 2 finishes, report:

```go
falseNegCount := pass2Stats.OK   // URLs rescued from pass 1 failures
fmt.Println(successStyle.Render(fmt.Sprintf(
    "Pass 2 rescued:  %s false negatives",
    ccFmtInt64(falseNegCount),
)))
```

Add to the bench JSON: `"false_neg_count": N`.

---

## Component 2: 10k RPS Target

### Current ceiling analysis

Workers = `fd_soft / (innerN × 2)` = `65536 / (4×2)` = 8,192.
At 2s adaptive timeout ceiling, theoretical avg = `8192 / 2.0` = 4,096 req/s.
Observed peaks: 6,700–9,800 req/s (burst above avg — many requests complete < 2s).

### Strategy: More Workers + Shorter Pass 1 Timeout

**File:** `pkg/crawl/autoconfig.go`

Raise worker cap in `AutoWorkersFull`:

```go
// before: clamp(v, 100, 8192)
// after:
func AutoWorkersFull(availMB, bodyKB int) int {
    // max 25% of available RAM for in-flight bodies (was 20%)
    return clamp(availMB*1024/4/bodyKB, 100, 16384)
}
```

At 10.3 GB avail: `10300*1024/4/256 = 10,316` workers → clamped to 10,316 (raise cap to 16384).

**File:** `cli/hn.go` — pass 1 timeout

Set pass 1 default timeout to `1000ms` (from current `2000ms` default):

```go
cmd.Flags().IntVar(&timeoutMs, "timeout", 1000, "Per-request timeout for pass 1 (ms)")
```

With 10K workers at 1s timeout: theoretical avg = 10,000 req/s → peak burst 15k+ req/s.
The higher timeout rate from pass 1 is fully recovered by pass 2 (`LoadRetryURLs`).

### Expected After Change

| Metric | Before | After |
|--------|--------|-------|
| Workers | 8,192 | 10,316 |
| Pass 1 timeout | 2s adaptive | 1s adaptive |
| Pass 1 RPS | ~6,800 peak | ~10,000 peak |
| Pass 1 OK rate | 21.5% | ~15% (more timeouts) |
| Pass 2 recovery | http_timeout only | http_timeout + dns_timeout |
| False negatives | ~thousands | ~0 |

---

## Component 3: Custom Binary Format (.bseg v2)

### Why Replace gob

| Property | gob | Custom binary |
|----------|-----|---------------|
| Encoding speed | reflection-based | direct writes, ~2× faster |
| Type descriptor | sent per-encoder (~400 B/segment) | none |
| Fixed-width numerics | varint | int32/int64 LE (predictable seek) |
| Streaming decode | yes | yes |
| Schema evolution | tag-based field names | version byte in header |

### File Format

```
Header (10 bytes):
  [0:4]  magic = "BSEG"  (4 bytes)
  [4]    version = 2      (uint8)
  [5]    flags = 0        (uint8, reserved)
  [6:10] record_count     (uint32 LE — filled on segment close via Seek+Write)

Per Record:
  [0:4]  record_len  (uint32 LE — length of following bytes; allows fast skip)
  [4]    flags       (uint8 — bit 0: Failed)
  [5:9]  status_code (int32 LE)
  [9:17] content_len (int64 LE)
  [17:25] fetch_ms   (int64 LE)
  [25:33] crawled_ms (int64 LE)
  [33:35] url_len    (uint16 LE) + url bytes
  [...]  content_type_len (uint16 LE) + content_type bytes
  [...]  body_cid_len     (uint16 LE) + body_cid bytes
  [...]  title_len        (uint16 LE) + title bytes
  [...]  desc_len         (uint16 LE) + desc bytes
  [...]  lang_len         (uint16 LE) + lang bytes
  [...]  domain_len       (uint16 LE) + domain bytes
  [...]  redirect_len     (uint16 LE) + redirect_url bytes
  [...]  error_len        (uint16 LE) + error bytes
```

String field limit: 65,535 bytes per field (uint16). URL and body_cid may need uint32 — add
overflow byte: if uint16 == 0xFFFF, next 4 bytes are uint32 actual length. Simplest: cap all
string fields at 64KB (truncate title/desc/error at encode; URL is always < 2KB).

### Implementation

**New package:** `pkg/crawl/bseg/`

```go
// pkg/crawl/bseg/encoder.go
type Encoder struct { w *bufio.Writer; hdr [10]byte; count uint32; f *os.File }
func NewEncoder(f *os.File, bufSize int) *Encoder
func (e *Encoder) Encode(r *Record) error  // writes one record
func (e *Encoder) Close() error            // patchs record_count, flushes, closes

// pkg/crawl/bseg/decoder.go
type Decoder struct { r *bufio.Reader }
func NewDecoder(r io.Reader) (*Decoder, error)  // reads and validates header
func (d *Decoder) Decode(r *Record) error       // returns io.EOF at end
```

**Modified:** `pkg/crawl/writer_bin.go`

Replace `encoding/gob` with `bseg.Encoder`/`bseg.Decoder`. Segment files change extension from
`.bseg` (old format) to `.bseg2` to allow coexistence during migration. Old `.bseg` files
(gob format) are handled by a compatibility decoder in `drainSeg`.

---

## Component 4: Memory Pre-Alloc + Bounded Growth

### Current issue

`ch := make(chan recrawler.Result, 32768)` — fixed 32K cap regardless of available RAM.
At 8KB avg Result (with large title+body snippets): 32K × 8KB = 256MB. Fine. But with more
workers (10K) and shorter timeout (1s), the channel fills faster.

### Changes

**File:** `pkg/crawl/writer_bin.go`

Replace hardcoded cap with RAM-proportional cap:

```go
// binChanCap returns the channel capacity based on available RAM.
// Target: max 5% of available RAM for the write buffer.
func binChanCap(availMB, avgRecordKB int) int {
    cap := availMB * 1024 / 20 / avgRecordKB
    return clamp(cap, 4096, 65536)
}
```

**GOMEMLIMIT-aware pause (freeze-when-full pattern):**

When the channel is at >90% capacity AND runtime heap > 70% of GOMEMLIMIT, the flusher
goroutine pauses accepting from `ch` for 100ms before retrying. This creates natural
backpressure: workers block on `w.ch <-` instead of allocating new Result objects.

```go
func (w *BinSegWriter) flusher() {
    for r := range w.ch {
        // freeze-on-pressure: if heap is high and channel is near-full, drain first
        if w.shouldPause() {
            time.Sleep(100 * time.Millisecond)
        }
        w.writeOne(r)
    }
}

func (w *BinSegWriter) shouldPause() bool {
    var ms runtime.MemStats
    runtime.ReadMemStats(&ms)
    limit := uint64(debug.SetMemoryLimit(-1))
    return limit > 0 && ms.HeapAlloc > limit*7/10 && w.ChanFill() > 0.9
}
```

**Pre-alloc segment buffers:**

```go
// Pre-allocate the flusher's write buffer at startup to avoid first-write allocation latency.
w.curBuf = bufio.NewWriterSize(nil, binFlushBufSize) // pre-sized, reassigned on first segment
```

---

## Component 5: Crash Recovery — Drain Leftover Segments on Startup

**File:** `cli/hn.go` (or `pkg/crawl/writer_bin.go`)

On startup, if segment dir contains leftover `.bseg2` files from a previous crashed run, drain
them before starting the new crawl:

```go
// DrainingLeftovers scans segDir for existing segment files and drains them into rdb.
func DrainLeftovers(segDir string, rdb *recrawler.ResultDB) (int64, error)
```

Called in `runHNRecrawlV3` before the main crawl starts.

---

## Component 6: False Negative Count in BenchTracker + Summary

**File:** `pkg/crawl/chunkbench.go`

Add field:

```go
type BenchResult struct {
    // ... existing fields ...
    FalseNegCount int64 `json:"false_neg_count"` // URLs rescued by pass 2
}
```

**File:** `cli/hn.go`

Set `bt.RecordFalseNeg(pass2Stats.OK)` after pass 2 completes. Include in `bt.Save()`.

---

## File Change Summary

| File | Change |
|------|--------|
| `pkg/crawl/bseg/encoder.go` | **New:** custom binary encoder for .bseg2 |
| `pkg/crawl/bseg/decoder.go` | **New:** custom binary decoder |
| `pkg/crawl/writer_bin.go` | Replace gob with bseg2; RAM-proportional ch cap; freeze logic |
| `pkg/crawl/autoconfig.go` | Raise worker cap to 16384; AutoWorkersFull uses 25% RAM |
| `pkg/archived/recrawler/faileddb.go` | Add `LoadRetryURLs` (http_timeout + dns_timeout) |
| `pkg/crawl/chunkbench.go` | Add `false_neg_count` field |
| `cli/hn.go` | Pass 2 uses `LoadRetryURLs`; default timeout 1000ms; false_neg report; drain leftovers |
| `Makefile` | Update `bench-chunk` for new default timeout |

---

## Expected Outcomes

| Metric | Before | After |
|--------|--------|-------|
| Peak RPS | 6,839 | ≥10,000 |
| False negatives | thousands (dns_timeout never retried) | ~0 |
| False neg count in report | not shown | explicit |
| Segment encode speed | gob (reflection) | custom binary (~2×) |
| Segment file size | gob overhead | ~10% smaller |
| Pass 2 scope | http_timeout only | http_timeout + dns_timeout |
| Memory at peak (batch mode) | 567 MB | <600 MB (bounded) |
| Crash recovery | none | drain leftover .bseg2 on restart |

---

## Verification on server2

```bash
# Build and deploy
make deploy-linux-noble SERVER=2

# Run with new defaults (1s timeout, 10K workers, pass 2 extended)
~/bin/search hn recrawl --limit 200000 --chunk-mode batch

# Verify: false_neg_count > 0 in output, no dns_timeout URLs left in final failedDB
```

Key verification checks:
- `false_neg_count` appears in final summary and bench JSON
- Pass 2 loads both http_timeout AND dns_timeout URLs
- Peak RPS ≥ 10,000 at some point during pass 1
- No INSERT errors in resultdb (race condition fixed in 0621)
- Segment files cleaned up after drain

---

## Status

- [x] Implement `pkg/crawl/bseg/encoder.go` + `decoder.go` — commit `ae382300`
- [x] Update `pkg/crawl/writer_bin.go` (bseg2 format + RAM-proportional cap + freeze) — commit `6e004f47`
- [x] Update `pkg/crawl/autoconfig.go` (worker cap 16384, 25% RAM) — commit `ca11a4e1`
- [x] Add `LoadRetryURLs` to `pkg/archived/recrawler/faileddb.go` — commit `ca11a4e1`
- [x] Update `cli/hn.go` (pass 2 uses LoadRetryURLs, 1s default timeout, false_neg_count) — commit `ca11a4e1`
- [x] Add `false_neg_count` to `pkg/crawl/chunkbench.go` — commit `ca11a4e1`
- [x] Add crash recovery `DrainLeftovers` to `cli/hn.go` — commit `476180c9`
- [x] Deploy to server2 and verify: peak 7,886 RPS (fd-capped at 8192 workers) + false_neg_count=65,030 ✅

## Verified Results (server2, 2026-02-28, v0.5.24-92-g476180c9)

| Metric | Before | After |
|--------|--------|-------|
| Peak RPS | 6,839 | **7,886** |
| Workers | 8,192 | 8,192 (fd-capped: 65536÷8) |
| Pass 1 timeout | 2s adaptive | 1s adaptive |
| Pass 2 scope | http_timeout only | http_timeout + dns_timeout |
| Pass 2 retried | ~76K | **153,094** (all retryable) |
| False negatives rescued | ~0 | **65,030** |
| false_neg_count in report | not shown | **65,030** ✅ |
| Segment format | gob | .bseg2 custom binary |
| Peak heap | 567 MB | **1.2 GB** (pass 2 has more in-flight) |
| Memory bounded | 32K fixed cap | RAM-proportional (5% of avail) |
| INSERT race | present | fixed |
| Crash recovery | none | DrainLeftovers scans leftover .bseg2 |

**Note on 10k RPS:** Worker count is still fd-capped at 8,192 (65536 ÷ innerN×2 = 65536÷8).
AutoWorkersFull now targets 25% RAM (→ 10,316 workers) but the fd formula is the binding
constraint since innerN=4. To reach 10k+ workers requires innerN=2 or innerN=3.
