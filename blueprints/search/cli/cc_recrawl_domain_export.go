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

	_ "github.com/duckdb/duckdb-go/v2"
)

func ccRecrawlDomainRootDir(cfg cc.Config) string {
	return filepath.Join(cfg.RecrawlDir(), "domains")
}

type ccDomainExportSummary struct {
	ParquetFolder    string
	RootDir          string
	DomainsUpdated   int
	ResultRows       int64
	FailedDomainRows int64
	FailedURLRows    int64
}

type ccDomainResultRow struct {
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
	CrawledAt     time.Time
	Error         string
	Status        string
}

type ccDomainFailedDomainRow struct {
	Domain     string
	Reason     string
	ErrorMsg   string
	IPs        string
	URLCount   int
	Stage      string
	DetectedAt time.Time
}

type ccDomainFailedURLRow struct {
	URL         string
	Domain      string
	Reason      string
	ErrorMsg    string
	StatusCode  int
	FetchTimeMs int64
	ContentType string
	RedirectURL string
	DetectedAt  time.Time
}

func ccExportPerDomainRecrawlArtifacts(ctx context.Context, cfg cc.Config, sourceParquetPath, resultDir, failedDBPath string) (ccDomainExportSummary, error) {
	parquetFolder := ccRecrawlParquetFolderName(sourceParquetPath)
	rootDir := ccRecrawlDomainRootDir(cfg)

	fmt.Println(infoStyle.Render("Domain folder export (per-domain DuckDB)..."))
	fmt.Println(labelStyle.Render(fmt.Sprintf("  Layout: %s/<tld>/<domain>/%s/recrawl.duckdb", rootDir, parquetFolder)))

	writer := &ccPerDomainRecrawlWriter{
		rootDir:       rootDir,
		parquetFolder: parquetFolder,
		touched:       make(map[string]struct{}, 1024),
	}

	start := time.Now()
	if err := ccExportDomainResultsFromShards(ctx, writer, resultDir); err != nil {
		return ccDomainExportSummary{}, err
	}
	if err := ccExportDomainFailures(ctx, writer, failedDBPath); err != nil {
		return ccDomainExportSummary{}, err
	}

	summary := ccDomainExportSummary{
		ParquetFolder:    parquetFolder,
		RootDir:          rootDir,
		DomainsUpdated:   len(writer.touched),
		ResultRows:       writer.resultRows,
		FailedDomainRows: writer.failedDomainRows,
		FailedURLRows:    writer.failedURLRows,
	}
	fmt.Println(successStyle.Render(fmt.Sprintf(
		"  Domain export complete: %s domains (%s results, %s failed_domains, %s failed_urls) in %s",
		ccFmtInt64(int64(summary.DomainsUpdated)),
		ccFmtInt64(summary.ResultRows),
		ccFmtInt64(summary.FailedDomainRows),
		ccFmtInt64(summary.FailedURLRows),
		time.Since(start).Truncate(time.Second),
	)))
	return summary, nil
}

type ccPerDomainRecrawlWriter struct {
	rootDir          string
	parquetFolder    string
	touched          map[string]struct{}
	resultRows       int64
	failedDomainRows int64
	failedURLRows    int64
}

func (w *ccPerDomainRecrawlWriter) domainDBPath(domain string) (string, error) {
	domain = strings.TrimSpace(strings.ToLower(domain))
	if domain == "" {
		return "", fmt.Errorf("empty domain")
	}
	tld := domain
	if i := strings.LastIndex(domain, "."); i >= 0 && i+1 < len(domain) {
		tld = domain[i+1:]
	}
	domain = sanitizePathToken(domain)
	tld = sanitizePathToken(tld)
	return filepath.Join(w.rootDir, tld, domain, w.parquetFolder, "recrawl.duckdb"), nil
}

func (w *ccPerDomainRecrawlWriter) openDomainDB(domain string) (*sql.DB, error) {
	dbPath, err := w.domainDBPath(domain)
	if err != nil {
		return nil, err
	}
	if err := os.MkdirAll(filepath.Dir(dbPath), 0755); err != nil {
		return nil, fmt.Errorf("creating domain dir: %w", err)
	}
	db, err := sql.Open("duckdb", dbPath)
	if err != nil {
		return nil, fmt.Errorf("opening domain db: %w", err)
	}
	if err := ccInitPerDomainRecrawlSchema(db); err != nil {
		db.Close()
		return nil, err
	}
	_, _ = db.Exec(`CREATE TABLE IF NOT EXISTS meta (key VARCHAR PRIMARY KEY, value VARCHAR)`)
	_, _ = db.Exec("INSERT OR REPLACE INTO meta (key, value) VALUES ('domain', ?), ('parquet_folder', ?)", domain, w.parquetFolder)
	w.touched[strings.ToLower(domain)] = struct{}{}
	return db, nil
}

func ccInitPerDomainRecrawlSchema(db *sql.DB) error {
	if _, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS results (
			url VARCHAR PRIMARY KEY,
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
	`); err != nil {
		return fmt.Errorf("init per-domain results schema: %w", err)
	}
	if _, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS failed_domains (
			domain VARCHAR PRIMARY KEY,
			reason VARCHAR NOT NULL,
			error_msg VARCHAR DEFAULT '',
			ips VARCHAR DEFAULT '',
			url_count INTEGER DEFAULT 0,
			stage VARCHAR DEFAULT '',
			detected_at TIMESTAMP DEFAULT current_timestamp
		)
	`); err != nil {
		return fmt.Errorf("init per-domain failed_domains schema: %w", err)
	}
	if _, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS failed_urls (
			url VARCHAR PRIMARY KEY,
			domain VARCHAR NOT NULL,
			reason VARCHAR NOT NULL,
			error_msg VARCHAR DEFAULT '',
			status_code INTEGER DEFAULT 0,
			fetch_time_ms BIGINT DEFAULT 0,
			content_type VARCHAR DEFAULT '',
			redirect_url VARCHAR DEFAULT '',
			detected_at TIMESTAMP DEFAULT current_timestamp
		)
	`); err != nil {
		return fmt.Errorf("init per-domain failed_urls schema: %w", err)
	}
	return nil
}

func (w *ccPerDomainRecrawlWriter) writeResults(domain string, rows []ccDomainResultRow) error {
	if len(rows) == 0 {
		return nil
	}
	db, err := w.openDomainDB(domain)
	if err != nil {
		return err
	}
	defer db.Close()

	const cols = 14
	var b strings.Builder
	args := make([]any, 0, len(rows)*cols)
	b.WriteString("INSERT OR REPLACE INTO results (url, status_code, content_type, content_length, body, title, description, language, domain, redirect_url, fetch_time_ms, crawled_at, error, status) VALUES ")
	for i, r := range rows {
		if i > 0 {
			b.WriteByte(',')
		}
		b.WriteString("(?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
		args = append(args, r.URL, r.StatusCode, r.ContentType, r.ContentLength, r.Body, r.Title, r.Description,
			r.Language, r.Domain, r.RedirectURL, r.FetchTimeMs, r.CrawledAt, r.Error, r.Status)
	}
	if _, err := db.Exec(b.String(), args...); err != nil {
		return fmt.Errorf("writing per-domain results for %s: %w", domain, err)
	}
	w.resultRows += int64(len(rows))
	return nil
}

func (w *ccPerDomainRecrawlWriter) writeFailedDomains(domain string, rows []ccDomainFailedDomainRow) error {
	if len(rows) == 0 {
		return nil
	}
	db, err := w.openDomainDB(domain)
	if err != nil {
		return err
	}
	defer db.Close()

	var b strings.Builder
	args := make([]any, 0, len(rows)*7)
	b.WriteString("INSERT OR REPLACE INTO failed_domains (domain, reason, error_msg, ips, url_count, stage, detected_at) VALUES ")
	for i, r := range rows {
		if i > 0 {
			b.WriteByte(',')
		}
		b.WriteString("(?,?,?,?,?,?,?)")
		args = append(args, r.Domain, r.Reason, r.ErrorMsg, r.IPs, r.URLCount, r.Stage, r.DetectedAt)
	}
	if _, err := db.Exec(b.String(), args...); err != nil {
		return fmt.Errorf("writing per-domain failed_domains for %s: %w", domain, err)
	}
	w.failedDomainRows += int64(len(rows))
	return nil
}

func (w *ccPerDomainRecrawlWriter) writeFailedURLs(domain string, rows []ccDomainFailedURLRow) error {
	if len(rows) == 0 {
		return nil
	}
	db, err := w.openDomainDB(domain)
	if err != nil {
		return err
	}
	defer db.Close()

	var b strings.Builder
	args := make([]any, 0, len(rows)*9)
	b.WriteString("INSERT OR REPLACE INTO failed_urls (url, domain, reason, error_msg, status_code, fetch_time_ms, content_type, redirect_url, detected_at) VALUES ")
	for i, r := range rows {
		if i > 0 {
			b.WriteByte(',')
		}
		b.WriteString("(?,?,?,?,?,?,?,?,?)")
		args = append(args, r.URL, r.Domain, r.Reason, r.ErrorMsg, r.StatusCode, r.FetchTimeMs, r.ContentType, r.RedirectURL, r.DetectedAt)
	}
	if _, err := db.Exec(b.String(), args...); err != nil {
		return fmt.Errorf("writing per-domain failed_urls for %s: %w", domain, err)
	}
	w.failedURLRows += int64(len(rows))
	return nil
}

func ccExportDomainResultsFromShards(ctx context.Context, writer *ccPerDomainRecrawlWriter, resultDir string) error {
	entries, err := os.ReadDir(resultDir)
	if err != nil {
		return fmt.Errorf("reading results dir: %w", err)
	}
	var shardPaths []string
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		if strings.HasPrefix(e.Name(), "results_") && strings.HasSuffix(e.Name(), ".duckdb") {
			shardPaths = append(shardPaths, filepath.Join(resultDir, e.Name()))
		}
	}
	sort.Strings(shardPaths)
	if len(shardPaths) == 0 {
		return nil
	}

	fmt.Println(labelStyle.Render(fmt.Sprintf("  Exporting results rows from %d shard(s)...", len(shardPaths))))
	var totalRows int64
	for i, shardPath := range shardPaths {
		db, err := sql.Open("duckdb", shardPath+"?access_mode=READ_ONLY")
		if err != nil {
			return fmt.Errorf("opening result shard %s: %w", shardPath, err)
		}
		rows, err := db.QueryContext(ctx, `
			SELECT url, status_code, COALESCE(content_type,''), COALESCE(content_length,0),
			       COALESCE(body,''), COALESCE(title,''), COALESCE(description,''),
			       COALESCE(language,''), COALESCE(domain,''), COALESCE(redirect_url,''),
			       COALESCE(fetch_time_ms,0), crawled_at, COALESCE(error,''), COALESCE(status,'')
			FROM results
			WHERE COALESCE(domain,'') <> ''
			ORDER BY domain, url
		`)
		if err != nil {
			db.Close()
			return fmt.Errorf("querying result shard %s: %w", shardPath, err)
		}

		var currentDomain string
		buf := make([]ccDomainResultRow, 0, 64)
		flush := func() error {
			if currentDomain == "" || len(buf) == 0 {
				return nil
			}
			if err := writer.writeResults(currentDomain, buf); err != nil {
				return err
			}
			totalRows += int64(len(buf))
			buf = buf[:0]
			return nil
		}

		for rows.Next() {
			var r ccDomainResultRow
			var crawledAt sql.NullTime
			if err := rows.Scan(&r.URL, &r.StatusCode, &r.ContentType, &r.ContentLength, &r.Body, &r.Title, &r.Description,
				&r.Language, &r.Domain, &r.RedirectURL, &r.FetchTimeMs, &crawledAt, &r.Error, &r.Status); err != nil {
				rows.Close()
				db.Close()
				return fmt.Errorf("scanning result shard row: %w", err)
			}
			if crawledAt.Valid {
				r.CrawledAt = crawledAt.Time
			}
			if currentDomain != "" && r.Domain != currentDomain {
				if err := flush(); err != nil {
					rows.Close()
					db.Close()
					return err
				}
			}
			currentDomain = r.Domain
			buf = append(buf, r)
		}
		if err := rows.Err(); err != nil {
			rows.Close()
			db.Close()
			return fmt.Errorf("iterating result shard rows: %w", err)
		}
		if err := flush(); err != nil {
			rows.Close()
			db.Close()
			return err
		}
		rows.Close()
		db.Close()
		fmt.Println(labelStyle.Render(fmt.Sprintf("    [%d/%d] %s (%s result rows total)",
			i+1, len(shardPaths), filepath.Base(shardPath), ccFmtInt64(totalRows))))
	}
	return nil
}

func ccExportDomainFailures(ctx context.Context, writer *ccPerDomainRecrawlWriter, failedDBPath string) error {
	fmt.Println(labelStyle.Render("  Exporting failed_domains rows..."))
	if err := ccExportDomainFailedDomains(ctx, writer, failedDBPath); err != nil {
		return err
	}
	fmt.Println(labelStyle.Render("  Exporting failed_urls rows..."))
	if err := ccExportDomainFailedURLs(ctx, writer, failedDBPath); err != nil {
		return err
	}
	return nil
}

func ccExportDomainFailedDomains(ctx context.Context, writer *ccPerDomainRecrawlWriter, failedDBPath string) error {
	db, err := sql.Open("duckdb", failedDBPath+"?access_mode=READ_ONLY")
	if err != nil {
		return fmt.Errorf("opening failed db (failed_domains): %w", err)
	}
	defer db.Close()
	rows, err := db.QueryContext(ctx, `
		SELECT domain, COALESCE(reason,''), COALESCE(error_msg,''), COALESCE(ips,''),
		       COALESCE(url_count,0), COALESCE(stage,''), detected_at
		FROM failed_domains
		WHERE COALESCE(domain,'') <> ''
		ORDER BY domain
	`)
	if err != nil {
		return fmt.Errorf("querying failed_domains: %w", err)
	}
	defer rows.Close()

	var currentDomain string
	buf := make([]ccDomainFailedDomainRow, 0, 2)
	var processed int64
	flush := func() error {
		if currentDomain == "" || len(buf) == 0 {
			return nil
		}
		if err := writer.writeFailedDomains(currentDomain, buf); err != nil {
			return err
		}
		processed += int64(len(buf))
		buf = buf[:0]
		return nil
	}
	for rows.Next() {
		var r ccDomainFailedDomainRow
		if err := rows.Scan(&r.Domain, &r.Reason, &r.ErrorMsg, &r.IPs, &r.URLCount, &r.Stage, &r.DetectedAt); err != nil {
			return fmt.Errorf("scanning failed_domains row: %w", err)
		}
		if currentDomain != "" && r.Domain != currentDomain {
			if err := flush(); err != nil {
				return err
			}
		}
		currentDomain = r.Domain
		buf = append(buf, r)
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("iterating failed_domains rows: %w", err)
	}
	if err := flush(); err != nil {
		return err
	}
	fmt.Println(labelStyle.Render(fmt.Sprintf("    failed_domains: %s", ccFmtInt64(processed))))
	return nil
}

func ccExportDomainFailedURLs(ctx context.Context, writer *ccPerDomainRecrawlWriter, failedDBPath string) error {
	db, err := sql.Open("duckdb", failedDBPath+"?access_mode=READ_ONLY")
	if err != nil {
		return fmt.Errorf("opening failed db (failed_urls): %w", err)
	}
	defer db.Close()
	rows, err := db.QueryContext(ctx, `
		SELECT url, domain, COALESCE(reason,''), COALESCE(error_msg,''), COALESCE(status_code,0),
		       COALESCE(fetch_time_ms,0), COALESCE(content_type,''), COALESCE(redirect_url,''), detected_at
		FROM failed_urls
		WHERE COALESCE(domain,'') <> ''
		ORDER BY domain, url
	`)
	if err != nil {
		return fmt.Errorf("querying failed_urls: %w", err)
	}
	defer rows.Close()

	var currentDomain string
	buf := make([]ccDomainFailedURLRow, 0, 64)
	var processed int64
	flush := func() error {
		if currentDomain == "" || len(buf) == 0 {
			return nil
		}
		if err := writer.writeFailedURLs(currentDomain, buf); err != nil {
			return err
		}
		processed += int64(len(buf))
		buf = buf[:0]
		if processed > 0 && processed%10000 == 0 {
			fmt.Println(labelStyle.Render(fmt.Sprintf("    failed_urls: %s", ccFmtInt64(processed))))
		}
		return nil
	}
	for rows.Next() {
		var r ccDomainFailedURLRow
		if err := rows.Scan(&r.URL, &r.Domain, &r.Reason, &r.ErrorMsg, &r.StatusCode, &r.FetchTimeMs, &r.ContentType, &r.RedirectURL, &r.DetectedAt); err != nil {
			return fmt.Errorf("scanning failed_urls row: %w", err)
		}
		if currentDomain != "" && r.Domain != currentDomain {
			if err := flush(); err != nil {
				return err
			}
		}
		currentDomain = r.Domain
		buf = append(buf, r)
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("iterating failed_urls rows: %w", err)
	}
	if err := flush(); err != nil {
		return err
	}
	fmt.Println(labelStyle.Render(fmt.Sprintf("    failed_urls: %s", ccFmtInt64(processed))))
	return nil
}

func ccRecrawlParquetFolderName(parquetPath string) string {
	base := filepath.Base(parquetPath)
	if strings.HasPrefix(base, "part-") {
		rest := strings.TrimPrefix(base, "part-")
		if dash := strings.IndexByte(rest, '-'); dash > 0 {
			num := rest[:dash]
			if _, err := strconv.Atoi(num); err == nil {
				return num
			}
		}
	}
	base = strings.TrimSuffix(base, filepath.Ext(base))
	base = strings.TrimSuffix(base, ".parquet")
	return sanitizePathToken(base)
}
