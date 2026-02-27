package crawl

import (
	"bufio"
	"context"
	"encoding/gob"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"sync/atomic"
	"time"
	"unicode/utf8"

	"github.com/go-mizu/mizu/blueprints/search/pkg/archived/recrawler"
)

const (
	// binChanCap is the number of Result records buffered in the write channel.
	// At 10K writes/s this provides ~3.2 seconds of headroom before any worker blocks.
	// Reduced from 128K to 32K: worst-case channel memory = 32K × avg_record ≈ 256 MB.
	binChanCap = 32768 // 32K records

	// binSegQueueCap is the number of completed segment paths buffered for the drain goroutine.
	binSegQueueCap = 16

	// binSegDefaultMB is the segment rotation threshold in megabytes.
	binSegDefaultMB = 64

	// binFlushBufSize is the bufio.Writer buffer size for each segment file.
	binFlushBufSize = 512 * 1024 // 512 KB
)

// binRecord is the gob serialization type for binary segments (.bseg files).
//
// gob encodes field names once (in the type descriptor on first Encode call),
// then uses field indices for all subsequent records — zero per-record field-name overhead.
// Failed replaces the string "status" field: false=done, true=failed.
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
	CrawledAtMs   int64 // Unix milliseconds
	Error         string
	Failed        bool // false=done, true=failed
}

func (r *binRecord) toResult() recrawler.Result {
	return recrawler.Result{
		URL:           r.URL,
		StatusCode:    r.StatusCode,
		ContentType:   r.ContentType,
		ContentLength: r.ContentLength,
		Body:          r.Body,
		Title:         r.Title,
		Description:   r.Description,
		Language:      r.Language,
		Domain:        r.Domain,
		RedirectURL:   r.RedirectURL,
		FetchTimeMs:   r.FetchTimeMs,
		CrawledAt:     time.UnixMilli(r.CrawledAtMs),
		Error:         r.Error,
	}
}

// BinSegWriter writes results to rotating binary segment files (.bseg).
//
// Write path: HTTP workers → ch (32K buffer) → flusher goroutine → gob-encoded file write.
// Drain path: completed segments → drain goroutine → rdb.Add() → DuckDB (background).
//
// Key design properties:
//   - Zero per-record heap alloc: gob.Encoder writes directly to bufio.Writer; binRecord reused.
//   - After segment close: curBuf=nil, curEnc=nil — buffers are GC-eligible immediately.
//   - Channel memory bounded: 32K cap × ~8KB avg record = ~256 MB worst case.
//
// BinSegWriter implements crawl.ResultWriter.
type BinSegWriter struct {
	segDir   string              // directory for binary segment files
	maxBytes int64               // rotate segment when it reaches this size
	rdb      *recrawler.ResultDB // drain destination (nil = no drain, segments left on disk)

	ch    chan recrawler.Result // primary write channel, buffered
	segCh chan string           // completed segment paths for drain goroutine

	// flusher state — accessed only by the flusher goroutine, no lock needed.
	cur      *os.File
	curBuf   *bufio.Writer
	curEnc   *gob.Encoder // one encoder per segment; nil when no segment is open
	curBytes int64
	curPath  string
	segNum   int
	jr       binRecord // reused record buffer; avoids a binRecord allocation per writeOne call

	written  atomic.Int64 // records written to segment files
	drained  atomic.Int64 // records successfully drained to DuckDB
	segCount atomic.Int32 // total segments created
	pendSeg  atomic.Int32 // segments queued for drain (not yet drained)

	wg sync.WaitGroup
}

// NewBinSegWriter creates a BinSegWriter that writes to segDir.
//
//   - maxMB: segment size threshold (0 → default 64 MB).
//   - rdb: the ResultDB to drain completed segments into (nil = accumulate on disk).
func NewBinSegWriter(segDir string, maxMB int, rdb *recrawler.ResultDB) (*BinSegWriter, error) {
	if err := os.MkdirAll(segDir, 0o755); err != nil {
		return nil, fmt.Errorf("bin writer: creating segment dir: %w", err)
	}
	if maxMB <= 0 {
		maxMB = binSegDefaultMB
	}
	w := &BinSegWriter{
		segDir:   segDir,
		maxBytes: int64(maxMB) * 1024 * 1024,
		rdb:      rdb,
		ch:       make(chan recrawler.Result, binChanCap),
		segCh:    make(chan string, binSegQueueCap),
	}
	w.wg.Add(2) // flusher + drainer
	go w.flusher()
	go w.drainer()
	return w, nil
}

// Add enqueues a result for writing. It blocks only when the 32K channel is full
// (which only occurs if the flusher goroutine cannot keep up with disk writes).
// Under normal operation this channel stays near-empty.
func (w *BinSegWriter) Add(r recrawler.Result) {
	w.ch <- r
}

// Flush is a no-op for BinSegWriter; the flusher goroutine maintains continuous writes.
func (w *BinSegWriter) Flush(_ context.Context) error { return nil }

// Close drains the write channel, rotates the final segment, and waits for the drain
// goroutine to finish. Returns only after all records are written to disk and drained
// to the destination ResultDB (if configured).
func (w *BinSegWriter) Close() error {
	close(w.ch)  // signals flusher to finish; flusher will close(segCh) on exit
	w.wg.Wait()  // waits for both flusher and drainer to complete
	return nil
}

// Written returns the total number of records serialized to segment files.
func (w *BinSegWriter) Written() int64 { return w.written.Load() }

// Drained returns the total number of records drained to DuckDB.
func (w *BinSegWriter) Drained() int64 { return w.drained.Load() }

// PendingSegs returns the number of segment files waiting to be drained.
func (w *BinSegWriter) PendingSegs() int32 { return w.pendSeg.Load() }

// SegCount returns the total number of segment files created.
func (w *BinSegWriter) SegCount() int32 { return w.segCount.Load() }

// ChanFill returns the fractional fill level of the write channel [0.0, 1.0].
// Values near 1.0 indicate the flusher cannot keep up (disk I/O bottleneck).
func (w *BinSegWriter) ChanFill() float64 {
	c := cap(w.ch)
	if c == 0 {
		return 0
	}
	return float64(len(w.ch)) / float64(c)
}

// ── flusher ──────────────────────────────────────────────────────────────────

// flusher drains w.ch, encodes each Result as a gob record, and writes to
// the current segment file. When the segment reaches maxBytes, it's closed and
// its path sent to segCh for the drain goroutine.
func (w *BinSegWriter) flusher() {
	defer func() {
		w.closeCurrentSeg() // flush + close the final segment
		close(w.segCh)      // signals drainer that no more segments are coming
		w.wg.Done()
	}()
	for r := range w.ch {
		w.writeOne(r)
	}
}

func (w *BinSegWriter) writeOne(r recrawler.Result) {
	// Rotate if current segment is at capacity or not yet opened.
	if w.cur == nil || w.curBytes >= w.maxBytes {
		w.rotateSeg()
		if w.cur == nil {
			return // failed to open new segment — skip record rather than block
		}
	}

	// Reuse w.jr to avoid a binRecord allocation per record.
	jr := &w.jr
	jr.URL           = binSanitize(r.URL)
	jr.StatusCode    = r.StatusCode
	jr.ContentType   = binSanitize(r.ContentType)
	jr.ContentLength = r.ContentLength
	jr.Body          = binSanitize(r.Body)
	jr.Title         = binSanitize(r.Title)
	jr.Description   = binSanitize(r.Description)
	jr.Language      = binSanitize(r.Language)
	jr.Domain        = binSanitize(r.Domain)
	jr.RedirectURL   = binSanitize(r.RedirectURL)
	jr.FetchTimeMs   = r.FetchTimeMs
	jr.CrawledAtMs   = r.CrawledAt.UnixMilli()
	jr.Error         = binSanitize(r.Error)
	jr.Failed        = r.Error != ""

	// Track bytes written to the bufio buffer for segment rotation.
	// b0/b1 are bytes currently in the buffer before/after Encode.
	// If b1 < b0, bufio auto-flushed during Encode; adjust accordingly.
	b0 := w.curBuf.Buffered()
	if err := w.curEnc.Encode(jr); err != nil {
		return
	}
	b1 := w.curBuf.Buffered()
	if b1 >= b0 {
		w.curBytes += int64(b1 - b0)
	} else {
		// bufio flushed between b0 and b1; full flush of b0 bytes + new b1 bytes
		w.curBytes += int64(w.curBuf.Size()-b0) + int64(b1)
	}
	w.written.Add(1)
}

// rotateSeg closes the current segment (if any) and opens a new one.
func (w *BinSegWriter) rotateSeg() {
	w.closeCurrentSeg()
	w.segNum++
	path := filepath.Join(w.segDir, fmt.Sprintf("seg_%06d.bseg", w.segNum))
	f, err := os.Create(path)
	if err != nil {
		fmt.Fprintf(os.Stderr, "[binwriter] failed to create segment %s: %v\n", path, err)
		w.cur = nil
		return
	}
	w.cur = f
	w.curBuf = bufio.NewWriterSize(f, binFlushBufSize)
	w.curEnc = gob.NewEncoder(w.curBuf) // encoder writes directly to bufio, no intermediate alloc
	w.curBytes = 0
	w.curPath = path
	w.segCount.Add(1)
}

// closeCurrentSeg flushes and closes the current segment file, then queues its path
// for the drain goroutine. Idempotent: safe to call when w.cur == nil.
func (w *BinSegWriter) closeCurrentSeg() {
	if w.cur == nil {
		return
	}
	w.curBuf.Flush()
	w.cur.Close()
	path := w.curPath
	w.cur = nil
	w.curBuf = nil
	w.curEnc = nil // release gob encoder's internal buffer (GC-eligible immediately)

	if w.curBytes > 0 {
		w.pendSeg.Add(1)
		w.segCh <- path // may block if drain is 16+ segments behind (expected: never)
	}
	w.curBytes = 0
}

// ── drainer ──────────────────────────────────────────────────────────────────

// drainer reads completed segment paths from segCh and drains each one into the
// destination ResultDB. Segment files are deleted after successful drain.
func (w *BinSegWriter) drainer() {
	defer w.wg.Done()
	for segPath := range w.segCh {
		count := w.drainSeg(segPath)
		w.drained.Add(count)
		w.pendSeg.Add(-1)
	}
}

// drainSeg reads a binary segment file (.bseg), calls rdb.Add for each record, then
// deletes the file. Returns the number of records successfully decoded.
func (w *BinSegWriter) drainSeg(path string) int64 {
	defer os.Remove(path) // always delete — even on partial read

	if w.rdb == nil {
		return 0 // drain disabled, just clean up the file
	}

	f, err := os.Open(path)
	if err != nil {
		fmt.Fprintf(os.Stderr, "[binwriter] drain open %s: %v\n", path, err)
		return 0
	}
	defer f.Close()

	dec := gob.NewDecoder(f)
	var rec binRecord
	var count int64
	for {
		if err := dec.Decode(&rec); err != nil {
			break // EOF or corrupt record
		}
		w.rdb.Add(rec.toResult())
		count++
	}

	// Flush any accumulated batch in the ResultDB shards for this segment.
	w.rdb.Flush(context.Background())
	return count
}

// ── helpers ───────────────────────────────────────────────────────────────────

// binSanitize removes null bytes and invalid UTF-8 sequences.
// Mirrors recrawler.sanitizeStr but accessible in this package.
func binSanitize(s string) string {
	if s == "" {
		return s
	}
	s = strings.ReplaceAll(s, "\x00", "")
	if !utf8.ValidString(s) {
		s = strings.ToValidUTF8(s, "")
	}
	return s
}
