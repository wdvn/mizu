# Design: pkg/warc + cc warc commands + Bubbletea TUI

**Date:** 2026-02-27
**Status:** Approved
**Scope:** New `pkg/warc` library, enhanced `search cc warc` subcommands, Bubbletea progress TUI for all CC long-running operations.

---

## 1. Overview

Three parallel work streams:

1. **`pkg/warc`** — standalone Go library for streaming WARC and WARC.gz files (read, write, DuckDB import)
2. **`search cc warc`** — five new subcommands: `list`, `download`, `extract`, `import`, `query`
3. **Bubbletea TUI modernization** — replace ad-hoc progress loops in all CC commands with a reusable Bubbletea progress model

The existing `pkg/cc/warc.go` handles single byte-range record parsing for the CDX-indexed flow. `pkg/warc` is complementary: it handles *full* WARC file streaming (sequential, no index required).

---

## 2. `pkg/warc` Package Design

### 2.1 File Layout

```
pkg/warc/
  record.go    — Record, Header, record-type constants
  reader.go    — Reader: streaming iterator (bufio.Scanner idiom)
  writer.go    — Writer: write WARC records to io.Writer
  db.go        — WARCRecord schema, RecordDB (8-shard DuckDB)
  importer.go  — Importer: Reader → RecordDB pipeline
```

### 2.2 Core Types

```go
// Package warc provides streaming read/write for WARC 1.1 files.
// Callers are responsible for decompression (e.g., gzip.NewReader).
package warc

// Record-type constants.
const (
    TypeResponse  = "response"
    TypeRequest   = "request"
    TypeMetadata  = "metadata"
    TypeWARCInfo  = "warcinfo"
    TypeResource  = "resource"
    TypeRevisit   = "revisit"
    TypeConversion = "conversion"
)

// Header holds WARC header fields.
type Header map[string]string

func (h Header) Get(key string) string
func (h Header) Type() string          // WARC-Type
func (h Header) TargetURI() string     // WARC-Target-URI
func (h Header) Date() time.Time       // WARC-Date (RFC3339)
func (h Header) ContentLength() int64  // Content-Length
func (h Header) RecordID() string      // WARC-Record-ID
func (h Header) RefersTo() string      // WARC-Refers-To (revisit)

// Record represents a single WARC record.
// Body must be fully read before calling Reader.Next().
type Record struct {
    Header Header
    Body   io.Reader
}
```

### 2.3 Reader

```go
// Reader iterates WARC records from any io.Reader.
// Caller controls decompression.
//
//   f, _ := os.Open("crawl.warc.gz")
//   gz, _ := gzip.NewReader(f)
//   r := warc.NewReader(gz)
//   for r.Next() {
//       rec := r.Record()
//       // must drain rec.Body before calling Next again
//   }
//   if err := r.Err(); err != nil { ... }
type Reader struct { ... }

func NewReader(r io.Reader) *Reader
func (r *Reader) Next() bool      // advances to next record; returns false at EOF or error
func (r *Reader) Record() *Record // current record; valid only after Next() == true
func (r *Reader) Err() error      // first non-EOF error encountered
```

Body semantics: the Body reader is valid until the next call to `Next()`. Unread body bytes are discarded automatically on the next `Next()` call.

### 2.4 Writer

```go
// Writer writes WARC records in WARC 1.1 format to an io.Writer.
// Caller controls compression (wrap with gzip.NewWriter if needed).
type Writer struct { ... }

func NewWriter(w io.Writer) *Writer
func (w *Writer) WriteRecord(rec *Record) error  // writes header + body + separators
func (w *Writer) Close() error                   // flushes any buffered data
```

### 2.5 DuckDB Schema & RecordDB

```go
// WARCRecord is a flattened WARC record stored in DuckDB.
type WARCRecord struct {
    WARCFile    string
    RecordID    string
    RecordType  string
    TargetURI   string
    Domain      string
    Date        time.Time
    HTTPStatus  int
    MIMEType    string
    Language    string
    Title       string
    Description string
    Body        []byte
    BodyLength  int64
    HTTPHeaders string    // JSON-encoded map
}

// RecordDB is an 8-shard DuckDB store for WARCRecord rows.
type RecordDB struct { ... }

func OpenRecordDB(dir string) (*RecordDB, error)
func (db *RecordDB) Insert(recs []WARCRecord) error
func (db *RecordDB) Close() error
```

### 2.6 Importer

```go
// ImportOptions controls which records are imported.
type ImportOptions struct {
    RecordTypes []string  // e.g., []string{"response"}; nil = all
    MIMETypes   []string  // e.g., []string{"text/html"}; nil = all
    StatusCodes []int     // e.g., []int{200}; nil = all
    MaxBodySize int64     // bytes; 0 = no limit
    BatchSize   int       // rows per DuckDB insert; default 1000
    WARCFile    string    // filename tag for WARCRecord.WARCFile
}

// ImportStats reports accumulated progress.
type ImportStats struct {
    Read     int64  // records scanned
    Imported int64  // records stored
    Skipped  int64  // records filtered out
    Bytes    int64  // body bytes stored
    Elapsed  time.Duration
}

// Importer streams a Reader into a RecordDB.
type Importer struct { ... }

func NewImporter(db *RecordDB, opts ImportOptions) *Importer
func (im *Importer) Import(ctx context.Context, r *Reader, fn func(ImportStats)) error
```

---

## 3. `search cc warc` CLI Design

### 3.1 Command Tree

```
search cc warc
├── list      [crawl]  [flags]            list WARC files in manifest
├── download  [crawl]  [flags]            download full .warc.gz files
├── extract   [crawl]  [flags]            stream → filtered NDJSON/TSV to stdout
├── import    [crawl]  [flags]            stream → DuckDB
└── query     [crawl]  [flags]            query warc-import DuckDB
```

### 3.2 Storage Layout

```
$HOME/data/common-crawl/{crawl-id}/
  warc/                          ← cc warc download output
    CC-MAIN-20260801-000001.warc.gz
    ...
  warc-import/                   ← cc warc import output (8-shard DuckDB)
    warc_000.duckdb
    ...
    warc_007.duckdb
```

### 3.3 `cc warc list`

- Reads `warc.paths.gz` manifest from CC (cached locally after first fetch)
- Flags: `--crawl` (default: latest), `--limit N`, `--json`
- Output: lipgloss table with index, filename, remote path

### 3.4 `cc warc download`

- Flags: `--crawl`, `--file N` (0-based index or range `0-9`), `--workers 4`, `--dir` (default: data dir)
- Downloads from `https://data.commoncrawl.org/{path}`
- Skips files already present and correct size
- Bubbletea progress: per-file progress bar + overall bar + speed/ETA

### 3.5 `cc warc extract`

- Flags: `--crawl`, `--file N`, `--mime text/html`, `--status 200`, `--domain foo.com`, `--type response`, `--out ndjson|tsv`, `--limit N`, `--max-body 512k`
- Streams local `.warc.gz` files from `warc/` dir
- Writes NDJSON (default) or TSV to stdout; progress to stderr via Bubbletea

### 3.6 `cc warc import`

- Same filtering flags as extract
- Imports to `warc-import/` sharded DuckDB
- Flags: `--crawl`, `--file N`, `--mime`, `--status`, `--domain`, `--workers 4`, `--batch 1000`
- Bubbletea progress: records/s, MB/s, ETA

### 3.7 `cc warc query`

- Flags: `--crawl`, `--domain`, `--mime`, `--status`, `--limit 20`, `--out table|json|tsv`
- Queries the `warc-import/` DuckDB (same pattern as existing `cc query`)
- Output: lipgloss table or JSON

---

## 4. Bubbletea TUI Modernization

### 4.1 Reusable Progress Model

New file: `cli/ui/progress.go`

```go
package ui

// ProgressItem represents one tracked item (file, stage, etc.)
type ProgressItem struct {
    Label  string
    Done   int64
    Total  int64  // 0 = indeterminate
    Status string // "pending", "active", "done", "error"
    Err    error
}

// ProgressModel is a Bubbletea model for multi-item progress.
type ProgressModel struct {
    Title    string
    Items    []ProgressItem
    Stats    ProgressStats
    Finished bool
    FinalMsg string
}

type ProgressStats struct {
    Speed   int64   // bytes or items per second
    Unit    string  // "B/s", "rec/s", etc.
    Elapsed time.Duration
    ETA     time.Duration
}

// Msg types for updating progress from goroutines
type ProgressUpdateMsg  ProgressModel
type ProgressDoneMsg    struct{ Err error }
```

Renders multi-file progress:
```
  Downloading  CC-MAIN-2026-08  ──────────────────────────
  [1/4]  CC-MAIN-20260801-000001.warc.gz
         [████████████████████░░░░░░░░░░] 68%  665 MB / 978 MB
  [2/4]  CC-MAIN-20260801-000002.warc.gz
         [░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░]  0%  waiting
  ──────────────────────────────────────────────────────────
  Overall  [████████░░░░░░░░░░░░░░░░░░░░░] 17%   665 MB / 3.9 GB
  Speed    142 MB/s   ETA  24s   Elapsed  6s
```

### 4.2 Commands to Modernize

All commands with progress loops → Bubbletea:
- `cc warc download` — new
- `cc warc import` — new
- `cc warc extract` — new
- `cc index` — existing parquet download+import
- `cc parquet download` — existing
- `cc parquet import` — existing
- `cc fetch` — existing WARC byte-range fetch
- `cc recrawl` — existing (replace live-stats ticker loop)

---

## 5. Spec File

Implementation spec: `spec/0616_warc.md` (detailed step-by-step plan).

---

## 6. Non-Goals

- No change to `pkg/cc/warc.go` (byte-range record parsing stays in `pkg/cc`)
- `cc warc` does not replace `cc fetch` (byte-range is faster for targeted fetches)
- No WARC file deduplication / CDX index building
- No WARC writer compression (caller wraps with `gzip.NewWriter`)
