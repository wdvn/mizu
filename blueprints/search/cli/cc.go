package cli

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/go-mizu/mizu/blueprints/search/pkg/cc"
	"github.com/go-mizu/mizu/blueprints/search/pkg/recrawler"
	"github.com/spf13/cobra"
)

// NewCC creates the cc command with subcommands for Common Crawl operations.
func NewCC() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "cc",
		Short: "Common Crawl index and WARC page extraction",
		Long: `Download, index, and extract pages from Common Crawl archives.

Supports the columnar index (parquet), CDXJ index, and WARC file extraction
via byte-range requests for high-throughput page retrieval.

Smart caching:
  --sample N    Download only N parquet files (evenly spaced) instead of all ~900
  --remote      Query parquet directly from S3 (zero disk, slower)
  Manifests, crawl lists, and latest crawl ID are cached for 24h in $HOME/data/common-crawl/cache.json

Subcommands:
  crawls   List available Common Crawl datasets
  parquet  List/download/import columnar-index parquet files
  index    Download + import columnar index to DuckDB
  stats    Show index statistics
  query    Query index for matching URLs (local or remote)
  fetch    High-throughput page extraction from WARC files
  recrawl  CC index → URL extraction → recrawl from origin servers
  warc     Fetch and display a single WARC record
  url      Lookup a URL via CDX API

Examples:
  search cc crawls
  search cc parquet list                           # defaults: latest crawl + --subset warc
  search cc parquet list --subset all              # list all subsets for latest crawl
  search cc parquet download --file 0              # manifest index on latest crawl
  search cc parquet import --file ~/data/common-crawl/.../part-00000.parquet
  search cc index --crawl CC-MAIN-2026-04 --sample 5
  search cc stats --crawl CC-MAIN-2026-04
  search cc query --crawl CC-MAIN-2026-04 --lang eng --status 200 --limit 100
  search cc query --crawl CC-MAIN-2026-04 --remote --domain example.com --limit 10
  search cc fetch --crawl CC-MAIN-2026-04 --lang eng --mime text/html --limit 1000000
  search cc recrawl --last --status-only --workers 100000
  search cc warc --file crawl-data/CC-MAIN-2026-04/... --offset 12345 --length 6789
  search cc url --crawl CC-MAIN-2026-04 --url https://example.com`,
		RunE: func(cmd *cobra.Command, args []string) error {
			return cmd.Help()
		},
	}

	cmd.AddCommand(newCCCrawls())
	cmd.AddCommand(newCCParquet())
	cmd.AddCommand(newCCIndex())
	cmd.AddCommand(newCCStats())
	cmd.AddCommand(newCCQuery())
	cmd.AddCommand(newCCFetch())
	cmd.AddCommand(newCCWarc())
	cmd.AddCommand(newCCURL())
	cmd.AddCommand(newCCRecrawl())
	cmd.AddCommand(newCCVerify())
	cmd.AddCommand(newCCSite())

	return cmd
}

// ── cc crawls ──────────────────────────────────────────────

func newCCCrawls() *cobra.Command {
	var (
		search  string
		limit   int
		noCache bool
	)

	cmd := &cobra.Command{
		Use:   "crawls",
		Short: "List available Common Crawl datasets",
		RunE: func(cmd *cobra.Command, args []string) error {
			return runCCCrawls(cmd.Context(), search, limit, noCache)
		},
	}

	cmd.Flags().StringVar(&search, "search", "", "Filter crawls by ID")
	cmd.Flags().IntVar(&limit, "limit", 20, "Max crawls to display")
	cmd.Flags().BoolVar(&noCache, "no-cache", false, "Bypass cache")

	return cmd
}

func runCCCrawls(ctx context.Context, search string, limit int, noCache bool) error {
	fmt.Println(Banner())
	fmt.Println(subtitleStyle.Render("Common Crawl Datasets"))
	fmt.Println()

	cfg := cc.DefaultConfig()
	cache := cc.NewCache(cfg.DataDir)

	// Try cache first
	var crawls []cc.Crawl
	if !noCache {
		if cd := cache.Load(); cache.IsFresh(cd) && len(cd.Crawls) > 0 {
			crawls = cd.Crawls
			fmt.Println(labelStyle.Render("  (cached)"))
		}
	}

	if len(crawls) == 0 {
		client := cc.NewClient("", 4)
		var err error
		crawls, err = client.ListCrawls(ctx)
		if err != nil {
			return fmt.Errorf("listing crawls: %w", err)
		}

		// Update cache
		cd := cache.Load()
		if cd == nil {
			cd = &cc.CacheData{}
		}
		cd.Crawls = crawls
		for _, c := range crawls {
			if c.ID > cd.LatestCrawlID {
				cd.LatestCrawlID = c.ID
			}
		}
		cd.FetchedAt = time.Now()
		cache.Save(cd)
	}

	// Filter
	if search != "" {
		var filtered []cc.Crawl
		for _, c := range crawls {
			if strings.Contains(strings.ToLower(c.ID), strings.ToLower(search)) ||
				strings.Contains(strings.ToLower(c.Name), strings.ToLower(search)) {
				filtered = append(filtered, c)
			}
		}
		crawls = filtered
	}

	if limit > 0 && len(crawls) > limit {
		crawls = crawls[:limit]
	}

	// Check local data
	dataDir := cfg.DataDir

	fmt.Printf("  %-20s %-30s %-12s %-12s %s\n",
		"ID", "Name", "From", "To", "Local")
	fmt.Println(strings.Repeat("─", 100))

	for _, c := range crawls {
		fromStr := "---"
		toStr := "---"
		if !c.From.IsZero() {
			fromStr = c.From.Format("2006-01-02")
		}
		if !c.To.IsZero() {
			toStr = c.To.Format("2006-01-02")
		}

		localStatus := labelStyle.Render("---")
		crawlDir := filepath.Join(dataDir, c.ID)
		if fi, err := os.Stat(crawlDir); err == nil && fi.IsDir() {
			if _, err := os.Stat(filepath.Join(crawlDir, "index.duckdb")); err == nil {
				localStatus = successStyle.Render("indexed")
			} else {
				tmpCfg := cc.DefaultConfig()
				tmpCfg.CrawlID = c.ID
				if files, ferr := cc.LocalParquetFiles(tmpCfg); ferr == nil && len(files) > 0 {
					localStatus = infoStyle.Render(fmt.Sprintf("%d parquet", len(files)))
				} else {
					entries, _ := os.ReadDir(filepath.Join(crawlDir, "index"))
					if len(entries) > 0 {
						localStatus = infoStyle.Render(fmt.Sprintf("%d entries", len(entries)))
					} else {
						localStatus = warningStyle.Render("dir only")
					}
				}
			}
		}

		fmt.Printf("  %-20s %-30s %-12s %-12s %s\n",
			c.ID, c.Name, fromStr, toStr, localStatus)
	}

	fmt.Printf("\n  %s\n", labelStyle.Render(fmt.Sprintf("Showing %d crawls", len(crawls))))
	return nil
}

// ── cc index ──────────────────────────────────────────────

func newCCIndex() *cobra.Command {
	var (
		crawlID    string
		importOnly bool
		workers    int
		sample     int
	)

	cmd := &cobra.Command{
		Use:   "index",
		Short: "Download + import columnar index to DuckDB",
		Long: `Download columnar index parquet files and import to DuckDB.

Use --sample N to download only N evenly-spaced parquet files instead of all ~900.
Each file is ~220MB and contains ~2.5M records. For most queries, 1-10 files suffice.

  --sample 1   ~220MB disk, ~2.5M records  (quick exploration)
  --sample 5   ~1.1GB disk, ~12.5M records (representative sample)
  --sample 20  ~4.4GB disk, ~50M records   (substantial coverage)
  --sample 0   ~200GB disk, ~2.3B records  (full index)`,
		RunE: func(cmd *cobra.Command, args []string) error {
			return runCCIndex(cmd.Context(), crawlID, importOnly, workers, sample)
		},
	}

	cmd.Flags().StringVar(&crawlID, "crawl", "CC-MAIN-2026-04", "Crawl ID")
	cmd.Flags().BoolVar(&importOnly, "import-only", false, "Skip download, import existing parquet files")
	cmd.Flags().IntVar(&workers, "workers", 10, "Concurrent download workers")
	cmd.Flags().IntVar(&sample, "sample", 5, "Download only N parquet files (0 = all ~900)")

	return cmd
}

func runCCIndex(ctx context.Context, crawlID string, importOnly bool, workers, sample int) error {
	fmt.Println(Banner())
	fmt.Println(subtitleStyle.Render("Common Crawl Index"))
	fmt.Println()

	cfg := cc.DefaultConfig()
	cfg.CrawlID = crawlID
	cfg.IndexWorkers = workers

	client := cc.NewClient(cfg.BaseURL, cfg.TransportShards)

	if !importOnly {
		if sample > 0 {
			fmt.Printf("  %s\n", infoStyle.Render(fmt.Sprintf(
				"Downloading %d sampled parquet files for %s (~%dMB)...",
				sample, crawlID, sample*220)))
		} else {
			fmt.Printf("  %s\n", infoStyle.Render(fmt.Sprintf(
				"Downloading full columnar index for %s (~200GB)...", crawlID)))
		}
		fmt.Println(labelStyle.Render(fmt.Sprintf("  -> %s", cfg.IndexDir())))

		start := time.Now()
		dlReporter := newCCDownloadReporter()
		err := cc.DownloadIndex(ctx, client, cfg, sample, dlReporter.Callback)
		if err != nil {
			return fmt.Errorf("downloading index: %w", err)
		}
		fmt.Println(successStyle.Render(fmt.Sprintf("  Download complete in %s", time.Since(start).Truncate(time.Second))))
	}

	// Import to DuckDB
	fmt.Println(infoStyle.Render("Importing parquet to per-file DuckDB + catalog..."))
	fmt.Println(labelStyle.Render(fmt.Sprintf("  Parquet root: %s", cfg.IndexDir())))
	fmt.Println(labelStyle.Render(fmt.Sprintf("  Shards:      %s", cfg.IndexShardDir())))
	fmt.Println(labelStyle.Render(fmt.Sprintf("  Catalog:     %s", cfg.IndexDBPath())))

	importStart := time.Now()
	importReporter := newCCImportReporter()
	rowCount, err := cc.ImportIndexWithProgress(ctx, cfg, importReporter.Callback)
	if err != nil {
		return fmt.Errorf("importing index: %w", err)
	}

	fmt.Println(successStyle.Render(fmt.Sprintf("  Imported %s rows in %s",
		ccFmtInt64(rowCount), time.Since(importStart).Truncate(time.Second))))
	return nil
}

// ── cc stats ──────────────────────────────────────────────

func newCCStats() *cobra.Command {
	var crawlID string

	cmd := &cobra.Command{
		Use:   "stats",
		Short: "Show index statistics",
		RunE: func(cmd *cobra.Command, args []string) error {
			return runCCStats(cmd.Context(), crawlID)
		},
	}

	cmd.Flags().StringVar(&crawlID, "crawl", "CC-MAIN-2026-04", "Crawl ID")

	return cmd
}

func runCCStats(ctx context.Context, crawlID string) error {
	fmt.Println(Banner())
	fmt.Println(subtitleStyle.Render("Common Crawl Index Statistics"))
	fmt.Println()

	cfg := cc.DefaultConfig()
	cfg.CrawlID = crawlID

	dbPath := cfg.IndexDBPath()
	if _, err := os.Stat(dbPath); err != nil {
		return fmt.Errorf("index not found at %s — run 'cc index' first", dbPath)
	}

	summary, err := cc.IndexStats(ctx, dbPath)
	if err != nil {
		return fmt.Errorf("loading stats: %w", err)
	}

	fmt.Printf("  Crawl:           %s\n", infoStyle.Render(crawlID))
	fmt.Printf("  Index:           %s\n", labelStyle.Render(dbPath))
	fmt.Println()
	fmt.Printf("  Total records:   %s\n", ccFmtInt64(summary.TotalRecords))
	fmt.Printf("  Unique hosts:    %s\n", ccFmtInt64(summary.UniqueHosts))
	fmt.Printf("  Unique domains:  %s\n", ccFmtInt64(summary.UniqueDomains))

	// Status distribution
	fmt.Println()
	fmt.Println(infoStyle.Render("  HTTP Status Distribution:"))
	for status, count := range summary.StatusDist {
		fmt.Printf("    %d: %s\n", status, ccFmtInt64(count))
	}

	// MIME distribution
	fmt.Println()
	fmt.Println(infoStyle.Render("  Content Type Distribution:"))
	for mime, count := range summary.MimeDist {
		fmt.Printf("    %-40s %s\n", mime, ccFmtInt64(count))
	}

	// TLD distribution
	fmt.Println()
	fmt.Println(infoStyle.Render("  Top TLDs:"))
	type tldCount struct {
		tld   string
		count int64
	}
	var tlds []tldCount
	for t, c := range summary.TLDDist {
		tlds = append(tlds, tldCount{t, c})
	}
	sort.Slice(tlds, func(i, j int) bool { return tlds[i].count > tlds[j].count })
	for _, t := range tlds {
		fmt.Printf("    %-10s %s\n", t.tld, ccFmtInt64(t.count))
	}

	return nil
}

// ── cc query ──────────────────────────────────────────────

func newCCQuery() *cobra.Command {
	var (
		crawlID string
		lang    string
		mime    string
		status  int
		domain  string
		tld     string
		limit   int
		count   bool
		remote  bool
	)

	cmd := &cobra.Command{
		Use:   "query",
		Short: "Query index for matching URLs",
		Long: `Query the columnar index for URLs matching your criteria.

By default queries the local DuckDB index (requires 'cc index' first).
Use --remote to query parquet files directly from S3 — no local download needed,
but slower (network-bound). Ideal for quick lookups on limited disk.

Examples:
  search cc query --lang eng --status 200 --limit 100
  search cc query --remote --domain example.com --limit 10
  search cc query --tld com --mime text/html --count`,
		RunE: func(cmd *cobra.Command, args []string) error {
			return runCCQuery(cmd.Context(), crawlID, lang, mime, status, domain, tld, limit, count, remote)
		},
	}

	cmd.Flags().StringVar(&crawlID, "crawl", "CC-MAIN-2026-04", "Crawl ID")
	cmd.Flags().StringVar(&lang, "lang", "", "Language filter (e.g. eng)")
	cmd.Flags().StringVar(&mime, "mime", "", "MIME type filter (e.g. text/html)")
	cmd.Flags().IntVar(&status, "status", 0, "HTTP status filter (e.g. 200)")
	cmd.Flags().StringVar(&domain, "domain", "", "Domain filter")
	cmd.Flags().StringVar(&tld, "tld", "", "TLD filter (e.g. com)")
	cmd.Flags().IntVar(&limit, "limit", 100, "Max results")
	cmd.Flags().BoolVar(&count, "count", false, "Show count only")
	cmd.Flags().BoolVar(&remote, "remote", false, "Query S3 parquet directly (no local download needed)")

	return cmd
}

func runCCQuery(ctx context.Context, crawlID, lang, mime string, status int, domain, tld string, limit int, countOnly, remote bool) error {
	cfg := cc.DefaultConfig()
	cfg.CrawlID = crawlID

	filter := cc.IndexFilter{Limit: limit}
	if lang != "" {
		filter.Languages = strings.Split(lang, ",")
	}
	if mime != "" {
		filter.MimeTypes = strings.Split(mime, ",")
	}
	if status > 0 {
		filter.StatusCodes = []int{status}
	}
	if domain != "" {
		filter.Domains = strings.Split(domain, ",")
	}
	if tld != "" {
		filter.TLDs = strings.Split(tld, ",")
	}

	if remote {
		fmt.Println(infoStyle.Render("Querying S3 parquet directly (no local index needed)..."))
		pointers, err := cc.QueryRemoteParquet(ctx, cfg, filter)
		if err != nil {
			return fmt.Errorf("remote query: %w", err)
		}
		if countOnly {
			fmt.Printf("  Matching records: %s\n", ccFmtInt64(int64(len(pointers))))
			return nil
		}
		return displayQueryResults(pointers)
	}

	// Local query
	dbPath := cfg.IndexDBPath()
	if _, err := os.Stat(dbPath); err != nil {
		return fmt.Errorf("index not found — run 'cc index' first (or use --remote)")
	}

	if countOnly {
		n, err := cc.QueryIndexCount(ctx, dbPath, filter)
		if err != nil {
			return err
		}
		fmt.Printf("  Matching records: %s\n", ccFmtInt64(n))
		return nil
	}

	pointers, err := cc.QueryIndex(ctx, dbPath, filter)
	if err != nil {
		return err
	}
	return displayQueryResults(pointers)
}

func displayQueryResults(pointers []cc.WARCPointer) error {
	fmt.Printf("  %-80s %-6s %-20s %s\n", "URL", "Status", "Content-Type", "Language")
	fmt.Println(strings.Repeat("-", 140))

	for _, p := range pointers {
		url := p.URL
		if len(url) > 80 {
			url = url[:77] + "..."
		}
		ct := p.ContentType
		if len(ct) > 20 {
			ct = ct[:17] + "..."
		}
		lang := p.Language
		if len(lang) > 10 {
			lang = lang[:10]
		}
		fmt.Printf("  %-80s %-6d %-20s %s\n", url, p.FetchStatus, ct, lang)
	}

	fmt.Printf("\n  %s\n", labelStyle.Render(fmt.Sprintf("Showing %d results", len(pointers))))
	return nil
}

// ── cc fetch ──────────────────────────────────────────────

func newCCFetch() *cobra.Command {
	var (
		crawlID string
		lang    string
		mime    string
		status  int
		domain  string
		tld     string
		limit   int
		workers int
		timeout int
		resume  bool
		remote  bool
	)

	cmd := &cobra.Command{
		Use:   "fetch",
		Short: "High-throughput page extraction from WARC files",
		Long: `Fetch pages from Common Crawl WARC files via byte-range requests.

First queries the index for matching URLs, then fetches WARC records
in parallel from the CDN. Extracted pages are stored in sharded DuckDB files.

Use --remote to query the index from S3 directly (no local parquet needed).

Examples:
  search cc fetch --lang eng --mime text/html --limit 10000
  search cc fetch --remote --domain example.com --limit 100
  search cc fetch --status 200 --workers 5000 --limit 1000000`,
		RunE: func(cmd *cobra.Command, args []string) error {
			return runCCFetch(cmd.Context(), crawlID, lang, mime, status, domain, tld, limit, workers, timeout, resume, remote)
		},
	}

	cmd.Flags().StringVar(&crawlID, "crawl", "CC-MAIN-2026-04", "Crawl ID")
	cmd.Flags().StringVar(&lang, "lang", "", "Language filter (e.g. eng)")
	cmd.Flags().StringVar(&mime, "mime", "text/html", "MIME type filter")
	cmd.Flags().IntVar(&status, "status", 200, "HTTP status filter")
	cmd.Flags().StringVar(&domain, "domain", "", "Domain filter")
	cmd.Flags().StringVar(&tld, "tld", "", "TLD filter (e.g. com)")
	cmd.Flags().IntVar(&limit, "limit", 10000, "Max records to fetch")
	cmd.Flags().IntVar(&workers, "workers", 5000, "Concurrent fetch workers")
	cmd.Flags().IntVar(&timeout, "timeout", 30000, "Per-request timeout in ms")
	cmd.Flags().BoolVar(&resume, "resume", false, "Skip already-fetched records")
	cmd.Flags().BoolVar(&remote, "remote", false, "Query S3 index directly (no local parquet needed)")

	return cmd
}

func runCCFetch(ctx context.Context, crawlID, lang, mime string, status int, domain, tld string,
	limit, workers, timeout int, resume, remote bool) error {

	fmt.Println(Banner())
	fmt.Println(subtitleStyle.Render("Common Crawl WARC Page Extraction"))
	fmt.Println()

	cfg := cc.DefaultConfig()
	cfg.CrawlID = crawlID
	cfg.Workers = workers
	cfg.Timeout = time.Duration(timeout) * time.Millisecond
	cfg.Resume = resume

	// Build filter
	filter := cc.IndexFilter{Limit: limit}
	if lang != "" {
		filter.Languages = strings.Split(lang, ",")
	}
	if mime != "" {
		filter.MimeTypes = strings.Split(mime, ",")
	}
	if status > 0 {
		filter.StatusCodes = []int{status}
	}
	if domain != "" {
		filter.Domains = strings.Split(domain, ",")
	}
	if tld != "" {
		filter.TLDs = strings.Split(tld, ",")
	}

	// Query WARC pointers (local or remote)
	var pointers []cc.WARCPointer
	var err error

	if remote {
		fmt.Println(infoStyle.Render("Querying S3 parquet index directly..."))
		pointers, err = cc.QueryRemoteParquet(ctx, cfg, filter)
	} else {
		dbPath := cfg.IndexDBPath()
		if _, err := os.Stat(dbPath); err != nil {
			return fmt.Errorf("index not found — run 'cc index' first (or use --remote)")
		}

		fmt.Println(infoStyle.Render("Querying local index..."))
		totalCount, err2 := cc.QueryIndexCount(ctx, dbPath, filter)
		if err2 != nil {
			return fmt.Errorf("counting records: %w", err2)
		}
		fmt.Println(successStyle.Render(fmt.Sprintf("  %s matching records (fetching up to %s)",
			ccFmtInt64(totalCount), ccFmtInt64(int64(limit)))))

		pointers, err = cc.QueryIndex(ctx, dbPath, filter)
	}

	if err != nil {
		return fmt.Errorf("querying index: %w", err)
	}
	fmt.Println(successStyle.Render(fmt.Sprintf("  Loaded %s pointers", ccFmtInt64(int64(len(pointers))))))

	if len(pointers) == 0 {
		fmt.Println(warningStyle.Render("  No matching records found"))
		return nil
	}

	// Check for resume
	var skip map[string]bool
	if resume {
		fmt.Println(infoStyle.Render("Checking for previous results..."))
		skip, err = cc.LoadAlreadyFetched(ctx, cfg.ResultDir())
		if err != nil {
			fmt.Println(warningStyle.Render(fmt.Sprintf("  Could not load state: %v", err)))
		} else if len(skip) > 0 {
			fmt.Println(successStyle.Render(fmt.Sprintf("  Resuming: skipping %d already-fetched records", len(skip))))
		}
	}

	// Open result DB
	fmt.Println(infoStyle.Render("Opening result databases..."))
	rdb, err := cc.NewResultDB(cfg.ResultDir(), 8, cfg.BatchSize)
	if err != nil {
		return fmt.Errorf("opening result db: %w", err)
	}
	defer func() {
		if rdb != nil {
			_ = rdb.Close()
		}
	}()
	fmt.Println(successStyle.Render(fmt.Sprintf("  Results -> %s/ (8 shards)", cfg.ResultDir())))

	rdb.SetMeta(ctx, "crawl_id", crawlID)
	rdb.SetMeta(ctx, "started_at", time.Now().Format(time.RFC3339))
	rdb.SetMeta(ctx, "workers", fmt.Sprintf("%d", workers))

	// Create client and fetcher
	client := cc.NewClient(cfg.BaseURL, cfg.TransportShards)
	stats := cc.NewFetchStats(len(pointers), crawlID)
	fetcher := cc.NewFetcher(cfg, client, stats, rdb)

	fmt.Println()
	fmt.Println(infoStyle.Render(fmt.Sprintf("Starting fetch: %d workers, %v timeout, %d records",
		workers, cfg.Timeout, len(pointers))))
	fmt.Println()

	// Run with display
	err = cc.RunWithDisplay(ctx, fetcher, pointers, skip, stats)

	// Final flush
	rdb.Flush(ctx)
	rdb.SetMeta(ctx, "finished_at", time.Now().Format(time.RFC3339))

	if err != nil {
		fmt.Println(warningStyle.Render(fmt.Sprintf("Fetch finished with error: %v", err)))
	} else {
		fmt.Println(successStyle.Render("Fetch complete!"))
	}
	fmt.Println(labelStyle.Render(fmt.Sprintf("  Results: %s/", cfg.ResultDir())))
	fmt.Println()

	return err
}

// ── cc warc ──────────────────────────────────────────────

func newCCWarc() *cobra.Command {
	var (
		file   string
		offset int64
		length int64
	)

	cmd := &cobra.Command{
		Use:   "warc",
		Short: "Fetch and display a single WARC record",
		RunE: func(cmd *cobra.Command, args []string) error {
			return runCCWarc(cmd.Context(), file, offset, length)
		},
	}

	cmd.Flags().StringVar(&file, "file", "", "WARC file path (relative to CC base URL)")
	cmd.Flags().Int64Var(&offset, "offset", 0, "Byte offset")
	cmd.Flags().Int64Var(&length, "length", 0, "Byte length")
	cmd.MarkFlagRequired("file")
	cmd.MarkFlagRequired("offset")
	cmd.MarkFlagRequired("length")

	return cmd
}

func runCCWarc(ctx context.Context, file string, offset, length int64) error {
	client := cc.NewClient("", 4)

	ptr := cc.WARCPointer{
		WARCFilename: file,
		RecordOffset: offset,
		RecordLength: length,
	}

	fmt.Println(infoStyle.Render(fmt.Sprintf("Fetching WARC record from %s [%d-%d]...", file, offset, offset+length-1)))

	data, err := client.FetchWARCRecord(ctx, 0, ptr)
	if err != nil {
		return fmt.Errorf("fetching record: %w", err)
	}

	resp, err := cc.ParseWARCRecord(data)
	if err != nil {
		return fmt.Errorf("parsing record: %w", err)
	}

	fmt.Println()
	fmt.Println(successStyle.Render("WARC Record:"))
	fmt.Printf("  Type:        %s\n", resp.WARCType)
	fmt.Printf("  Target URI:  %s\n", resp.TargetURI)
	fmt.Printf("  Date:        %s\n", resp.Date.Format(time.RFC3339))
	fmt.Printf("  Record ID:   %s\n", resp.RecordID)
	fmt.Printf("  HTTP Status: %d\n", resp.HTTPStatus)

	fmt.Println()
	fmt.Println(infoStyle.Render("HTTP Headers:"))
	for k, v := range resp.HTTPHeaders {
		fmt.Printf("  %s: %s\n", k, v)
	}

	fmt.Println()
	fmt.Printf("  %s\n", infoStyle.Render(fmt.Sprintf("Body (%d bytes):", len(resp.Body))))
	body := string(resp.Body)
	if len(body) > 2000 {
		body = body[:2000] + "\n... (truncated)"
	}
	fmt.Println(body)

	return nil
}

// ── cc url ──────────────────────────────────────────────

func newCCURL() *cobra.Command {
	var (
		crawlID   string
		targetURL string
		domain    string
		limit     int
	)

	cmd := &cobra.Command{
		Use:   "url",
		Short: "Lookup a URL via CDX API (zero disk, network-only)",
		Long: `Lookup URLs in Common Crawl via the CDX API.
This is the lightest-weight option: uses zero disk space, queries the CC API directly.

Examples:
  search cc url --url https://example.com
  search cc url --domain example.com --limit 50`,
		RunE: func(cmd *cobra.Command, args []string) error {
			return runCCURL(cmd.Context(), crawlID, targetURL, domain, limit)
		},
	}

	cmd.Flags().StringVar(&crawlID, "crawl", "CC-MAIN-2026-04", "Crawl ID")
	cmd.Flags().StringVar(&targetURL, "url", "", "URL to lookup")
	cmd.Flags().StringVar(&domain, "domain", "", "Domain to lookup (all URLs)")
	cmd.Flags().IntVar(&limit, "limit", 20, "Max results for domain lookup")

	return cmd
}

func runCCURL(ctx context.Context, crawlID, targetURL, domain string, limit int) error {
	if targetURL == "" && domain == "" {
		return fmt.Errorf("--url or --domain is required")
	}

	var entries []cc.CDXJEntry
	var err error

	if targetURL != "" {
		fmt.Println(infoStyle.Render(fmt.Sprintf("Looking up %s in %s...", targetURL, crawlID)))
		entries, err = cc.LookupURL(ctx, crawlID, targetURL)
	} else {
		fmt.Println(infoStyle.Render(fmt.Sprintf("Looking up %s/* in %s...", domain, crawlID)))
		entries, err = cc.LookupDomain(ctx, crawlID, domain, limit)
	}

	if err != nil {
		return fmt.Errorf("CDX lookup: %w", err)
	}

	if len(entries) == 0 {
		fmt.Println(warningStyle.Render("  No results found"))
		return nil
	}

	fmt.Println()
	fmt.Printf("  %-80s %-6s %-20s %s\n", "URL", "Status", "MIME", "Timestamp")
	fmt.Println(strings.Repeat("-", 130))

	for _, e := range entries {
		url := e.URL
		if len(url) > 80 {
			url = url[:77] + "..."
		}
		fmt.Printf("  %-80s %-6s %-20s %s\n", url, e.Status, e.Mime, e.Timestamp)
	}

	fmt.Printf("\n  %s\n", labelStyle.Render(fmt.Sprintf("Found %d results", len(entries))))
	return nil
}

// ── cc recrawl ──────────────────────────────────────────────

func newCCRecrawl() *cobra.Command {
	var (
		crawlID           string
		sample            int
		last              bool
		file              string
		importOnly        bool
		workers           int
		dnsWorkers        int
		dnsTimeout        int
		timeout           int
		statusOnly        bool
		headOnly          bool
		transportShards   int
		maxConnsPerDomain int
		dnsPrefetch       bool
		resume            bool
		lang              string
		mime              string
		status            int
		domain            string
		tld               string
		limit             int
		batchSize         int
	)

	cmd := &cobra.Command{
		Use:   "recrawl",
		Short: "Download CC index parquet, extract URLs, recrawl from origin servers",
		Long: `Combined pipeline: CC index → URL extraction → high-throughput recrawl.

Three modes for loading the CC index:

  --last         Download the LAST (latest) parquet file, query directly via
                 read_parquet() — zero DuckDB import, fastest startup (recommended)
  --file X       Use parquet selector or local path, query directly via read_parquet()
                 selectors: N (warc subset index), w:N, m:N (manifest index)
  --sample N     Download N evenly-spaced parquet files, import to DuckDB (legacy)

Pipeline:
  1. Download parquet file(s) from CC columnar index (~220MB each, ~2.5M URLs)
  2. Extract URLs matching your filters (direct parquet query or DuckDB)
  3. Batch DNS pre-resolution (20K workers)
  4. HTTP recrawl from origin servers (target: 100K pages/s)

This fetches FRESH content from origin servers (not cached WARC data).
Use 'cc fetch' instead if you want pre-crawled content from WARC files.

Examples:
  search cc recrawl --last --status-only
  search cc recrawl --last --status-only --workers 100000
  search cc recrawl --file 0 --status-only --limit 1000          # warc index, latest crawl by default
  search cc recrawl --file m:600 --status-only --limit 1000      # manifest index
  search cc recrawl --file /path/to/local.parquet --status-only
  search cc recrawl --sample 1 --status-only --workers 100000
  search cc recrawl --sample 1 --lang eng --mime text/html --workers 200
  search cc recrawl --import-only --resume --workers 100000`,
		RunE: func(cmd *cobra.Command, args []string) error {
			filter := cc.IndexFilter{}
			if lang != "" {
				filter.Languages = strings.Split(lang, ",")
			}
			if mime != "" {
				filter.MimeTypes = strings.Split(mime, ",")
			}
			if status > 0 {
				filter.StatusCodes = []int{status}
			}
			if domain != "" {
				filter.Domains = strings.Split(domain, ",")
			}
			if tld != "" {
				filter.TLDs = strings.Split(tld, ",")
			}
			if limit > 0 {
				filter.Limit = limit
			}

			return runCCRecrawl(cmd.Context(), ccRecrawlOpts{
				crawlID:           crawlID,
				sample:            sample,
				last:              last,
				file:              file,
				importOnly:        importOnly,
				filter:            filter,
				workers:           workers,
				dnsWorkers:        dnsWorkers,
				dnsTimeout:        dnsTimeout,
				timeout:           timeout,
				statusOnly:        statusOnly,
				headOnly:          headOnly,
				transportShards:   transportShards,
				maxConnsPerDomain: maxConnsPerDomain,
				dnsPrefetch:       dnsPrefetch,
				resume:            resume,
				batchSize:         batchSize,
			})
		},
	}

	cmd.Flags().StringVar(&crawlID, "crawl", "", "Crawl ID (default: latest cached/latest available)")
	cmd.Flags().BoolVar(&last, "last", false, "Download last (latest) parquet file, query directly (recommended)")
	cmd.Flags().StringVar(&file, "file", "", "Parquet selector/path: N (warc index), w:N, m:N, or local path")
	cmd.Flags().IntVar(&sample, "sample", 1, "Number of parquet files to download (0=all, legacy mode)")
	cmd.Flags().BoolVar(&importOnly, "import-only", false, "Skip parquet download, use existing DuckDB index")
	cmd.Flags().IntVar(&workers, "workers", 50000, "HTTP fetch workers")
	cmd.Flags().IntVar(&dnsWorkers, "dns-workers", 2000, "DNS resolution workers")
	cmd.Flags().IntVar(&dnsTimeout, "dns-timeout", 2000, "DNS timeout in ms")
	cmd.Flags().IntVar(&timeout, "timeout", 5000, "HTTP timeout in ms")
	cmd.Flags().BoolVar(&statusOnly, "status-only", false, "Only check HTTP status (fastest)")
	cmd.Flags().BoolVar(&headOnly, "head-only", false, "HEAD requests only")
	cmd.Flags().IntVar(&transportShards, "transport-shards", 64, "HTTP transport pool shards")
	cmd.Flags().IntVar(&maxConnsPerDomain, "max-conns-per-domain", 8, "Max concurrent connections per domain (prevents server flooding)")
	cmd.Flags().BoolVar(&dnsPrefetch, "dns-prefetch", true, "Batch DNS pre-resolution")
	cmd.Flags().BoolVar(&resume, "resume", false, "Skip already-crawled URLs")
	cmd.Flags().StringVar(&lang, "lang", "", "Language filter (e.g. eng)")
	cmd.Flags().StringVar(&mime, "mime", "", "MIME type filter (e.g. text/html)")
	cmd.Flags().IntVar(&status, "status", 200, "HTTP status filter from CC index")
	cmd.Flags().StringVar(&domain, "domain", "", "Domain filter")
	cmd.Flags().StringVar(&tld, "tld", "", "TLD filter (e.g. com)")
	cmd.Flags().IntVar(&limit, "limit", 0, "Max URLs to recrawl (0=all from index)")
	cmd.Flags().IntVar(&batchSize, "batch-size", 5000, "DB write batch size")

	return cmd
}

type ccRecrawlOpts struct {
	crawlID           string
	sample            int
	last              bool
	file              string
	importOnly        bool
	filter            cc.IndexFilter
	workers           int
	dnsWorkers        int
	dnsTimeout        int
	timeout           int
	statusOnly        bool
	headOnly          bool
	transportShards   int
	maxConnsPerDomain int
	dnsPrefetch       bool
	resume            bool
	batchSize         int
}

func runCCRecrawl(ctx context.Context, opts ccRecrawlOpts) error {
	fmt.Println(Banner())
	fmt.Println(subtitleStyle.Render("CC Index → Recrawl Pipeline"))
	fmt.Println()

	resolvedCrawlID, crawlNote, err := ccResolveCrawlID(ctx, opts.crawlID)
	if err != nil {
		return fmt.Errorf("resolving crawl: %w", err)
	}
	opts.crawlID = resolvedCrawlID

	ccCfg := cc.DefaultConfig()
	ccCfg.CrawlID = opts.crawlID

	if crawlNote != "" {
		fmt.Println(labelStyle.Render(fmt.Sprintf("Using defaults")))
		ccPrintDefaultCrawlResolution(opts.crawlID, crawlNote)
		fmt.Println()
	}

	// Determine mode: --last, --file, or --sample (legacy)
	mode := "sample" // default legacy mode
	if opts.last {
		mode = "last"
	} else if opts.file != "" {
		mode = "file"
	} else if opts.importOnly {
		mode = "sample" // import-only always uses DuckDB path
	}

	var seeds []recrawler.SeedURL
	var uniqueDomains int
	var sourceParquetPath string

	switch mode {
	case "last", "file":
		// ── Direct parquet mode (--last or --file) ────────────────
		var parquetPath string

		if mode == "last" {
			fmt.Println(infoStyle.Render(fmt.Sprintf("Step 1: Downloading LAST parquet file for %s (~220MB)...", opts.crawlID)))
			client := cc.NewClient(ccCfg.BaseURL, ccCfg.TransportShards)
			start := time.Now()
			dlReporter := newCCDownloadReporter()
			parquetPath, err = cc.DownloadOneIndexFile(ctx, client, ccCfg, -1, dlReporter.Callback)
			if err != nil {
				return fmt.Errorf("downloading last parquet: %w", err)
			}
			fmt.Println(successStyle.Render(fmt.Sprintf("  Download complete (%s)", time.Since(start).Truncate(time.Second))))
		} else {
			// --file: local path or selector (N, w:N, m:N)
			fmt.Println(infoStyle.Render(fmt.Sprintf("Step 1: Resolving parquet selector for %s...", opts.crawlID)))
			start := time.Now()
			dlReporter := newCCDownloadReporter()
			resolved, resolveErr := ccResolveRecrawlParquetFile(ctx, ccCfg, opts.file, dlReporter.Callback)
			if resolveErr != nil {
				return resolveErr
			}
			parquetPath = resolved.Path
			switch {
			case resolved.Source == "local":
				fmt.Println(labelStyle.Render(fmt.Sprintf("  Local file: %s", parquetPath)))
			case resolved.Cached:
				fmt.Println(successStyle.Render(fmt.Sprintf("  Using cached parquet (%s)", ccFmtBytes(resolved.SizeBytes))))
				fmt.Println(labelStyle.Render(fmt.Sprintf("  Selector: %s → %s", opts.file, resolved.Detail)))
				fmt.Println(labelStyle.Render(fmt.Sprintf("  Local:    %s", parquetPath)))
			default:
				fmt.Println(successStyle.Render(fmt.Sprintf("  Download complete (%s)", time.Since(start).Truncate(time.Second))))
				fmt.Println(labelStyle.Render(fmt.Sprintf("  Selector: %s → %s", opts.file, resolved.Detail)))
				fmt.Println(labelStyle.Render(fmt.Sprintf("  Local:    %s", parquetPath)))
			}
		}
		fmt.Println()
		sourceParquetPath = parquetPath

		// ── Step 2: Extract URLs directly from parquet (zero import) ──
		fmt.Println(infoStyle.Render("Step 2: Extracting URLs directly from parquet (zero DuckDB import)..."))
		printFilterSummary(opts.filter)

		extractStart := time.Now()
		seeds, uniqueDomains, err = cc.ExtractSeedURLsFromParquet(ctx, parquetPath, opts.filter)
		if err != nil {
			return fmt.Errorf("extracting seeds from parquet: %w", err)
		}
		if len(seeds) == 0 {
			fmt.Println(warningStyle.Render("  No matching URLs found in parquet"))
			return nil
		}
		fmt.Println(successStyle.Render(fmt.Sprintf("  %s URLs across %s domains (%s)",
			ccFmtInt64(int64(len(seeds))), ccFmtInt64(int64(uniqueDomains)),
			time.Since(extractStart).Truncate(time.Millisecond))))
		fmt.Println()

	default:
		// ── Legacy sample mode (download + import + query DuckDB) ──

		// Step 1: Download parquet file(s)
		if !opts.importOnly {
			client := cc.NewClient(ccCfg.BaseURL, ccCfg.TransportShards)

			if opts.sample > 0 {
				fmt.Println(infoStyle.Render(fmt.Sprintf("Step 1: Downloading %d parquet file(s) for %s (~%dMB)...",
					opts.sample, opts.crawlID, opts.sample*220)))
			} else {
				fmt.Println(infoStyle.Render(fmt.Sprintf("Step 1: Downloading full index for %s (~200GB)...", opts.crawlID)))
			}
			fmt.Println(labelStyle.Render(fmt.Sprintf("  → %s", ccCfg.IndexDir())))

			start := time.Now()
			dlReporter := newCCDownloadReporter()
			err := cc.DownloadIndex(ctx, client, ccCfg, opts.sample, dlReporter.Callback)
			if err != nil {
				return fmt.Errorf("downloading index: %w", err)
			}
			fmt.Println(successStyle.Render(fmt.Sprintf("  Download complete (%s)", time.Since(start).Truncate(time.Second))))
			fmt.Println()
		}

		// Step 2: Import to DuckDB
		dbPath := ccCfg.IndexDBPath()

		needsImport := true
		if _, err := os.Stat(dbPath); err == nil {
			fmt.Println(infoStyle.Render("Step 2: Index already imported, skipping..."))
			fmt.Println(labelStyle.Render(fmt.Sprintf("  → %s", dbPath)))
			needsImport = false
		}

		if needsImport {
			fmt.Println(infoStyle.Render("Step 2: Importing parquet to per-file DuckDB + catalog..."))
			fmt.Println(labelStyle.Render(fmt.Sprintf("  Parquet root: %s", ccCfg.IndexDir())))
			fmt.Println(labelStyle.Render(fmt.Sprintf("  Shards:      %s", ccCfg.IndexShardDir())))
			fmt.Println(labelStyle.Render(fmt.Sprintf("  Catalog:     %s", dbPath)))

			importStart := time.Now()
			importReporter := newCCImportReporter()
			rowCount, importErr := cc.ImportIndexWithProgress(ctx, ccCfg, importReporter.Callback)
			if importErr != nil {
				return fmt.Errorf("importing index: %w", importErr)
			}
			fmt.Println(successStyle.Render(fmt.Sprintf("  Imported %s rows (%s)",
				ccFmtInt64(rowCount), time.Since(importStart).Truncate(time.Second))))
		}
		fmt.Println()

		// Step 3: Extract URLs
		fmt.Println(infoStyle.Render("Step 3: Extracting URLs from CC index..."))
		printFilterSummary(opts.filter)

		seeds, uniqueDomains, err = cc.ExtractSeedURLs(ctx, dbPath, opts.filter)
		if err != nil {
			return fmt.Errorf("extracting seeds: %w", err)
		}
		if len(seeds) == 0 {
			fmt.Println(warningStyle.Render("  No matching URLs found in index"))
			return nil
		}
		fmt.Println(successStyle.Render(fmt.Sprintf("  %s URLs across %s domains",
			ccFmtInt64(int64(len(seeds))), ccFmtInt64(int64(uniqueDomains)))))
		fmt.Println()
	}

	// ── Step 4: Batch DNS pre-resolution ────────────────────────
	recrawlCfg := recrawler.Config{
		Workers:           opts.workers,
		DNSWorkers:        opts.dnsWorkers,
		DNSTimeout:        time.Duration(opts.dnsTimeout) * time.Millisecond,
		Timeout:           time.Duration(opts.timeout) * time.Millisecond,
		StatusOnly:        opts.statusOnly,
		HeadOnly:          opts.headOnly,
		TransportShards:   opts.transportShards,
		MaxConnsPerDomain: opts.maxConnsPerDomain,
		DNSPrefetch:       opts.dnsPrefetch,
		BatchSize:         opts.batchSize,
	}
	if opts.statusOnly || opts.headOnly {
		// High-throughput modes benefit from aggressive dead-domain culling.
		// This reduces repeated timeout storms on domains that never succeed.
		recrawlCfg.DomainFailThreshold = 1
	}

	resultDir := ccCfg.RecrawlDir()
	dnsPath := ccCfg.DNSCachePath()
	failedDBPath := ccCfg.FailedDBPath()

	if sourceParquetPath != "" {
		runDir := ccRecrawlParquetRunDir(ccCfg, sourceParquetPath)
		resultDir = filepath.Join(runDir, "results")
		dnsPath = filepath.Join(runDir, "dns.duckdb")
		failedDBPath = filepath.Join(runDir, "failed.duckdb")
		fmt.Println(infoStyle.Render("Per-parquet storage enabled"))
		fmt.Println(labelStyle.Render(fmt.Sprintf("  Parquet: %s", sourceParquetPath)))
		fmt.Println(labelStyle.Render(fmt.Sprintf("  Run dir: %s", runDir)))
		fmt.Println()
	}

	// Check for resume
	var skip map[string]bool
	if opts.resume {
		fmt.Println(infoStyle.Render("Checking for previous crawl state..."))
		skip, err = recrawler.LoadAlreadyCrawledFromDir(ctx, resultDir)
		if err != nil {
			fmt.Println(warningStyle.Render(fmt.Sprintf("  Could not load state: %v", err)))
		} else if len(skip) > 0 {
			fmt.Println(successStyle.Render(fmt.Sprintf("  Resuming: skipping %d already-crawled URLs", len(skip))))
		}
	}

	var dnsResolver *recrawler.DNSResolver
	if opts.dnsPrefetch {
		fmt.Println(infoStyle.Render("Batch DNS pre-resolution..."))

		dnsResolver = recrawler.NewDNSResolver(recrawlCfg.DNSTimeout)
		cached, _ := dnsResolver.LoadCache(dnsPath)
		if cached > 0 {
			fmt.Println(successStyle.Render(fmt.Sprintf("  DNS cache: %d entries (live=%d, dead=%d, timeout=%d)",
				cached, dnsResolver.LiveCount(), dnsResolver.DeadCount(), dnsResolver.TimeoutCount())))
		}

		// Collect unique domains to resolve
		allDomains := make(map[string]bool, uniqueDomains)
		for _, s := range seeds {
			if skip == nil || !skip[s.URL] {
				allDomains[s.Domain] = true
			}
		}
		domainList := make([]string, 0, len(allDomains))
		for d := range allDomains {
			domainList = append(domainList, d)
		}

		fmt.Println(infoStyle.Render(fmt.Sprintf("  Resolving %d domains (%d workers, %v timeout)...",
			len(domainList), opts.dnsWorkers, recrawlCfg.DNSTimeout)))

		var dnsDisplayLines int
		live, dead, timedout := dnsResolver.ResolveBatch(ctx, domainList, opts.dnsWorkers, recrawlCfg.DNSTimeout,
			func(p recrawler.DNSProgress) {
				if dnsDisplayLines > 0 {
					fmt.Printf("\033[%dA\033[J", dnsDisplayLines)
				}
				output := fmt.Sprintf("  DNS  %d/%d  │  %d live  │  %d dead  │  %d timeout  │  %.0f/s  │  %s\n",
					p.Done, p.Total, p.Live, p.Dead, p.Timeout, p.Speed, p.Elapsed.Truncate(time.Millisecond))
				fmt.Print(output)
				dnsDisplayLines = 1
			})
		if dnsDisplayLines > 0 {
			fmt.Printf("\033[%dA\033[J", dnsDisplayLines)
		}
		fmt.Println(successStyle.Render(fmt.Sprintf("  DNS: %d live, %d dead, %d timeout (%s)",
			live, dead, timedout, dnsResolver.Duration().Truncate(time.Millisecond))))
		fmt.Println()
	}

	// ── Step 5: Open FailedDB + result DB + run recrawler ──────────────────
	fmt.Println(infoStyle.Render("Recrawling from origin servers..."))
	if err := os.MkdirAll(filepath.Dir(failedDBPath), 0755); err != nil {
		return fmt.Errorf("creating recrawl data dir: %w", err)
	}

	// Open FailedDB for logging failed domains + URLs
	failedDB, err := recrawler.NewFailedDB(failedDBPath)
	if err != nil {
		return fmt.Errorf("opening failed db: %w", err)
	}
	defer func() {
		if failedDB != nil {
			failedDB.Close()
		}
	}()
	failedDB.SetMeta("crawl_id", opts.crawlID)
	failedDB.SetMeta("started_at", time.Now().Format(time.RFC3339))
	fmt.Println(successStyle.Render(fmt.Sprintf("  FailedDB → %s", failedDBPath)))

	rdb, err := recrawler.NewResultDB(resultDir, 16, opts.batchSize)
	if err != nil {
		return fmt.Errorf("opening result db: %w", err)
	}
	defer func() {
		if rdb != nil {
			_ = rdb.Close()
		}
	}()
	fmt.Println(successStyle.Render(fmt.Sprintf("  Results → %s/ (16 shards)", resultDir)))

	rdb.SetMeta(ctx, "crawl_id", opts.crawlID)
	rdb.SetMeta(ctx, "seed_source", "cc-index")
	if sourceParquetPath != "" {
		rdb.SetMeta(ctx, "seed_parquet_path", sourceParquetPath)
		rdb.SetMeta(ctx, "seed_parquet_subset", cc.ParquetSubsetFromPath(sourceParquetPath))
	}
	rdb.SetMeta(ctx, "started_at", time.Now().Format(time.RFC3339))
	rdb.SetMeta(ctx, "workers", fmt.Sprintf("%d", opts.workers))

	// Log DNS-dead domains to FailedDB (before recrawler runs)
	if dnsResolver != nil {
		// Build per-domain URL counts for metadata
		domainCounts := make(map[string]int, uniqueDomains)
		for _, s := range seeds {
			domainCounts[s.Domain]++
		}

		for domain, errMsg := range dnsResolver.DeadDomainsWithErrors() {
			reason := "dns_nxdomain"
			if errMsg == "http_dead" {
				reason = "http_dead"
			}
			failedDB.AddDomain(recrawler.FailedDomain{
				Domain:   domain,
				Reason:   reason,
				Error:    errMsg,
				URLCount: domainCounts[domain],
				Stage:    "dns_batch",
			})
		}
		for domain, errMsg := range dnsResolver.TimeoutDomainsWithErrors() {
			failedDB.AddDomain(recrawler.FailedDomain{
				Domain:   domain,
				Reason:   "dns_timeout",
				Error:    errMsg,
				URLCount: domainCounts[domain],
				Stage:    "dns_batch",
			})
		}
	}

	// Create stats + recrawler
	label := fmt.Sprintf("cc-%s", opts.crawlID)
	stats := recrawler.NewStats(len(seeds), uniqueDomains, label)

	fetchMode := "full"
	if opts.statusOnly {
		fetchMode = "status-only"
	} else if opts.headOnly {
		fetchMode = "head-only"
	}
	pipeline := "direct"
	if dnsResolver != nil {
		pipeline = "batch-dns → direct"
	}
	fmt.Println(infoStyle.Render(fmt.Sprintf("  %d workers, %v timeout, mode=%s, shards=%d, pipeline=%s",
		opts.workers, recrawlCfg.Timeout, fetchMode, opts.transportShards, pipeline)))
	if recrawlCfg.DomainFailThreshold > 0 {
		fmt.Println(labelStyle.Render(fmt.Sprintf("  domain-fail-threshold=%d", recrawlCfg.DomainFailThreshold)))
	}
	fmt.Println()

	r := recrawler.New(recrawlCfg, stats, rdb)
	r.SetFailedDB(failedDB)

	// Pre-populate DNS cache with reasons (use SetDNSCache + SetDeadDomains, NOT SetDNSResolver)
	if dnsResolver != nil {
		r.SetDNSCache(dnsResolver.ResolvedIPs())
		r.SetDeadDomains(dnsResolver.DeadOrTimeoutDomainsWithReasons())
	}

	err = recrawler.RunWithDisplay(ctx, r, seeds, skip, stats)

	// ── Optional timeout replay pass (correctness) ────────────────
	rdb.Flush(ctx)
	timeoutReplaySummary := ccTimeoutReplaySummary{}
	if failedDB != nil {
		failedDB.SetMeta("main_pass_finished_at", time.Now().Format(time.RFC3339))
		if closeErr := failedDB.Close(); closeErr != nil {
			return fmt.Errorf("closing failed db after main pass: %w", closeErr)
		}
		failedDB = nil
	}

	if err == nil && recrawlCfg.DomainFailThreshold > 0 {
		replaySummary, replayErr := ccRunTimeoutKilledReplay(ctx, failedDBPath, rdb, seeds, skip, dnsResolver, recrawlCfg, label)
		if replayErr != nil {
			fmt.Println(warningStyle.Render(fmt.Sprintf("Timeout replay failed: %v", replayErr)))
		} else {
			timeoutReplaySummary = replaySummary
			rdb.SetMeta(ctx, "timeout_replay_candidates", fmt.Sprintf("%d", replaySummary.Candidates))
			rdb.SetMeta(ctx, "timeout_replay_recovered", fmt.Sprintf("%d", replaySummary.Recovered))
			rdb.SetMeta(ctx, "timeout_replay_fatal_reclassified", fmt.Sprintf("%d", replaySummary.FatalReclassified))
			rdb.SetMeta(ctx, "timeout_replay_still_failed", fmt.Sprintf("%d", replaySummary.RecheckFailed))
			rdb.SetMeta(ctx, "timeout_replay_remaining_timeout_killed", fmt.Sprintf("%d", replaySummary.RemainingTimeoutKilled))
		}
	}

	// ── Final: flush + save DNS cache + FailedDB summary ──────────
	rdb.Flush(ctx)
	rdb.SetMeta(ctx, "finished_at", time.Now().Format(time.RFC3339))

	if dnsResolver != nil {
		fmt.Print(infoStyle.Render("  Saving DNS cache..."))
		saveStart := time.Now()
		if saveErr := dnsResolver.SaveCache(dnsPath); saveErr != nil {
			fmt.Println(warningStyle.Render(fmt.Sprintf(" failed: %v", saveErr)))
		} else {
			fmt.Println(successStyle.Render(fmt.Sprintf(" saved in %s → %s (live=%d, dead=%d, timeout=%d)",
				time.Since(saveStart).Truncate(time.Millisecond), filepath.Base(dnsPath),
				dnsResolver.LiveCount(), dnsResolver.DeadCount(), dnsResolver.TimeoutCount())))
		}
	}

	// FailedDB summary
	_ = ccFailedDBSetMeta(failedDBPath, "finished_at", time.Now().Format(time.RFC3339))
	_, failedDomainCount, domainSummaryErr := recrawler.FailedDomainSummary(failedDBPath)
	if domainSummaryErr != nil {
		return fmt.Errorf("reading failed domain summary: %w", domainSummaryErr)
	}
	_, failedURLCount, urlSummaryErr := recrawler.FailedURLSummary(failedDBPath)
	if urlSummaryErr != nil {
		return fmt.Errorf("reading failed URL summary: %w", urlSummaryErr)
	}
	fmt.Println(infoStyle.Render(fmt.Sprintf("  FailedDB: %s domains, %s URLs → %s",
		ccFmtInt64(int64(failedDomainCount)), ccFmtInt64(int64(failedURLCount)), filepath.Base(failedDBPath))))
	if timeoutReplaySummary.Candidates > 0 {
		fmt.Println(labelStyle.Render(fmt.Sprintf("  Timeout replay: candidates=%d, replayed=%d, recovered=%d, fatal=%d, still-failed=%d, remaining-timeout-killed=%d",
			timeoutReplaySummary.Candidates, timeoutReplaySummary.ReplaySeeds, timeoutReplaySummary.Recovered,
			timeoutReplaySummary.FatalReclassified, timeoutReplaySummary.RecheckFailed, timeoutReplaySummary.RemainingTimeoutKilled)))
	}

	// Close result shards before optional domain export (DuckDB file locks).
	if rdb != nil {
		if closeErr := rdb.Close(); closeErr != nil {
			return fmt.Errorf("closing result db before domain export: %w", closeErr)
		}
		rdb = nil
	}

	var domainExportSummary ccDomainExportSummary
	if sourceParquetPath != "" {
		exportSummary, exportErr := ccExportPerDomainRecrawlArtifacts(ctx, ccCfg, sourceParquetPath, resultDir, failedDBPath)
		if exportErr != nil {
			fmt.Println(warningStyle.Render(fmt.Sprintf("Domain folder export failed: %v", exportErr)))
		} else {
			domainExportSummary = exportSummary
		}
	}

	fmt.Println()
	if err != nil {
		fmt.Println(warningStyle.Render(fmt.Sprintf("Recrawl finished with error: %v", err)))
	} else {
		fmt.Println(successStyle.Render("Recrawl complete!"))
	}
	fmt.Println(labelStyle.Render(fmt.Sprintf("  Results: %s/", resultDir)))
	if domainExportSummary.ParquetFolder != "" {
		fmt.Println(labelStyle.Render(fmt.Sprintf(
			"  Domain folders: %s domains updated for parquet %s → %s",
			ccFmtInt64(int64(domainExportSummary.DomainsUpdated)),
			domainExportSummary.ParquetFolder,
			domainExportSummary.RootDir,
		)))
	}
	fmt.Println()

	return err
}

// ── cc verify ──────────────────────────────────────────────

func newCCVerify() *cobra.Command {
	var (
		crawlID     string
		workers     int
		dnsTimeout  int
		httpTimeout int
		limit       int
	)

	cmd := &cobra.Command{
		Use:   "verify",
		Short: "Verify failed domains from recrawl (slow, thorough)",
		Long: `Slowly and thoroughly verify domains marked as dead during recrawl.

For each failed domain:
  1. DNS: tries system, Google 8.8.8.8, Cloudflare 1.1.1.1 (10s timeout each)
  2. HTTP: tries https:// and http:// with GET (30s timeout each)
  3. Verdict: truly dead (all fail) or false positive (any succeed)

Use few workers (default 10) to avoid network rate-limiting.

Examples:
  search cc verify
  search cc verify --workers 5 --dns-timeout 15000
  search cc verify --limit 100`,
		RunE: func(cmd *cobra.Command, args []string) error {
			return runCCVerify(cmd.Context(), crawlID, workers, dnsTimeout, httpTimeout, limit)
		},
	}

	cmd.Flags().StringVar(&crawlID, "crawl", "CC-MAIN-2026-04", "Crawl ID")
	cmd.Flags().IntVar(&workers, "workers", 10, "Verification workers (keep low for accuracy)")
	cmd.Flags().IntVar(&dnsTimeout, "dns-timeout", 10000, "DNS timeout per resolver (ms)")
	cmd.Flags().IntVar(&httpTimeout, "http-timeout", 30000, "HTTP timeout (ms)")
	cmd.Flags().IntVar(&limit, "limit", 0, "Max domains to verify (0=all)")

	return cmd
}

func runCCVerify(ctx context.Context, crawlID string, workers, dnsTimeout, httpTimeout, limit int) error {
	fmt.Println(Banner())
	fmt.Println(subtitleStyle.Render("Domain Verification (Slow, Thorough)"))
	fmt.Println()

	ccCfg := cc.DefaultConfig()
	ccCfg.CrawlID = crawlID

	failedPath := ccCfg.FailedDBPath()
	if _, err := os.Stat(failedPath); err != nil {
		return fmt.Errorf("failed DB not found: %s — run 'cc recrawl' first", failedPath)
	}

	// Show failure summary
	summary, total, err := recrawler.FailedDomainSummary(failedPath)
	if err != nil {
		return fmt.Errorf("reading failed DB: %w", err)
	}

	fmt.Printf("  Failed domains: %s\n", ccFmtInt64(int64(total)))
	for reason, count := range summary {
		fmt.Printf("    %-25s %s\n", reason, ccFmtInt64(int64(count)))
	}
	fmt.Println()

	if limit > 0 && limit < total {
		fmt.Println(infoStyle.Render(fmt.Sprintf("  Verifying top %d domains (by URL count)...", limit)))
	}

	outputPath := ccCfg.VerifyDBPath()
	fmt.Printf("  Output: %s\n", outputPath)
	fmt.Printf("  Workers: %d  DNS timeout: %ds  HTTP timeout: %ds\n",
		workers, dnsTimeout/1000, httpTimeout/1000)
	fmt.Println()

	cfg := recrawler.VerifyConfig{
		Workers:     workers,
		DNSTimeout:  time.Duration(dnsTimeout) * time.Millisecond,
		HTTPTimeout: time.Duration(httpTimeout) * time.Millisecond,
	}

	var displayLines int
	err = recrawler.VerifyFailedDomains(ctx, failedPath, outputPath, cfg, limit, func(p recrawler.VerifyProgress) {
		if displayLines > 0 {
			fmt.Printf("\033[%dA\033[J", displayLines)
		}
		pct := float64(0)
		if p.Total > 0 {
			pct = float64(p.Done) / float64(p.Total) * 100
		}
		output := fmt.Sprintf("  Verify %d/%d (%.1f%%)  │  %d alive  │  %d dead  │  %d false+  │  %.1f/s  │  %s\n",
			p.Done, p.Total, pct, p.Alive, p.Dead, p.FalsePos, p.Speed, p.Elapsed.Truncate(time.Second))
		fmt.Print(output)
		displayLines = 1
	})

	if err != nil {
		return fmt.Errorf("verification: %w", err)
	}

	// Print final results
	fmt.Println()
	vTotal, vAlive, vDead, vFP, fpRate, _ := recrawler.VerifySummary(outputPath)
	fmt.Println(successStyle.Render("Verification complete!"))
	fmt.Printf("  Total:           %s domains\n", ccFmtInt64(int64(vTotal)))
	fmt.Printf("  Truly dead:      %s\n", ccFmtInt64(int64(vDead)))
	fmt.Printf("  Actually alive:  %s (false positives)\n", ccFmtInt64(int64(vAlive)))
	fmt.Printf("  False positive rate: %.2f%%\n", fpRate)
	if vFP > 0 {
		fmt.Println()
		fmt.Println(warningStyle.Render(fmt.Sprintf("  %d domains were incorrectly marked dead!", vFP)))
		// Show some examples
		fps, _ := recrawler.VerifyFalsePositives(outputPath, 10)
		for _, fp := range fps {
			fmt.Printf("    %-40s %s  DNS=%s  HTTP=%d  HTTPS=%d\n",
				fp.Domain, fp.OriginalReason,
				fp.DNSSystemIPs, fp.HTTPStatus, fp.HTTPSStatus)
		}
	}
	fmt.Println()
	fmt.Println(labelStyle.Render(fmt.Sprintf("  Results: %s", outputPath)))
	fmt.Println()

	return nil
}

// ── helpers ──────────────────────────────────────────────

func printFilterSummary(filter cc.IndexFilter) {
	var parts []string
	if len(filter.StatusCodes) > 0 {
		parts = append(parts, fmt.Sprintf("status=%v", filter.StatusCodes))
	}
	if len(filter.MimeTypes) > 0 {
		parts = append(parts, fmt.Sprintf("mime=%v", filter.MimeTypes))
	}
	if len(filter.Languages) > 0 {
		parts = append(parts, fmt.Sprintf("lang=%v", filter.Languages))
	}
	if len(filter.Domains) > 0 {
		parts = append(parts, fmt.Sprintf("domain=%v", filter.Domains))
	}
	if len(filter.TLDs) > 0 {
		parts = append(parts, fmt.Sprintf("tld=%v", filter.TLDs))
	}
	if filter.Limit > 0 {
		parts = append(parts, fmt.Sprintf("limit=%d", filter.Limit))
	}
	if len(parts) > 0 {
		fmt.Println(labelStyle.Render(fmt.Sprintf("  Filter: %s", strings.Join(parts, ", "))))
	}
}

func ccFmtInt64(n int64) string {
	s := strconv.FormatInt(n, 10)
	if n < 1000 {
		return s
	}
	var result []byte
	for i, c := range s {
		if i > 0 && (len(s)-i)%3 == 0 {
			result = append(result, ',')
		}
		result = append(result, byte(c))
	}
	return string(result)
}

func ccRecrawlParquetRunDir(cfg cc.Config, parquetPath string) string {
	subset := cc.ParquetSubsetFromPath(parquetPath)
	if subset == "" {
		subset = "unknown"
	}
	base := filepath.Base(parquetPath)
	base = strings.TrimSuffix(base, filepath.Ext(base))
	base = sanitizePathToken(base)
	return filepath.Join(cfg.RecrawlDir(), "parquet", subset, base)
}

type ccRecrawlParquetResolution struct {
	Path      string
	Detail    string
	Source    string // local, warc-index, manifest-index
	Cached    bool
	SizeBytes int64
}

func ccResolveRecrawlParquetFile(ctx context.Context, cfg cc.Config, selector string, progress cc.ProgressFn) (ccRecrawlParquetResolution, error) {
	// First treat as a local path (supports absolute and relative paths).
	if fi, err := os.Stat(selector); err == nil && fi.Size() > 0 {
		return ccRecrawlParquetResolution{
			Path:      selector,
			Detail:    "local path",
			Source:    "local",
			Cached:    true,
			SizeBytes: fi.Size(),
		}, nil
	}

	kind, idx, err := ccParseParquetSelector(selector)
	if err != nil {
		return ccRecrawlParquetResolution{}, fmt.Errorf("invalid --file %q: %w", selector, err)
	}

	client := cc.NewClient(cfg.BaseURL, cfg.TransportShards)
	switch kind {
	case "warc":
		files, listErr := cc.ListParquetFiles(ctx, client, cfg, cc.ParquetListOptions{Subset: "warc"})
		if listErr != nil {
			return ccRecrawlParquetResolution{}, fmt.Errorf("listing warc parquet files: %w", listErr)
		}
		if len(files) == 0 {
			return ccRecrawlParquetResolution{}, fmt.Errorf("no warc parquet files found in manifest")
		}
		if idx < 0 || idx >= len(files) {
			return ccRecrawlParquetResolution{}, fmt.Errorf("warc parquet index %d out of range (warc subset has %d files)", idx, len(files))
		}
		f := files[idx]
		localPath := cc.LocalParquetPathForRemote(cfg, f.RemotePath)
		if fi, statErr := os.Stat(localPath); statErr == nil && fi.Size() > 0 {
			return ccRecrawlParquetResolution{
				Path:      localPath,
				Detail:    fmt.Sprintf("warc[%d] (manifest=%d, %s)", idx, f.ManifestIndex, f.Filename),
				Source:    "warc-index",
				Cached:    true,
				SizeBytes: fi.Size(),
			}, nil
		}
		if progress != nil {
			progress(cc.DownloadProgress{
				File:       f.Filename,
				RemotePath: f.RemotePath,
				FileIndex:  1,
				TotalFiles: 1,
				Started:    true,
			})
		}
		if err := cc.DownloadParquetFiles(ctx, client, cfg, []cc.ParquetFile{f}, 1, progress); err != nil {
			return ccRecrawlParquetResolution{}, fmt.Errorf("downloading warc parquet index %d: %w", idx, err)
		}
		fi, _ := os.Stat(localPath)
		var size int64
		if fi != nil {
			size = fi.Size()
		}
		return ccRecrawlParquetResolution{
			Path:      localPath,
			Detail:    fmt.Sprintf("warc[%d] (manifest=%d, %s)", idx, f.ManifestIndex, f.Filename),
			Source:    "warc-index",
			SizeBytes: size,
		}, nil

	case "manifest":
		paths, manErr := cc.ParquetManifest(ctx, client, cfg)
		if manErr != nil {
			return ccRecrawlParquetResolution{}, fmt.Errorf("loading parquet manifest: %w", manErr)
		}
		if idx < 0 || idx >= len(paths) {
			return ccRecrawlParquetResolution{}, fmt.Errorf("manifest parquet index %d out of range (manifest has %d files)", idx, len(paths))
		}
		remotePath := paths[idx]
		subset := cc.ParquetSubsetFromPath(remotePath)
		if subset != "warc" {
			return ccRecrawlParquetResolution{}, fmt.Errorf("manifest index %d is subset=%s (recrawl requires subset=warc); use `search cc parquet list --crawl %s --subset warc` then `--file <warc-index>` or choose a warc manifest index", idx, subset, cfg.CrawlID)
		}
		localPath := cc.LocalParquetPathForRemote(cfg, remotePath)
		if fi, statErr := os.Stat(localPath); statErr == nil && fi.Size() > 0 {
			return ccRecrawlParquetResolution{
				Path:      localPath,
				Detail:    fmt.Sprintf("manifest[%d] (%s)", idx, filepath.Base(remotePath)),
				Source:    "manifest-index",
				Cached:    true,
				SizeBytes: fi.Size(),
			}, nil
		}
		gotPath, dlErr := cc.DownloadManifestParquetFile(ctx, client, cfg, idx, progress)
		if dlErr != nil {
			return ccRecrawlParquetResolution{}, fmt.Errorf("downloading manifest parquet index %d: %w", idx, dlErr)
		}
		fi, _ := os.Stat(gotPath)
		var size int64
		if fi != nil {
			size = fi.Size()
		}
		return ccRecrawlParquetResolution{
			Path:      gotPath,
			Detail:    fmt.Sprintf("manifest[%d] (%s)", idx, filepath.Base(remotePath)),
			Source:    "manifest-index",
			SizeBytes: size,
		}, nil
	}

	return ccRecrawlParquetResolution{}, fmt.Errorf("unsupported parquet selector kind: %s", kind)
}

func ccParseParquetSelector(s string) (kind string, idx int, err error) {
	if n, convErr := strconv.Atoi(s); convErr == nil {
		return "warc", n, nil
	}
	parts := strings.SplitN(s, ":", 2)
	if len(parts) != 2 {
		return "", 0, fmt.Errorf("expected local path or selector N / w:N / m:N")
	}
	n, convErr := strconv.Atoi(parts[1])
	if convErr != nil {
		return "", 0, fmt.Errorf("selector index must be numeric: %q", parts[1])
	}
	switch strings.ToLower(strings.TrimSpace(parts[0])) {
	case "w", "warc":
		return "warc", n, nil
	case "m", "manifest":
		return "manifest", n, nil
	default:
		return "", 0, fmt.Errorf("unknown selector prefix %q (use w: or m:)", parts[0])
	}
}

func sanitizePathToken(s string) string {
	if s == "" {
		return "run"
	}
	var b strings.Builder
	b.Grow(len(s))
	for _, r := range s {
		switch {
		case r >= 'a' && r <= 'z':
			b.WriteRune(r)
		case r >= 'A' && r <= 'Z':
			b.WriteRune(r)
		case r >= '0' && r <= '9':
			b.WriteRune(r)
		case r == '-' || r == '_' || r == '.':
			b.WriteRune(r)
		default:
			b.WriteByte('_')
		}
	}
	return b.String()
}

type ccTimeoutReplaySummary struct {
	Candidates             int
	ReplaySeeds            int
	MissingSeeds           int
	Recovered              int
	FatalReclassified      int
	RecheckFailed          int
	RemainingTimeoutKilled int
}

func ccLoadFailedDomainsByReason(dbPath, reason string) ([]recrawler.FailedDomain, error) {
	db, err := sql.Open("duckdb", dbPath)
	if err != nil {
		return nil, fmt.Errorf("opening failed db: %w", err)
	}
	defer db.Close()

	rows, err := db.Query(`
		SELECT domain, reason, COALESCE(error_msg, ''), COALESCE(ips, ''),
		       COALESCE(url_count, 0), COALESCE(stage, ''), detected_at
		FROM failed_domains
		WHERE reason = ?
		ORDER BY url_count DESC, domain ASC
	`, reason)
	if err != nil {
		return nil, fmt.Errorf("querying failed domains by reason: %w", err)
	}
	defer rows.Close()

	var out []recrawler.FailedDomain
	for rows.Next() {
		var d recrawler.FailedDomain
		if err := rows.Scan(&d.Domain, &d.Reason, &d.Error, &d.IPs, &d.URLCount, &d.Stage, &d.DetectedAt); err != nil {
			return nil, fmt.Errorf("scanning failed domain: %w", err)
		}
		out = append(out, d)
	}
	return out, nil
}

func ccFailedDomainReasonCount(dbPath, reason string) (int, error) {
	db, err := sql.Open("duckdb", dbPath)
	if err != nil {
		return 0, fmt.Errorf("opening failed db: %w", err)
	}
	defer db.Close()

	var n int
	if err := db.QueryRow("SELECT COUNT(*) FROM failed_domains WHERE reason = ?", reason).Scan(&n); err != nil {
		return 0, fmt.Errorf("counting failed domains by reason: %w", err)
	}
	return n, nil
}

func ccFailedDBSetMeta(dbPath, key, value string) error {
	db, err := sql.Open("duckdb", dbPath)
	if err != nil {
		return fmt.Errorf("opening failed db: %w", err)
	}
	defer db.Close()

	if _, err := db.Exec(`CREATE TABLE IF NOT EXISTS meta (key VARCHAR PRIMARY KEY, value VARCHAR)`); err != nil {
		return err
	}
	_, err = db.Exec(`INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)`, key, value)
	return err
}

func ccBuildTimeoutReplaySeeds(seeds []recrawler.SeedURL, skip map[string]bool, domains []recrawler.FailedDomain) ([]recrawler.SeedURL, []string) {
	want := make(map[string]struct{}, len(domains))
	for _, d := range domains {
		want[d.Domain] = struct{}{}
	}

	// Prefer a URL that was not skipped by --resume, fall back to any URL for the domain.
	preferred := make(map[string]recrawler.SeedURL, len(domains))
	fallback := make(map[string]recrawler.SeedURL, len(domains))

	for _, s := range seeds {
		if _, ok := want[s.Domain]; !ok {
			continue
		}
		if _, ok := fallback[s.Domain]; !ok {
			fallback[s.Domain] = s
		}
		if skip != nil && skip[s.URL] {
			continue
		}
		if _, ok := preferred[s.Domain]; !ok {
			preferred[s.Domain] = s
		}
	}

	replaySeeds := make([]recrawler.SeedURL, 0, len(domains))
	missing := make([]string, 0)
	for _, d := range domains {
		if s, ok := preferred[d.Domain]; ok {
			replaySeeds = append(replaySeeds, s)
			continue
		}
		if s, ok := fallback[d.Domain]; ok {
			replaySeeds = append(replaySeeds, s)
			continue
		}
		missing = append(missing, d.Domain)
	}
	return replaySeeds, missing
}

func ccReclassifyTimeoutKilledDomains(dbPath string, candidates []recrawler.FailedDomain, recovered map[string]bool, replayDead map[string]string) (ccTimeoutReplaySummary, error) {
	summary := ccTimeoutReplaySummary{Candidates: len(candidates)}

	db, err := sql.Open("duckdb", dbPath)
	if err != nil {
		return summary, fmt.Errorf("opening failed db for reclassify: %w", err)
	}
	defer db.Close()

	tx, err := db.Begin()
	if err != nil {
		return summary, fmt.Errorf("begin failed db tx: %w", err)
	}
	defer tx.Rollback()

	stmt, err := tx.Prepare(`UPDATE failed_domains SET reason = ?, error_msg = ?, stage = ? WHERE domain = ? AND reason = 'http_timeout_killed'`)
	if err != nil {
		return summary, fmt.Errorf("prepare failed db update: %w", err)
	}
	defer stmt.Close()

	for _, d := range candidates {
		newReason := "http_timeout_recheck_failed"
		errMsg := "still unavailable after timeout replay"
		stage := "http_timeout_replay"

		switch {
		case recovered[d.Domain]:
			newReason = "http_timeout_recovered"
			errMsg = "recovered in timeout replay"
			summary.Recovered++
		default:
			switch replayDead[d.Domain] {
			case "http_refused", "http_dns_error":
				newReason = replayDead[d.Domain]
				errMsg = "reclassified by timeout replay"
				summary.FatalReclassified++
			default:
				summary.RecheckFailed++
			}
		}

		if _, err := stmt.Exec(newReason, errMsg, stage, d.Domain); err != nil {
			return summary, fmt.Errorf("updating failed domain %s: %w", d.Domain, err)
		}
	}

	if err := tx.Commit(); err != nil {
		return summary, fmt.Errorf("commit failed db reclassify: %w", err)
	}

	remaining, err := ccFailedDomainReasonCount(dbPath, "http_timeout_killed")
	if err != nil {
		return summary, err
	}
	summary.RemainingTimeoutKilled = remaining
	return summary, nil
}

func ccRunTimeoutKilledReplay(
	ctx context.Context,
	failedDBPath string,
	rdb *recrawler.ResultDB,
	seeds []recrawler.SeedURL,
	skip map[string]bool,
	dnsResolver *recrawler.DNSResolver,
	baseCfg recrawler.Config,
	label string,
) (ccTimeoutReplaySummary, error) {
	candidates, err := ccLoadFailedDomainsByReason(failedDBPath, "http_timeout_killed")
	if err != nil {
		return ccTimeoutReplaySummary{}, err
	}
	if len(candidates) == 0 {
		return ccTimeoutReplaySummary{}, nil
	}

	replaySeeds, missingSeeds := ccBuildTimeoutReplaySeeds(seeds, skip, candidates)
	summary := ccTimeoutReplaySummary{
		Candidates:   len(candidates),
		ReplaySeeds:  len(replaySeeds),
		MissingSeeds: len(missingSeeds),
	}

	fmt.Println(infoStyle.Render("Timeout replay pass (requeue timeout-killed domains)..."))
	fmt.Println(labelStyle.Render(fmt.Sprintf("  Candidates: %s domains", ccFmtInt64(int64(len(candidates))))))
	fmt.Println(labelStyle.Render(fmt.Sprintf("  Replay seeds: %s URLs (1 per domain)", ccFmtInt64(int64(len(replaySeeds))))))
	if len(missingSeeds) > 0 {
		fmt.Println(warningStyle.Render(fmt.Sprintf("  Missing seeds for %d domain(s); will classify as recheck_failed", len(missingSeeds))))
	}

	if len(replaySeeds) == 0 {
		reclass, err := ccReclassifyTimeoutKilledDomains(failedDBPath, candidates, map[string]bool{}, map[string]string{})
		if err != nil {
			return summary, err
		}
		reclass.MissingSeeds = len(missingSeeds)
		return reclass, nil
	}

	replayCfg := baseCfg
	replayCfg.Workers = min(len(replaySeeds), 1000)
	if replayCfg.Workers < 1 {
		replayCfg.Workers = 1
	}
	replayCfg.MaxConnsPerDomain = 1
	replayCfg.DomainFailThreshold = 1000 // disable timeout-based domain kill during replay
	if replayCfg.Timeout < 10*time.Second {
		replayCfg.Timeout = 10 * time.Second
	}

	fmt.Println(labelStyle.Render(fmt.Sprintf("  Replay config: %d workers, %v timeout, max-conns-per-domain=%d, domain-fail-threshold=%d",
		replayCfg.Workers, replayCfg.Timeout, replayCfg.MaxConnsPerDomain, replayCfg.DomainFailThreshold)))
	fmt.Println()

	failedDB, err := recrawler.NewFailedDB(failedDBPath)
	if err != nil {
		return summary, fmt.Errorf("opening failed db for timeout replay: %w", err)
	}
	defer func() {
		if failedDB != nil {
			failedDB.Close()
		}
	}()
	failedDB.SetMeta("timeout_replay_started_at", time.Now().Format(time.RFC3339))

	replayStats := recrawler.NewStats(len(replaySeeds), len(replaySeeds), label+"-timeout-replay")
	r := recrawler.New(replayCfg, replayStats, rdb)
	r.SetFailedDB(failedDB)
	if dnsResolver != nil {
		r.SetDNSCache(dnsResolver.ResolvedIPs())
		r.SetDeadDomains(dnsResolver.DeadOrTimeoutDomainsWithReasons())
	}

	if err := recrawler.RunWithDisplay(ctx, r, replaySeeds, nil, replayStats); err != nil {
		return summary, fmt.Errorf("timeout replay recrawl: %w", err)
	}
	rdb.Flush(ctx)

	failedDB.SetMeta("timeout_replay_finished_at", time.Now().Format(time.RFC3339))
	if err := failedDB.Close(); err != nil {
		return summary, fmt.Errorf("closing failed db after timeout replay: %w", err)
	}
	failedDB = nil

	reclass, err := ccReclassifyTimeoutKilledDomains(failedDBPath, candidates, r.SucceededDomains(), r.DeadDomainReasons())
	if err != nil {
		return summary, err
	}
	reclass.ReplaySeeds = len(replaySeeds)
	reclass.MissingSeeds = len(missingSeeds)

	fmt.Println(successStyle.Render(fmt.Sprintf("  Timeout replay complete: %s recovered, %s fatal reclassified, %s still failed",
		ccFmtInt64(int64(reclass.Recovered)), ccFmtInt64(int64(reclass.FatalReclassified)), ccFmtInt64(int64(reclass.RecheckFailed)))))
	fmt.Println(labelStyle.Render(fmt.Sprintf("  Remaining http_timeout_killed: %d", reclass.RemainingTimeoutKilled)))
	fmt.Println()

	return reclass, nil
}
