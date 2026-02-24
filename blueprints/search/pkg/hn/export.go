package hn

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"
)

type ExportOptions struct {
	OutDir           string
	FromMonth        string // YYYY-MM
	ToMonth          string // YYYY-MM
	Force            bool
	RefreshLatest    bool
}

type ExportMonth struct {
	Month    string
	Rows     int64
	Path     string
	Skipped  bool
	Refreshed bool
	Size     int64
}

type ExportResult struct {
	OutDir        string
	LatestMonth   string
	MonthsScanned int
	MonthsWritten int
	MonthsSkipped int
	RowsWritten   int64
	BytesWritten  int64
	Elapsed       time.Duration
	Months        []ExportMonth
}

func (c Config) ExportMonthlyParquet(ctx context.Context, opts ExportOptions) (*ExportResult, error) {
	cfg := c.WithDefaults()
	outDir := strings.TrimSpace(opts.OutDir)
	if outDir == "" {
		outDir = filepath.Join(cfg.BaseDir(), "export", "hn", "monthly")
	}
	if err := os.MkdirAll(outDir, 0o755); err != nil {
		return nil, fmt.Errorf("create export dir: %w", err)
	}
	fromMonth, err := parseYYYYMM(opts.FromMonth)
	if err != nil {
		return nil, fmt.Errorf("parse from month: %w", err)
	}
	toMonth, err := parseYYYYMM(opts.ToMonth)
	if err != nil {
		return nil, fmt.Errorf("parse to month: %w", err)
	}

	months, err := cfg.clickHouseMonths(ctx)
	if err != nil {
		return nil, err
	}
	res := &ExportResult{OutDir: outDir}
	if len(months) == 0 {
		return res, nil
	}
	res.LatestMonth = months[len(months)-1].Month
	started := time.Now()

	for _, m := range months {
		tm, _ := time.Parse("2006-01", m.Month)
		if !fromMonth.IsZero() && tm.Before(fromMonth) {
			continue
		}
		if !toMonth.IsZero() && tm.After(toMonth) {
			continue
		}
		res.MonthsScanned++
		outPath := filepath.Join(outDir, fmt.Sprintf("items_%s.parquet", strings.ReplaceAll(m.Month, "-", "_")))
		exists := fileExistsNonEmpty(outPath)
		refreshLatest := opts.RefreshLatest && exists && m.Month == res.LatestMonth
		if exists && !opts.Force && !refreshLatest {
			res.MonthsSkipped++
			res.Months = append(res.Months, ExportMonth{Month: m.Month, Rows: m.Rows, Path: outPath, Skipped: true, Size: ternaryFileSize(outPath)})
			continue
		}
		if err := cfg.downloadClickHouseMonthParquet(ctx, m.Month, outPath); err != nil {
			return nil, err
		}
		sz, _ := fileSize(outPath)
		res.MonthsWritten++
		res.RowsWritten += m.Rows
		res.BytesWritten += sz
		res.Months = append(res.Months, ExportMonth{Month: m.Month, Rows: m.Rows, Path: outPath, Refreshed: refreshLatest, Size: sz})
	}
	res.Elapsed = time.Since(started)
	return res, nil
}

type clickHouseMonthRow struct {
	Month string `json:"ym"`
	Rows  any    `json:"n"`
}

func (c Config) clickHouseMonths(ctx context.Context) ([]ExportMonth, error) {
	cfg := c.WithDefaults()
	q := fmt.Sprintf(`SELECT formatDateTime(toStartOfMonth(time), '%%Y-%%m') AS ym, toInt64(count()) AS n
FROM %s
WHERE time IS NOT NULL
GROUP BY ym
ORDER BY ym
FORMAT JSONEachRow`, cfg.clickHouseFQTable())
	body, err := cfg.clickHouseQuery(ctx, q)
	if err != nil {
		return nil, fmt.Errorf("clickhouse list months: %w", err)
	}
	lines := strings.Split(strings.TrimSpace(string(body)), "\n")
	out := make([]ExportMonth, 0, len(lines))
	for _, line := range lines {
		if strings.TrimSpace(line) == "" {
			continue
		}
		var r clickHouseMonthRow
		if err := json.Unmarshal([]byte(line), &r); err != nil {
			return nil, fmt.Errorf("decode clickhouse month row: %w", err)
		}
		n, err := parseInt64Any(r.Rows)
		if err != nil {
			return nil, fmt.Errorf("parse clickhouse month row count: %w", err)
		}
		out = append(out, ExportMonth{Month: r.Month, Rows: n})
	}
	return out, nil
}

func (c Config) downloadClickHouseMonthParquet(ctx context.Context, month string, outPath string) error {
	cfg := c.WithDefaults()
	tm, err := time.Parse("2006-01", month)
	if err != nil {
		return fmt.Errorf("parse month %q: %w", month, err)
	}
	next := tm.AddDate(0, 1, 0)
	query := fmt.Sprintf(`SELECT * FROM %s
WHERE time >= toDateTime('%s-01 00:00:00')
  AND time < toDateTime('%s-01 00:00:00')
ORDER BY id
FORMAT Parquet`, cfg.clickHouseFQTable(), tm.Format("2006-01"), next.Format("2006-01"))

	if err := os.MkdirAll(filepath.Dir(outPath), 0o755); err != nil {
		return fmt.Errorf("create export month dir: %w", err)
	}
	tmpPath := outPath + ".tmp"
	_ = os.Remove(tmpPath)
	req, err := cfg.newClickHouseRequest(ctx, query)
	if err != nil {
		return err
	}
	resp, err := cfg.clickHouseDownloadHTTPClient().Do(req)
	if err != nil {
		return fmt.Errorf("clickhouse month export %s request: %w", month, err)
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		b, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
		return fmt.Errorf("clickhouse month export %s returned %d: %s", month, resp.StatusCode, strings.TrimSpace(string(b)))
	}
	f, err := os.Create(tmpPath)
	if err != nil {
		return fmt.Errorf("create month parquet tmp file: %w", err)
	}
	_, copyErr := io.Copy(f, resp.Body)
	closeErr := f.Close()
	if copyErr != nil || closeErr != nil {
		_ = os.Remove(tmpPath)
		if copyErr != nil {
			return fmt.Errorf("write month parquet %s: %w", month, copyErr)
		}
		return fmt.Errorf("close month parquet %s: %w", month, closeErr)
	}
	if err := os.Rename(tmpPath, outPath); err != nil {
		_ = os.Remove(tmpPath)
		return fmt.Errorf("rename month parquet %s: %w", month, err)
	}
	return nil
}

func parseYYYYMM(s string) (time.Time, error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return time.Time{}, nil
	}
	return time.Parse("2006-01", s)
}

func ternaryFileSize(path string) int64 {
	sz, _ := fileSize(path)
	return sz
}
