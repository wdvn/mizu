# Chunked Crawl + Body CAS Store — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduce peak heap from 7.1 GB → <2 GB, add SHA-256 content-addressable body storage, and implement three chunk modes (stream/batch/pipeline) with auto-tuned sizing.

**Architecture:** Body bytes leave the `Result.Body` field and go to a CAS filesystem store (`bodystore`); DuckDB only stores a `body_cid TEXT` reference. The outer crawl loop is refactored into three selectable "chunk modes": `stream` (adaptive sizing), `batch` (domain batch + DuckDB shard reopen), and `pipeline` (staged goroutine pipeline). All auto-sized from available RAM.

**Tech Stack:** Go 1.26, DuckDB (`database/sql` + `github.com/duckdb/duckdb-go/v2`), gob (`encoding/gob`), gzip (`compress/gzip`), SHA-256 (`crypto/sha256`), `net/http/pprof`, Cobra CLI

---

## Context: Key Files

- `pkg/archived/recrawler/types.go` — `Result` struct, `SeedURL`
- `pkg/archived/recrawler/resultdb.go` — `ResultDB`, `writeBatchValues`, `initResultSchema`
- `pkg/crawl/writer_bin.go` — `BinSegWriter`, `binRecord`, `writeOne`
- `pkg/crawl/keepalive.go` — body extraction at lines 382–406
- `pkg/crawl/autoconfig.go` — `AutoConfigKeepAlive`
- `cli/hn.go` — `newHNRecrawl()` starting at line 538

---

## Task 1: Body CAS Store

**Files:**
- Create: `pkg/crawl/bodystore/store.go`
- Create: `pkg/crawl/bodystore/store_test.go`

**Step 1: Write the failing test**

```go
// pkg/crawl/bodystore/store_test.go
package bodystore_test

import (
	"bytes"
	"os"
	"testing"

	"github.com/go-mizu/mizu/blueprints/search/pkg/crawl/bodystore"
)

func TestRoundTrip(t *testing.T) {
	dir := t.TempDir()
	s, err := bodystore.Open(dir)
	if err != nil {
		t.Fatal(err)
	}

	body := []byte("<html><body>hello world</body></html>")
	cid, err := s.Put(body)
	if err != nil {
		t.Fatalf("Put: %v", err)
	}
	if len(cid) == 0 {
		t.Fatal("empty cid")
	}
	if !s.Has(cid) {
		t.Fatal("Has returned false after Put")
	}

	got, err := s.Get(cid)
	if err != nil {
		t.Fatalf("Get: %v", err)
	}
	if !bytes.Equal(got, body) {
		t.Fatalf("body mismatch: got %d bytes, want %d", len(got), len(body))
	}
}

func TestPutIdempotent(t *testing.T) {
	dir := t.TempDir()
	s, _ := bodystore.Open(dir)
	body := []byte("same content")

	cid1, err := s.Put(body)
	if err != nil {
		t.Fatal(err)
	}
	cid2, err := s.Put(body)
	if err != nil {
		t.Fatal(err)
	}
	if cid1 != cid2 {
		t.Fatalf("cids differ: %s vs %s", cid1, cid2)
	}
	// Verify only one file on disk
	path := s.Path(cid1)
	if _, err := os.Stat(path); err != nil {
		t.Fatalf("file not found: %v", err)
	}
}

func TestGetMissing(t *testing.T) {
	s, _ := bodystore.Open(t.TempDir())
	_, err := s.Get("sha256:0000000000000000000000000000000000000000000000000000000000000000")
	if err == nil {
		t.Fatal("expected error for missing cid")
	}
}
```

**Step 2: Run test to verify it fails**

```bash
cd blueprints/search
go test ./pkg/crawl/bodystore/... -v 2>&1 | head -20
```

Expected: `cannot find package "...bodystore"`

**Step 3: Implement the store**

```go
// pkg/crawl/bodystore/store.go
package bodystore

import (
	"compress/gzip"
	"crypto/sha256"
	"fmt"
	"io"
	"os"
	"path/filepath"
)

// Store is a content-addressable body store backed by the filesystem.
// Bodies are stored gzip-compressed at {dir}/{sha[0:2]}/{sha[2:4]}/{sha[4:]}.gz.
// The content ID (CID) format is "sha256:{hex64}".
type Store struct{ dir string }

// Open returns a Store backed by dir, creating it if needed.
func Open(dir string) (*Store, error) {
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, fmt.Errorf("bodystore: mkdir %s: %w", dir, err)
	}
	return &Store{dir: dir}, nil
}

// Put writes body to the store if not already present and returns its CID.
// It is safe to call Put with the same content multiple times.
func (s *Store) Put(body []byte) (string, error) {
	sum := sha256.Sum256(body)
	hex := fmt.Sprintf("%x", sum[:])
	cid := "sha256:" + hex

	path := s.cidToPath(hex)
	if _, err := os.Stat(path); err == nil {
		return cid, nil // already exists
	}

	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return "", fmt.Errorf("bodystore: mkdir: %w", err)
	}

	tmp := path + ".tmp"
	f, err := os.Create(tmp)
	if err != nil {
		return "", fmt.Errorf("bodystore: create: %w", err)
	}
	gz := gzip.NewWriter(f)
	if _, err := gz.Write(body); err != nil {
		f.Close(); os.Remove(tmp)
		return "", fmt.Errorf("bodystore: gzip write: %w", err)
	}
	if err := gz.Close(); err != nil {
		f.Close(); os.Remove(tmp)
		return "", fmt.Errorf("bodystore: gzip close: %w", err)
	}
	if err := f.Close(); err != nil {
		os.Remove(tmp)
		return "", fmt.Errorf("bodystore: close: %w", err)
	}
	if err := os.Rename(tmp, path); err != nil {
		os.Remove(tmp)
		return "", fmt.Errorf("bodystore: rename: %w", err)
	}
	return cid, nil
}

// Get decompresses and returns the body for the given CID.
func (s *Store) Get(cid string) ([]byte, error) {
	hex, ok := cidHex(cid)
	if !ok {
		return nil, fmt.Errorf("bodystore: invalid cid %q", cid)
	}
	f, err := os.Open(s.cidToPath(hex))
	if err != nil {
		return nil, fmt.Errorf("bodystore: open: %w", err)
	}
	defer f.Close()
	gz, err := gzip.NewReader(f)
	if err != nil {
		return nil, fmt.Errorf("bodystore: gzip open: %w", err)
	}
	defer gz.Close()
	return io.ReadAll(gz)
}

// Has reports whether the CID exists in the store.
func (s *Store) Has(cid string) bool {
	hex, ok := cidHex(cid)
	if !ok {
		return false
	}
	_, err := os.Stat(s.cidToPath(hex))
	return err == nil
}

// Path returns the filesystem path for a CID (does not check existence).
func (s *Store) Path(cid string) string {
	hex, ok := cidHex(cid)
	if !ok {
		return ""
	}
	return s.cidToPath(hex)
}

func (s *Store) cidToPath(hex string) string {
	// hex is always 64 chars (SHA-256)
	return filepath.Join(s.dir, hex[0:2], hex[2:4], hex[4:]+".gz")
}

func cidHex(cid string) (string, bool) {
	const prefix = "sha256:"
	if len(cid) != len(prefix)+64 {
		return "", false
	}
	if cid[:len(prefix)] != prefix {
		return "", false
	}
	return cid[len(prefix):], true
}
```

**Step 4: Run test to verify it passes**

```bash
cd blueprints/search
go test ./pkg/crawl/bodystore/... -v
```

Expected: all 3 tests PASS.

**Step 5: Commit**

```bash
git add pkg/crawl/bodystore/store.go pkg/crawl/bodystore/store_test.go
git commit -m "feat(bodystore): add SHA-256 CAS body store with gzip compression"
```

---

## Task 2: Add BodyCID to Result and resultdb.go

**Files:**
- Modify: `pkg/archived/recrawler/types.go` (add `BodyCID string` to `Result`)
- Modify: `pkg/archived/recrawler/resultdb.go` (add column DDL + write BodyCID + ReopenShards)

**Step 1: Add `BodyCID` to `Result` struct**

In `pkg/archived/recrawler/types.go`, after `Body string`:

```go
Body          string // HTML body (full content mode)
BodyCID       string // CAS reference e.g. "sha256:{hex64}"; "" = not stored
```

**Step 2: Verify build still compiles**

```bash
cd blueprints/search
go build ./...
```

Expected: no errors.

**Step 3: Add `body_cid` column to schema in `initResultSchema`**

In `pkg/archived/recrawler/resultdb.go`, the `CREATE TABLE` DDL at line 126 currently has 14 columns ending with `status VARCHAR DEFAULT 'done'`. Add `body_cid` after `status`:

Replace the DDL block:
```go
_, err := db.Exec(`
	CREATE TABLE IF NOT EXISTS results (
		url VARCHAR,
		status_code INTEGER,
		content_type VARCHAR,
		content_length BIGINT,
		body VARCHAR,
		title VARCHAR,
		description VARCHAR,
		language VARCHAR,
		domain VARCHAR,
		redirect_url VARCHAR,
		fetch_time_ms BIGINT,
		crawled_at TIMESTAMP,
		error VARCHAR,
		status VARCHAR DEFAULT 'done'
	)
`)
```

With:
```go
_, err := db.Exec(`
	CREATE TABLE IF NOT EXISTS results (
		url VARCHAR,
		status_code INTEGER,
		content_type VARCHAR,
		content_length BIGINT,
		body VARCHAR,
		title VARCHAR,
		description VARCHAR,
		language VARCHAR,
		domain VARCHAR,
		redirect_url VARCHAR,
		fetch_time_ms BIGINT,
		crawled_at TIMESTAMP,
		error VARCHAR,
		status VARCHAR DEFAULT 'done',
		body_cid VARCHAR DEFAULT ''
	)
`)
if err != nil {
	return err
}
// Add body_cid to existing DBs that were created before this schema version.
_, _ = db.Exec(`ALTER TABLE results ADD COLUMN IF NOT EXISTS body_cid VARCHAR DEFAULT ''`)
return nil
```

**Step 4: Update `writeBatchValues` to write `body_cid`**

The function at line 210 currently uses 14 columns and hardcodes `""` for body (line 236). Change to 15 columns, write `r.BodyCID` for `body_cid`, and keep `""` for `body` (still not stored in DuckDB):

```go
func writeBatchValues(db *sql.DB, batch []Result) int {
	const cols = 15  // was 14
	const maxPerStmt = 400  // DuckDB param limit / cols (was 500/14)
	...
	b.WriteString("INSERT INTO results (url, status_code, content_type, content_length, body, title, description, language, domain, redirect_url, fetch_time_ms, crawled_at, error, status, body_cid) VALUES ")
	...
	b.WriteString("(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")  // 15 ?s
	...
	args = append(args, sanitizeStr(r.URL), r.StatusCode, sanitizeStr(r.ContentType), r.ContentLength,
		"", sanitizeStr(r.Title), sanitizeStr(r.Description), sanitizeStr(r.Language),
		sanitizeStr(r.Domain), sanitizeStr(r.RedirectURL), r.FetchTimeMs, r.CrawledAt,
		sanitizeStr(r.Error), status, sanitizeStr(r.BodyCID))  // added BodyCID at end
```

**Step 5: Add `ReopenShards()` method**

At the end of `resultdb.go`, before the closing of the file, add:

```go
// ReopenShards closes and reopens each DuckDB shard connection.
// This releases DuckDB's CGO buffer pool memory (~256 MB per shard = ~2 GB total)
// which is invisible to Go's GC and never released between batches otherwise.
// Call between domain batches in batch/pipeline chunk modes.
func (rdb *ResultDB) ReopenShards() error {
	for i, s := range rdb.shards {
		// Flush pending batch first.
		s.mu.Lock()
		if len(s.batch) > 0 {
			batch := s.batch
			s.batch = make([]Result, 0, s.batchSz)
			s.mu.Unlock()
			s.flushCh <- batch
			// Wait for flusher to drain it.
			for {
				s.mu.Lock()
				pending := len(s.flushCh)
				s.mu.Unlock()
				if pending == 0 {
					break
				}
				time.Sleep(10 * time.Millisecond)
			}
		} else {
			s.mu.Unlock()
		}

		// Close and reopen the DuckDB connection.
		path := filepath.Join(rdb.dir, fmt.Sprintf("results_%03d.duckdb", i))
		s.db.Close()
		db, err := sql.Open("duckdb", path)
		if err != nil {
			return fmt.Errorf("reopen shard %d: %w", i, err)
		}
		if err := applyShardSettings(db); err != nil {
			db.Close()
			return fmt.Errorf("reopen shard %d settings: %w", i, err)
		}
		s.db = db
	}
	return nil
}

// applyShardSettings applies DuckDB performance settings to a fresh connection.
func applyShardSettings(db *sql.DB) error {
	for _, stmt := range []string{
		"SET memory_limit='256MB'",
		"SET threads=1",
		"SET preserve_insertion_order=false",
		"SET checkpoint_threshold='4MB'",
	} {
		if _, err := db.Exec(stmt); err != nil {
			// checkpoint_threshold may not exist in all versions; log but continue
			fmt.Fprintf(os.Stderr, "[resultdb] %s: %v\n", stmt, err)
		}
	}
	return nil
}
```

Also add `"time"` to the imports if not already present.

**Step 6: Verify build**

```bash
cd blueprints/search
go build ./...
```

Expected: no errors.

**Step 7: Commit**

```bash
git add pkg/archived/recrawler/types.go pkg/archived/recrawler/resultdb.go
git commit -m "feat(resultdb): add body_cid column, ReopenShards(), wire BodyCID in writeBatch"
```

---

## Task 3: Update BinSegWriter (remove Body, add BodyCID)

**Files:**
- Modify: `pkg/crawl/writer_bin.go`

**Step 1: Update `binRecord` struct (line 40)**

Replace `Body string` with `BodyCID string`:

```go
type binRecord struct {
	URL           string
	StatusCode    int
	ContentType   string
	ContentLength int64
	BodyCID       string  // was: Body string
	Title         string
	Description   string
	Language      string
	Domain        string
	RedirectURL   string
	FetchTimeMs   int64
	CrawledAtMs   int64
	Error         string
	Failed        bool
}
```

**Step 2: Update `toResult()` (line 57)**

Replace `Body: r.Body,` with `BodyCID: r.BodyCID,`:

```go
func (r *binRecord) toResult() recrawler.Result {
	return recrawler.Result{
		URL:           r.URL,
		StatusCode:    r.StatusCode,
		ContentType:   r.ContentType,
		ContentLength: r.ContentLength,
		BodyCID:       r.BodyCID,  // was: Body: r.Body,
		Title:         r.Title,
		...
	}
}
```

**Step 3: Update `writeOne()` (line 207)**

Replace `jr.Body = binSanitize(r.Body)` with `jr.BodyCID = r.BodyCID`:

```go
jr.BodyCID       = r.BodyCID   // was: jr.Body = binSanitize(r.Body)
```

**Step 4: Build and verify**

```bash
cd blueprints/search
go build ./...
```

Expected: no errors.

**Step 5: Commit**

```bash
git add pkg/crawl/writer_bin.go
git commit -m "feat(writer_bin): replace Body with BodyCID in binRecord (body lives in CAS store)"
```

---

## Task 4: Wire BodyStore in keepalive.go

**Files:**
- Modify: `pkg/crawl/keepalive.go`

**Step 1: Add `bodyStore` field to engine config**

Find the `Config` struct in `pkg/crawl/engine.go` or `keepalive.go`. Add a `BodyStore` field.

First check where Config is defined:

```bash
grep -n "type Config struct" blueprints/search/pkg/crawl/*.go
```

Add to `Config`:
```go
BodyStore interface {
    Put(body []byte) (cid string, err error)
} // optional; if set, bodies go to CAS store
```

**Step 2: Update body extraction in `keepalive.go` (around line 386-406)**

Current code at line 387:
```go
body = string(bodyBytes)
```

Replace the body assignment and Result construction with CAS store usage:

```go
var title, description, language, body, bodyCID string
if resp.StatusCode == 200 && isHTML && len(bodyBytes) > 0 {
    body = string(bodyBytes)
    extracted := crawler.Extract(strings.NewReader(body), seed.URL)
    title = extracted.Title
    description = extracted.Description
    language = extracted.Language
    // Store body in CAS if available; clear in-memory string immediately.
    if s.cfg.BodyStore != nil {
        if cid, err := s.cfg.BodyStore.Put(bodyBytes); err == nil {
            bodyCID = cid
        }
        body = "" // don't keep body in Result; CAS has it
    }
}

return recrawler.Result{
    ...
    Body:    body,    // empty string when BodyStore is set
    BodyCID: bodyCID,
    ...
}
```

Note: `s.cfg` is whatever receiver variable holds the `Config` in the keepalive engine. Inspect the actual function signature to find the right variable name.

**Step 3: Build and verify**

```bash
cd blueprints/search
go build ./...
```

Expected: no errors.

**Step 4: Commit**

```bash
git add pkg/crawl/keepalive.go pkg/crawl/engine.go
git commit -m "feat(keepalive): wire BodyStore into body extraction; store CID, clear body string"
```

---

## Task 5: Add Auto-Tune Functions to autoconfig.go

**Files:**
- Modify: `pkg/crawl/autoconfig.go`

**Step 1: Add three new functions at end of file**

```go
// AutoBinChanCap returns a channel buffer size capped at 5% of available RAM.
// Prevents the 32K×bodyKB channel from consuming 256 MB at full load.
func AutoBinChanCap(availMB, bodyKB int) int {
	if bodyKB <= 0 {
		bodyKB = 256
	}
	cap := availMB * 1024 * 1024 / 20 / (bodyKB * 1024)
	return clamp(cap, 256, 32768)
}

// AutoWorkersFull returns max workers constrained to 20% of available RAM for bodies.
// Use when full-body crawl is enabled (bodyKB = 256).
func AutoWorkersFull(availMB, bodyKB int) int {
	if bodyKB <= 0 {
		bodyKB = 256
	}
	w := availMB * 1024 / 5 / bodyKB
	return clamp(w, 100, 8192)
}

// AutoBatchDomains returns how many domains to process per chunk in batch mode.
// Budgets 30% of available RAM for in-flight bodies in one batch.
func AutoBatchDomains(availMB, avgURLsPerDomain, bodyKB int) int {
	if bodyKB <= 0 {
		bodyKB = 256
	}
	if avgURLsPerDomain <= 0 {
		avgURLsPerDomain = 3
	}
	budgetKB := availMB * 1024 / 3
	urls := budgetKB / bodyKB
	n := urls / avgURLsPerDomain
	if n < 500 {
		n = 500
	}
	return n
}

func clamp(v, lo, hi int) int {
	if v < lo {
		return lo
	}
	if v > hi {
		return hi
	}
	return v
}
```

Note: if `clamp` already exists in the file, skip that function.

**Step 2: Build and verify**

```bash
cd blueprints/search
go build ./pkg/crawl/...
```

**Step 3: Commit**

```bash
git add pkg/crawl/autoconfig.go
git commit -m "feat(autoconfig): add AutoBinChanCap, AutoWorkersFull, AutoBatchDomains"
```

---

## Task 6: SeedCursor — Streaming Page Cursor

**Files:**
- Create: `pkg/crawl/seedcursor.go`
- Create: `pkg/crawl/seedcursor_test.go`

**Step 1: Write the failing test**

```go
// pkg/crawl/seedcursor_test.go
package crawl_test

import (
	"context"
	"database/sql"
	"os"
	"path/filepath"
	"testing"

	_ "github.com/duckdb/duckdb-go/v2"
	crawl "github.com/go-mizu/mizu/blueprints/search/pkg/crawl"
)

func makeSeedDB(t *testing.T, rows int) string {
	t.Helper()
	dir := t.TempDir()
	path := filepath.Join(dir, "seeds.duckdb")
	db, err := sql.Open("duckdb", path)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	db.Exec(`CREATE TABLE seeds (url VARCHAR, domain VARCHAR, host VARCHAR)`)
	for i := range rows {
		db.Exec("INSERT INTO seeds VALUES (?, ?, ?)",
			"http://example.com/"+strconv.Itoa(i), "example.com", "example.com")
	}
	return path
}

func TestSeedCursorPageThrough(t *testing.T) {
	path := makeSeedDB(t, 25)
	c, err := crawl.NewSeedCursor(path, 10)
	if err != nil {
		t.Fatal(err)
	}
	defer c.Close()

	total := 0
	for {
		page, err := c.Next(context.Background())
		if err != nil {
			t.Fatal(err)
		}
		if len(page) == 0 {
			break
		}
		total += len(page)
	}
	if total != 25 {
		t.Fatalf("got %d rows, want 25", total)
	}
}
```

Also add `"strconv"` to imports.

**Step 2: Run to verify it fails**

```bash
cd blueprints/search
go test ./pkg/crawl/... -run TestSeedCursor -v 2>&1 | head -10
```

Expected: compile error (SeedCursor not found).

**Step 3: Implement SeedCursor**

```go
// pkg/crawl/seedcursor.go
package crawl

import (
	"context"
	"database/sql"
	"fmt"

	_ "github.com/duckdb/duckdb-go/v2"
	"github.com/go-mizu/mizu/blueprints/search/pkg/archived/recrawler"
)

// SeedCursor pages through a DuckDB seed table without loading all rows into memory.
// Each Next() call returns up to PageSize rows. Returns empty slice at EOF.
type SeedCursor struct {
	db       *sql.DB
	pageSize int
	offset   int
}

// NewSeedCursor opens a read-only cursor over the seeds table in dbPath.
// pageSize is the number of rows per page (default 10000 if ≤0).
func NewSeedCursor(dbPath string, pageSize int) (*SeedCursor, error) {
	if pageSize <= 0 {
		pageSize = 10_000
	}
	db, err := sql.Open("duckdb", dbPath+"?access_mode=READ_ONLY")
	if err != nil {
		return nil, fmt.Errorf("seedcursor: open %s: %w", dbPath, err)
	}
	return &SeedCursor{db: db, pageSize: pageSize}, nil
}

// Next returns the next page of seed URLs. Returns an empty slice at EOF.
func (c *SeedCursor) Next(ctx context.Context) ([]recrawler.SeedURL, error) {
	rows, err := c.db.QueryContext(ctx,
		"SELECT url, domain, host FROM seeds LIMIT ? OFFSET ?",
		c.pageSize, c.offset)
	if err != nil {
		return nil, fmt.Errorf("seedcursor: query: %w", err)
	}
	defer rows.Close()

	var page []recrawler.SeedURL
	for rows.Next() {
		var s recrawler.SeedURL
		if err := rows.Scan(&s.URL, &s.Domain, &s.Host); err != nil {
			return nil, fmt.Errorf("seedcursor: scan: %w", err)
		}
		page = append(page, s)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("seedcursor: rows: %w", err)
	}
	c.offset += len(page)
	return page, nil
}

// Close closes the underlying database connection.
func (c *SeedCursor) Close() error {
	return c.db.Close()
}
```

**Step 4: Run test to verify it passes**

```bash
cd blueprints/search
go test ./pkg/crawl/... -run TestSeedCursor -v
```

Expected: PASS.

**Step 5: Commit**

```bash
git add pkg/crawl/seedcursor.go pkg/crawl/seedcursor_test.go
git commit -m "feat(crawl): add SeedCursor streaming page cursor over DuckDB seed table"
```

---

## Task 7: Mode B (batch) in cli/hn.go

**Files:**
- Modify: `cli/hn.go`

This is the default chunk mode. It wraps the existing keepalive engine in a batch loop that processes domains in chunks and calls `ReopenShards()` + `debug.FreeOSMemory()` between batches.

**Step 1: Add new flags to `newHNRecrawl()`**

In the `var (...)` block at line 539, add:
```go
chunkMode   string  // "stream", "batch", "pipeline"
chunkSize   int     // override batch size (0 = auto)
pprofPort   int     // 0 = disabled
bodyStoreDir string  // "" = $dataDir/bodies
```

After the existing `RunE:` flag definitions, add:
```go
cmd.Flags().StringVar(&chunkMode, "chunk-mode", "batch", "Chunk mode: stream|batch|pipeline")
cmd.Flags().IntVar(&chunkSize, "chunk-size", 0, "Override batch domain count (0=auto)")
cmd.Flags().IntVar(&pprofPort, "pprof-port", 0, "Enable pprof HTTP server on this port (0=off)")
cmd.Flags().StringVar(&bodyStoreDir, "body-store", "", "Body CAS store dir (default: $dataDir/bodies)")
```

**Step 2: Wire pprof startup**

At the start of `RunE`, after `ctx, stop := hnSignalContext(...)`:
```go
if pprofPort > 0 {
    go func() {
        _ = http.ListenAndServe(fmt.Sprintf(":%d", pprofPort), nil)
    }()
    fmt.Printf("  pprof:         http://localhost:%d/debug/pprof/\n", pprofPort)
}
```

Add `"net/http"` to imports.

**Step 3: Initialize body store before crawl**

After the seed preparation is done and before `eng.Run(ctx, seeds)`, open the body store:

```go
// Open body store
bsDir := bodyStoreDir
if bsDir == "" {
    bsDir = filepath.Join(cfg.WithDefaults().RecrawlDir(), "bodies")
}
bs, err := bodystore.Open(bsDir)
if err != nil {
    return fmt.Errorf("open body store: %w", err)
}
fmt.Printf("  Body store:    %s\n", labelStyle.Render(bsDir))
crawlCfg.BodyStore = bs
```

Add import: `"github.com/go-mizu/mizu/blueprints/search/pkg/crawl/bodystore"`

**Step 4: Add the batch loop**

Find the section in `RunE` where `eng.Run(ctx, seeds)` is called. Replace it with a batch-aware wrapper:

```go
const defaultChunkMode = "batch"
mode := chunkMode
if mode == "" {
    mode = defaultChunkMode
}

switch mode {
case "batch":
    // Group seeds by domain, split into batches.
    si, _ := crawl.LoadOrGatherSysInfo("", 0) // use cached sysinfo
    batchDomains := chunkSize
    if batchDomains <= 0 {
        batchDomains = crawl.AutoBatchDomains(int(si.MemAvailableMB), 3, 256)
    }
    fmt.Printf("  Chunk mode:    batch (%d domains/batch)\n", batchDomains)

    // Group seeds by domain.
    domainMap := make(map[string][]recrawler.SeedURL)
    for _, s := range seeds {
        domainMap[s.Domain] = append(domainMap[s.Domain], s)
    }
    domains := make([]string, 0, len(domainMap))
    for d := range domainMap {
        domains = append(domains, d)
    }

    for start := 0; start < len(domains); start += batchDomains {
        end := min(start+batchDomains, len(domains))
        var batchSeeds []recrawler.SeedURL
        for _, d := range domains[start:end] {
            batchSeeds = append(batchSeeds, domainMap[d]...)
        }
        batchNum := start/batchDomains + 1
        totalBatches := (len(domains) + batchDomains - 1) / batchDomains
        fmt.Printf("  Batch %d/%d: %d domains, %d seeds\n",
            batchNum, totalBatches, end-start, len(batchSeeds))

        if err := eng.Run(ctx, batchSeeds); err != nil && ctx.Err() == nil {
            return err
        }
        if ctx.Err() != nil {
            break
        }
        if rdb != nil {
            if err := rdb.ReopenShards(); err != nil {
                fmt.Fprintf(os.Stderr, "  [warn] ReopenShards: %v\n", err)
            }
        }
        debug.FreeOSMemory()
    }

case "stream":
    // Adaptive sizing; single engine.Run with auto-tuned workers.
    si, _ := crawl.LoadOrGatherSysInfo("", 0)
    if workers <= 0 {
        crawlCfg.Workers = crawl.AutoWorkersFull(int(si.MemAvailableMB), 256)
    }
    fmt.Printf("  Chunk mode:    stream (workers=%d)\n", crawlCfg.Workers)
    if err := eng.Run(ctx, seeds); err != nil && ctx.Err() == nil {
        return err
    }

default: // "pipeline" or unknown
    fmt.Printf("  Chunk mode:    %s (pipeline not yet implemented, using stream)\n", mode)
    if err := eng.Run(ctx, seeds); err != nil && ctx.Err() == nil {
        return err
    }
}
```

Note: `rdb` must be declared/available in scope. Check the existing RunE code to find where `ResultDB` is created and use the same variable name.

**Step 5: Build and smoke test**

```bash
cd blueprints/search
go build ./...
./bin/search hn recrawl --help 2>&1 | grep -E "chunk|pprof|body-store"
```

Expected: shows `--chunk-mode`, `--chunk-size`, `--pprof-port`, `--body-store` flags.

**Step 6: Commit**

```bash
git add cli/hn.go
git commit -m "feat(hn): add --chunk-mode batch/stream, --pprof-port, --body-store flags with batch loop"
```

---

## Task 8: Mode C — Pipeline Crawler

**Files:**
- Create: `pkg/crawl/pipeline.go`

This implements the staged goroutine pipeline described in the spec. It runs concurrently: CrawlStage crawling one batch while DrainStage drains the previous batch's segments.

**Step 1: Implement PipelineCrawler**

```go
// pkg/crawl/pipeline.go
package crawl

import (
	"context"
	"fmt"
	"runtime/debug"
	"sync"

	"github.com/go-mizu/mizu/blueprints/search/pkg/archived/recrawler"
)

// PipelineCrawler implements Mode C: a staged goroutine pipeline where drain
// runs concurrently with the next batch's crawl, maximizing I/O overlap.
//
// Pipeline:
//   SeedPage → DomainBatcher → [batchCh] → CrawlStage → [segPathCh] → DrainStage
type PipelineCrawler struct {
	eng        KeepAliveEngine
	cfg        Config
	rdb        *recrawler.ResultDB
	seedPath   string
	batchSize  int
	pageSize   int
	segDir     string
	availMB    int
}

// PipelineConfig holds configuration for the pipeline crawler.
type PipelineConfig struct {
	Cfg       Config
	RDB       *recrawler.ResultDB
	SeedPath  string
	BatchSize int // domains per batch (0=auto)
	PageSize  int // seeds per SeedCursor page (0=10000)
	SegDir    string
	AvailMB   int
}

// RunPipeline executes the Mode C pipeline crawl.
func RunPipeline(ctx context.Context, pcfg PipelineConfig) error {
	batchSize := pcfg.BatchSize
	if batchSize <= 0 {
		batchSize = AutoBatchDomains(pcfg.AvailMB, 3, 256)
	}
	pageSize := pcfg.PageSize
	if pageSize <= 0 {
		pageSize = 10_000
	}

	cursor, err := NewSeedCursor(pcfg.SeedPath, pageSize)
	if err != nil {
		return fmt.Errorf("pipeline: seed cursor: %w", err)
	}
	defer cursor.Close()

	// batchCh carries domain-grouped seed batches between batcher and crawl stage.
	batchCh := make(chan []recrawler.SeedURL, 1)
	// segPathCh carries completed segment paths between crawl and drain stages.
	segPathCh := make(chan string, 4)

	var wg sync.WaitGroup

	// Stage 1: DomainBatcher — reads seed pages, groups by domain, emits batches.
	wg.Add(1)
	go func() {
		defer close(batchCh)
		defer wg.Done()

		domainMap := make(map[string][]recrawler.SeedURL)
		var domains []string

		flushBatch := func() {
			if len(domains) == 0 {
				return
			}
			var batch []recrawler.SeedURL
			for _, d := range domains {
				batch = append(batch, domainMap[d]...)
			}
			select {
			case batchCh <- batch:
			case <-ctx.Done():
				return
			}
			domainMap = make(map[string][]recrawler.SeedURL)
			domains = domains[:0]
		}

		for {
			page, err := cursor.Next(ctx)
			if err != nil || len(page) == 0 {
				break
			}
			for _, s := range page {
				if _, ok := domainMap[s.Domain]; !ok {
					domains = append(domains, s.Domain)
				}
				domainMap[s.Domain] = append(domainMap[s.Domain], s)
			}
			// Emit a batch when we have enough domains.
			for len(domains) >= batchSize {
				flushBatch()
				if ctx.Err() != nil {
					return
				}
			}
		}
		// Flush remaining.
		flushBatch()
	}()

	// Stage 2: CrawlStage — runs keepalive engine per batch, signals drain via segPathCh.
	// (For now, uses synchronous eng.Run; a full implementation would plumb segPathCh
	//  directly into BinSegWriter for true overlap. This version is correct and safe.)
	wg.Add(1)
	go func() {
		defer close(segPathCh)
		defer wg.Done()

		eng := KeepAliveEngine{}
		for batch := range batchCh {
			if ctx.Err() != nil {
				return
			}
			if err := eng.Run(ctx, batch, pcfg.Cfg, pcfg.RDB); err != nil && ctx.Err() == nil {
				fmt.Printf("[pipeline] crawl batch error: %v\n", err)
			}
			if pcfg.RDB != nil {
				_ = pcfg.RDB.ReopenShards()
			}
			debug.FreeOSMemory()
		}
	}()

	// Wait for all stages to complete.
	wg.Wait()
	return ctx.Err()
}
```

Note: The exact signature of `KeepAliveEngine.Run` must match what's in `keepalive.go`. Inspect the actual signature:
```bash
grep -n "func.*KeepAliveEngine.*Run" blueprints/search/pkg/crawl/keepalive.go
```
Adjust the `eng.Run(ctx, batch, pcfg.Cfg, pcfg.RDB)` call accordingly.

**Step 2: Build and verify**

```bash
cd blueprints/search
go build ./pkg/crawl/...
```

Fix any signature mismatches.

**Step 3: Wire pipeline into cli/hn.go `case "pipeline":`**

Replace the `default:` fallback with:
```go
case "pipeline":
    si, _ := crawl.LoadOrGatherSysInfo("", 0)
    fmt.Printf("  Chunk mode:    pipeline (batch=%d domains)\n",
        crawl.AutoBatchDomains(int(si.MemAvailableMB), 3, 256))
    return crawl.RunPipeline(ctx, crawl.PipelineConfig{
        Cfg:      crawlCfg,
        RDB:      rdb,
        SeedPath: seedDB,
        AvailMB:  int(si.MemAvailableMB),
        SegDir:   filepath.Join(cfg.WithDefaults().RecrawlDir(), "segs"),
    })
```

**Step 4: Build and verify**

```bash
cd blueprints/search
go build ./...
```

**Step 5: Commit**

```bash
git add pkg/crawl/pipeline.go cli/hn.go
git commit -m "feat(crawl): add PipelineCrawler (Mode C) staged goroutine pipeline"
```

---

## Task 9: Benchmark JSON Writer + Makefile Target

**Files:**
- Create: `pkg/crawl/chunkbench.go`
- Modify: `Makefile`

**Step 1: Implement chunkbench.go**

```go
// pkg/crawl/chunkbench.go
package crawl

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"time"
)

// BenchResult holds benchmark metrics for one chunk mode run.
type BenchResult struct {
	Mode           string  `json:"mode"`
	AvgRPS         float64 `json:"avg_rps"`
	PeakRPS        float64 `json:"peak_rps"`
	PeakHeapMB     uint64  `json:"peak_heap_mb"`
	GCCycles       uint32  `json:"gc_cycles"`
	DurationS      float64 `json:"duration_s"`
	OKCount        int64   `json:"ok_count"`
	BodyStoreWrites int64  `json:"body_store_writes"`
	BatchCount     int     `json:"batch_count"`
}

// BenchTracker collects runtime stats during a chunk mode run.
type BenchTracker struct {
	mode       string
	start      time.Time
	peakHeapMB uint64
	gcBefore   uint32
	okCount    int64
	bsWrites   int64
	batchCount int
	peakRPS    float64
}

// NewBenchTracker starts tracking for the given mode.
func NewBenchTracker(mode string) *BenchTracker {
	var ms runtime.MemStats
	runtime.ReadMemStats(&ms)
	return &BenchTracker{
		mode:     mode,
		start:    time.Now(),
		gcBefore: ms.NumGC,
	}
}

// RecordBatch updates batch count and peak RPS.
func (t *BenchTracker) RecordBatch(okDelta int64, elapsed time.Duration) {
	t.batchCount++
	t.okCount += okDelta
	if elapsed > 0 {
		rps := float64(okDelta) / elapsed.Seconds()
		if rps > t.peakRPS {
			t.peakRPS = rps
		}
	}
	var ms runtime.MemStats
	runtime.ReadMemStats(&ms)
	heapMB := ms.HeapAlloc / 1024 / 1024
	if heapMB > t.peakHeapMB {
		t.peakHeapMB = heapMB
	}
}

// RecordBodyStore increments the body store write count.
func (t *BenchTracker) RecordBodyStore(n int64) { t.bsWrites += n }

// Save writes the benchmark result JSON to dataDir/bench_chunk_{mode}.json.
func (t *BenchTracker) Save(dataDir string) error {
	dur := time.Since(t.start)
	var ms runtime.MemStats
	runtime.ReadMemStats(&ms)

	result := BenchResult{
		Mode:            t.mode,
		AvgRPS:          float64(t.okCount) / dur.Seconds(),
		PeakRPS:         t.peakRPS,
		PeakHeapMB:      t.peakHeapMB,
		GCCycles:        ms.NumGC - t.gcBefore,
		DurationS:       dur.Seconds(),
		OKCount:         t.okCount,
		BodyStoreWrites: t.bsWrites,
		BatchCount:      t.batchCount,
	}

	path := filepath.Join(dataDir, fmt.Sprintf("bench_chunk_%s.json", t.mode))
	data, err := json.MarshalIndent(result, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0o644)
}
```

**Step 2: Add `bench-chunk` Makefile target**

Find the Makefile in `blueprints/search/Makefile`. At the end, add:

```makefile
## bench-chunk: Run all 3 chunk modes and compare (200K seeds, no-retry)
bench-chunk:
	@for mode in stream batch pipeline; do \
		rm -f $(DATA_DIR)/hn/recrawl/results/*.duckdb; \
		$(BINARY) hn recrawl --limit 200000 --no-retry --chunk-mode $$mode; \
	done
	@echo "Benchmark results:"
	@for mode in stream batch pipeline; do \
		echo "--- $$mode ---"; \
		cat $(DATA_DIR)/hn/recrawl/bench_chunk_$$mode.json 2>/dev/null || echo "(not found)"; \
	done
```

Check what `$(BINARY)` and `$(DATA_DIR)` are called in the Makefile:
```bash
grep -n "^BINARY\|^DATA_DIR\|^DATA\b" blueprints/search/Makefile | head -10
```

Use the correct variable names.

**Step 3: Build and verify**

```bash
cd blueprints/search
go build ./pkg/crawl/...
make -n bench-chunk  # dry run to verify target syntax
```

**Step 4: Commit**

```bash
git add pkg/crawl/chunkbench.go Makefile
git commit -m "feat(crawl): add BenchTracker, bench_chunk_*.json output, bench-chunk Makefile target"
```

---

## Task 10: Integration Test + Run bench-chunk

**Step 1: Quick smoke test with 1K seeds**

```bash
# On server2 or locally:
./bin/search hn recrawl --limit 1000 --no-retry --chunk-mode batch --pprof-port 6060
```

While running, check memory in another terminal:
```bash
curl -s http://localhost:6060/debug/pprof/heap > /tmp/heap.pprof
go tool pprof -top /tmp/heap.pprof | head -20
```

**Step 2: Deploy to server2**

```bash
make build-linux-noble
make deploy-linux-noble SERVER=2
```

**Step 3: Run full bench-chunk on server2**

```bash
# On server2:
rm -f ~/data/hn/recrawl/results/*.duckdb
~/bin/search hn recrawl --limit 200000 --no-retry --chunk-mode stream
rm -f ~/data/hn/recrawl/results/*.duckdb
~/bin/search hn recrawl --limit 200000 --no-retry --chunk-mode batch
rm -f ~/data/hn/recrawl/results/*.duckdb
~/bin/search hn recrawl --limit 200000 --no-retry --chunk-mode pipeline
```

**Step 4: Compare results**

```bash
for mode in stream batch pipeline; do
    echo "--- $mode ---"
    cat ~/data/hn/recrawl/bench_chunk_$mode.json
done
```

**Step 5: Update default based on results**

In `cli/hn.go`, update:
```go
const defaultChunkMode = "batch" // or "pipeline" if pipeline wins
```

**Step 6: Update spec/0621_chunk.md status checklist**

Mark all items as complete. Note actual peak heap MB achieved.

**Step 7: Commit**

```bash
git add cli/hn.go spec/0621_chunk.md
git commit -m "feat(hn): set default chunk mode based on benchmark results"
```

---

## Execution Checklist

| Task | Status |
|------|--------|
| 1. BodyStore (`pkg/crawl/bodystore/store.go`) | ☐ |
| 2. BodyCID in types + resultdb (column + ReopenShards) | ☐ |
| 3. BinSegWriter: Body→BodyCID | ☐ |
| 4. keepalive.go: wire BodyStore | ☐ |
| 5. autoconfig.go: AutoBinChanCap/AutoWorkersFull/AutoBatchDomains | ☐ |
| 6. SeedCursor streaming page cursor | ☐ |
| 7. cli/hn.go: --chunk-mode batch + --pprof-port + batch loop | ☐ |
| 8. pipeline.go: Mode C PipelineCrawler | ☐ |
| 9. chunkbench.go + Makefile bench-chunk | ☐ |
| 10. Deploy + bench-chunk + pick default | ☐ |
