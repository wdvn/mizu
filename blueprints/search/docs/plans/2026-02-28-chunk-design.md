# Chunked Crawl + Body CAS Store — Design Doc

**Goal:** Reduce peak heap from 7.1 GB → <2 GB during full HN crawl (1.27M seeds, 414K live
domains), add content-addressable body storage with DuckDB reference, and compare three
chunking strategies to pick the fastest default.

**Architecture:** Three independently selectable chunk modes plus a shared body store. All
modes use the same DuckDB result schema, same BinSegWriter, same keepalive engine — only
the outer orchestration loop changes.

**Tech Stack:** Go 1.26, DuckDB (8-shard), gob (.bseg), SHA-256 (stdlib), gzip (stdlib),
net/http/pprof

---

## Root Cause of 7.1 GB Heap

Two dominant consumers (confirmed via code audit):

1. **In-flight response bodies (2 GB):** 8,192 workers × 256 KB body cap = 2 GB of `Result.Body`
   strings held in goroutine stacks while blocked on full BinSegWriter channel (`chan=100%`).
   The channel fills because gob drainer is slow → backpressure propagates to workers.

2. **DuckDB CGO buffer pools (2 GB):** 8 shards × `SET memory_limit='256MB'` = 2 GB of CGO
   heap invisible to Go's GC. Never released between batches.

3. **Seeds slice kept entire run (190 MB):** `LoadSeedURLs` reads all 1.27M seeds into a
   `[]SeedURL` slice before crawl starts; slice lives until `engine.Run` returns.

4. **Other (goroutine stacks, Go metadata, GC fragmentation): ~1 GB.**

---

## Component 1: Body Content-Addressable Store

**Package:** `pkg/crawl/bodystore/`

### Design (git-objects / OCI-style)

- **Hash algorithm:** SHA-256 (`crypto/sha256`, stdlib). Self-describing ref: `"sha256:{hex64}"`.
  Future-proof: if algorithm changes, existing refs remain valid (algorithm prefix embedded).
- **File layout:**
  ```
  {bodyDir}/
    {sha256[0:2]}/
      {sha256[2:4]}/
        {sha256[4:]}.gz        # gzip-compressed raw body bytes
  ```
  e.g. `bodies/3a/f7/12c4e09b...60chars.gz`

  Maximum 65,536 second-level dirs (256²). Each dir ~1,000 files at 10M total bodies → well
  within ext4/btrfs inode limits.

- **DuckDB column:** `body_cid TEXT` added to `results` table.
  - `""` = no body (non-200, non-HTML, or body not stored)
  - `"sha256:3af712..."` = body exists at derived path
  - Identical bodies across different URLs share one file (true CAS deduplication).

### API

```go
// pkg/crawl/bodystore/store.go
type Store struct { dir string }

func Open(dir string) (*Store, error)
func (s *Store) Put(body []byte) (cid string, err error)   // write-once; noop if exists
func (s *Store) Get(cid string) ([]byte, error)            // decompress and return
func (s *Store) Has(cid string) bool
func (s *Store) Path(cid string) string                    // derive fs path from cid
```

### Changes to resultdb.go

- Add `body_cid TEXT` column to `CREATE TABLE` DDL.
- `writeBatchValues`: store `r.BodyCID` (new field on `Result`) instead of `""`.
- `Result` struct: add `BodyCID string` field.
- `keepalive.go`: after extracting body, call `bodyStore.Put(bodyBytes)` → set `result.BodyCID`.

### Changes to BinSegWriter / binRecord

- Add `BodyCID string` field to `binRecord`.
- `writeOne`: populate `jr.BodyCID = r.BodyCID`.
- `toResult`: copy `BodyCID` field back.
- Body string itself (`jr.Body`) is removed from `binRecord` — body bytes live only in the CAS
  store; gob segments only carry the hash reference. This also reduces gob segment size
  significantly (~10× smaller per record).

---

## Component 2: Seed Cursor (shared by all modes)

**File:** `pkg/crawl/seedcursor.go`

Replaces bulk `LoadSeedURLs` with a streaming page cursor over the DuckDB seed table.

```go
type SeedCursor struct { ... }
func NewSeedCursor(dbPath string, pageSize int) (*SeedCursor, error)
func (c *SeedCursor) Next(ctx context.Context) ([]recrawler.SeedURL, error) // next page
func (c *SeedCursor) Close() error
```

- Page size: 10,000 rows (default).
- Uses `SELECT … LIMIT ? OFFSET ?` with a read-only connection.
- Caller never holds more than one page in memory at a time.

---

## Component 3: Three Chunk Modes

### Mode A — `stream` (adaptive backpressure)

**Change:** Replace `seeds` slice parameter with a `SeedCursor`. Workers and channel auto-sized:

```go
// autoconfig.go additions
func AutoBinChanCap(availMB, bodyKB int) int {
    // max 5% of available RAM for channel buffer
    cap := availMB * 1024 * 1024 / 20 / (bodyKB * 1024)
    return clamp(cap, 256, 32768)
}
func AutoWorkersFull(availMB, bodyKB int) int {
    // max 20% of available RAM for in-flight bodies
    return clamp(availMB*1024/5/bodyKB, 100, 8192)
}
```

DuckDB `memory_limit` per shard reduced: `availMB * 0.15 / shards` (was fixed 256 MB).

**Memory model:** `workers × bodyKB × 2 + chanCap × bodyKB + DuckDB` ≤ `GOMEMLIMIT × 0.85`.

**Implementation impact:** Low. Touches `autoconfig.go`, `keepalive.go` (pass cursor), `cli/hn.go`.

### Mode B — `batch` (domain-batch loop, default)

**Change:** The hn recrawl outer loop splits live domains into chunks of `batchDomains` and
runs keepalive engine + drain per chunk:

```
for batch in chunk(liveDomains, batchDomains):
    eng.Run(ctx, batch)
    waitDrainComplete()
    debug.FreeOSMemory()    // return CGO pages to OS
    updateProgress()
```

**Batch sizing (auto-tuned):**
```go
func AutoBatchDomains(availMB, avgURLsPerDomain, bodyKB int) int {
    // budget: 30% of available RAM for one batch of in-flight bodies
    budget := availMB * 1024 / 3  // KB
    urls := budget / bodyKB
    return max(urls / avgURLsPerDomain, 500)
}
```

At 10.5 GB available, bodyKB=256, avgURLs=3: `batch ≈ 4,300 domains` per chunk.

**DuckDB handling:** Between batches, call `rdb.ReopenShards()` to force-close and reopen each
DuckDB connection — this releases all CGO buffer pool memory (DuckDB frees on close).

**Implementation impact:** Medium. New `ReopenShards()` on ResultDB; batch-split loop in `cli/hn.go`.

### Mode C — `pipeline` (staged goroutine pipeline)

Three goroutine stages with explicit bounded channels:

```
SeedCursor → [seedPageCh cap=2] → DomainBatcher → [batchCh cap=1] →
CrawlStage (keepalive) → [segPathCh cap=4] → DrainStage → DuckDB + BodyStore
```

Each stage is bounded: when downstream is full, the upstream stage blocks and stops
fetching/crawling. Memory at each stage is bounded independently:

- `seedPageCh cap=2`: at most 2 pages × 10K seeds × 150 B = 3 MB
- `batchCh cap=1`: one domain batch in flight at a time
- `segPathCh cap=4`: at most 4 completed segments queued = 4 × 64 MB = 256 MB
- CrawlStage workers: `AutoWorkersFull(availMB × 0.40, bodyKB)` — only 40% of RAM budgeted
  (rest shared with drain stage running concurrently)

**Key difference from B:** Drain runs concurrently with the next batch's crawl. Throughput
may be higher (overlapping I/O) but memory accounting is more complex.

**Implementation impact:** High. New `PipelineCrawler` type in `pkg/crawl/pipeline.go`.

---

## Component 4: DuckDB Shard Reopen

**File:** `pkg/archived/recrawler/resultdb.go`

```go
func (rdb *ResultDB) ReopenShards() error
```

For each shard:
1. Flush pending batch
2. `s.db.Close()` — releases DuckDB's CGO buffer pool immediately
3. `s.db, err = sql.Open("duckdb", path)` — reopen fresh with same settings
4. Re-apply `SET memory_limit`, `SET threads`, `SET checkpoint_threshold`

Called by Mode B between domain batches.

---

## Component 5: pprof Integration

**File:** `cli/hn.go`

```go
if pprofPort > 0 {
    go func() { http.ListenAndServe(fmt.Sprintf(":%d", pprofPort), nil) }()
}
```

Auto-snapshot at peak: when `runtime.ReadMemStats().HeapAlloc > GOMEMLIMIT × 0.80`, write
`heap.pprof` to data dir (once, no repeat).

---

## Component 6: Benchmark Comparison

**File:** `pkg/crawl/chunkbench.go`

Each mode writes `{dataDir}/bench_chunk_{mode}.json` at completion:
```json
{
  "mode": "batch",
  "avg_rps": 2547,
  "peak_rps": 9363,
  "peak_heap_mb": 1842,
  "gc_cycles": 48,
  "duration_s": 50,
  "ok_count": 35031,
  "body_store_writes": 4821,
  "batch_count": 92
}
```

**Makefile target:**
```makefile
bench-chunk: ## Run all 3 chunk modes and compare (200K seeds, no-retry)
    @for mode in stream batch pipeline; do \
        rm -f data/hn/recrawl/results/*.duckdb; \
        $(BINARY) hn recrawl --limit 200000 --no-retry --chunk-mode $$mode; \
    done
    @$(BINARY) hn bench-chunk-compare
```

---

## Schema Change: results table

```sql
ALTER TABLE results ADD COLUMN body_cid TEXT DEFAULT '';
```

Applied automatically in `ResultDB.Open()` via `IF NOT EXISTS` column add.

---

## File Change Summary

| File | Change |
|------|--------|
| `pkg/crawl/bodystore/store.go` | New: CAS body store |
| `pkg/crawl/seedcursor.go` | New: streaming seed cursor |
| `pkg/crawl/pipeline.go` | New: Mode C pipeline |
| `pkg/crawl/chunkbench.go` | New: benchmark JSON writer |
| `pkg/crawl/autoconfig.go` | Add `AutoBinChanCap`, `AutoWorkersFull`, `AutoBatchDomains` |
| `pkg/crawl/keepalive.go` | Accept `SeedCursor` or `[]SeedURL`; pass `bodyStore` |
| `pkg/crawl/writer_bin.go` | Remove `Body` from binRecord; add `BodyCID` |
| `pkg/archived/recrawler/resultdb.go` | Add `body_cid` column; `ReopenShards()`; store `BodyCID` |
| `pkg/archived/recrawler/types.go` | Add `BodyCID string` to `Result` |
| `cli/hn.go` | `--chunk-mode`, `--chunk-size`, `--pprof-port`; batch loop; pipeline wiring |
| `Makefile` | `bench-chunk` target |
| `spec/0621_chunk.md` | Full spec (see below) |

---

## Default After Benchmarking

After running `make bench-chunk`, the fastest mode (expected: **B** or **C**) becomes the
default for `--chunk-mode`. The default is set in `cli/hn.go` via a constant:
```go
const defaultChunkMode = "batch"  // updated after benchmarking
```
