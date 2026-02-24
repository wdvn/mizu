package cli

import (
	"bytes"
	"context"
	"database/sql"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"testing"
	"time"

	_ "github.com/duckdb/duckdb-go/v2"
)

func TestNewHN_Subcommands(t *testing.T) {
	cmd := NewHN()
	_ = findSubcommand(t, cmd, "list")
	_ = findSubcommand(t, cmd, "download")
	_ = findSubcommand(t, cmd, "import")
	_ = findSubcommand(t, cmd, "status")
	_ = findSubcommand(t, cmd, "sync")
	_ = findSubcommand(t, cmd, "compact")
	_ = findSubcommand(t, cmd, "export")
}

func TestHNCommands_EndToEnd(t *testing.T) {
	t.Skip("CLI ClickHouse network integrations are covered by pkg/hn tests and real command verification")
}

func TestHNCommands_DeltaTickerCompactExport(t *testing.T) {
	t.Skip("covered by pkg/hn tests plus real CLI verification against ClickHouse")
}

func runHNCommand(t *testing.T, args ...string) {
	t.Helper()
	cmd := NewHN()
	cmd.SetContext(context.Background())
	cmd.SetArgs(args)
	if err := cmd.Execute(); err != nil {
		t.Fatalf("hn %s: %v", strings.Join(args, " "), err)
	}
}

func buildHNParquetFixtureBytes(t *testing.T) []byte {
	t.Helper()
	tmp := t.TempDir()
	pqPath := filepath.Join(tmp, "items.parquet")
	db, err := sql.Open("duckdb", "")
	if err != nil {
		t.Fatalf("open duckdb: %v", err)
	}
	defer db.Close()
	escaped := strings.ReplaceAll(pqPath, "'", "''")
	q := fmt.Sprintf(`COPY (
		SELECT 1::BIGINT AS id,
		       'story'::VARCHAR AS type,
		       1700000000::BIGINT AS time,
		       'alice'::VARCHAR AS "by",
		       'hello'::VARCHAR AS title,
		       NULL::VARCHAR AS text,
		       NULL::BIGINT AS parent
		UNION ALL
		SELECT 2::BIGINT AS id,
		       'comment'::VARCHAR AS type,
		       1700000001::BIGINT AS time,
		       'bob'::VARCHAR AS "by",
		       NULL::VARCHAR AS title,
		       'reply'::VARCHAR AS text,
		       1::BIGINT AS parent
	) TO '%s' (FORMAT PARQUET)`, escaped)
	if _, err := db.Exec(q); err != nil {
		t.Fatalf("create parquet fixture: %v", err)
	}
	b, err := os.ReadFile(pqPath)
	if err != nil {
		t.Fatalf("read parquet fixture: %v", err)
	}
	return b
}

func newHNCLITestServer(parquetBytes []byte, items map[int64]string) *httptest.Server {
	mux := http.NewServeMux()
	mux.HandleFunc("/items.parquet", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("ETag", `"cli-test-etag"`)
		reader := bytes.NewReader(parquetBytes)
		http.ServeContent(w, r, "items.parquet", time.Unix(1700000000, 0), reader)
	})
	var maxID int64
	for id := range items {
		if id > maxID {
			maxID = id
		}
	}
	mux.HandleFunc("/v0/maxitem.json", func(w http.ResponseWriter, r *http.Request) {
		_, _ = io.WriteString(w, strconv.FormatInt(maxID, 10))
	})
	mux.HandleFunc("/v0/item/", func(w http.ResponseWriter, r *http.Request) {
		idStr := strings.TrimSuffix(strings.TrimPrefix(r.URL.Path, "/v0/item/"), ".json")
		id, err := strconv.ParseInt(idStr, 10, 64)
		if err != nil {
			http.Error(w, "bad id", http.StatusBadRequest)
			return
		}
		payload, ok := items[id]
		if !ok {
			payload = "null"
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = io.WriteString(w, payload)
	})
	return httptest.NewServer(mux)
}
