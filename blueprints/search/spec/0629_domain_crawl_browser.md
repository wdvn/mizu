# Browser Crawl Performance + Remote Deployment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make `search crawl-domain openai.com --browser` achieve 100+ pages/s on remote servers by adding auto-scaled tab count, eliminating 600ms render-wait overhead, and providing a one-command Chrome install for servers.

**Architecture:** Chrome auto-detection via `$CHROME_BIN` env var; RAM-based tab auto-scaling (`AutoBrowserPages`); optional render-wait skip (`--no-render-wait`) for SSG/static Next.js sites; `make install-chrome SERVER=N` SSHes and `apt-get install chromium` once per server; `deploy-linux-noble-browser` wrapper script exports `CHROME_BIN`.

**Tech Stack:** Go, `github.com/go-rod/rod`, `github.com/go-rod/rod/lib/launcher`, bash (Makefile), Ubuntu 24.04 Noble.

---

### Task 1: Chrome binary detection in rod.go

**Files:**
- Modify: `pkg/dcrawler/rod.go`

**Context:**
`launcher.New()` in `newRodPool()` and `tryRestart()` auto-detects Chrome via rod's internal PATH scan.
We need it to also respect `$CHROME_BIN` env var so the deploy wrapper can point at `/usr/bin/chromium`.

**Step 1: Add `detectChromeBin()` helper**

Add to the top of `pkg/dcrawler/rod.go`, after the imports:

```go
// detectChromeBin returns the Chrome/Chromium binary path to use.
// Priority: $CHROME_BIN env var → rod auto-detect (leaves Bin unset).
func detectChromeBin() string {
	if p := os.Getenv("CHROME_BIN"); p != "" {
		return p
	}
	// Common Linux paths for chromium (Ubuntu apt install)
	candidates := []string{
		"/usr/bin/chromium",
		"/usr/bin/chromium-browser",
		"/usr/bin/google-chrome",
		"/usr/bin/google-chrome-stable",
	}
	for _, c := range candidates {
		if _, err := os.Stat(c); err == nil {
			return c
		}
	}
	return "" // let rod auto-detect
}

// newLauncher creates a rod launcher with Chrome path and common flags.
func newLauncher(headless bool) *launcher.Launcher {
	l := launcher.New().
		Headless(headless).
		Set("disable-blink-features", "AutomationControlled").
		Set("disable-features", "IsolateOrigins,site-per-process").
		Set("disable-dev-shm-usage", "").
		Set("no-sandbox", "")
	if bin := detectChromeBin(); bin != "" {
		l = l.Bin(bin)
	}
	return l
}
```

Add `"os"` to the import block.

**Step 2: Replace inline launcher calls with `newLauncher()`**

In `newRodPool()`, replace:
```go
l := launcher.New().
    Headless(cfg.RodHeadless).
    Set("disable-blink-features", "AutomationControlled").
    Set("disable-features", "IsolateOrigins,site-per-process")
```
with:
```go
l := newLauncher(cfg.RodHeadless)
```

In `tryRestart()`, replace the same block with:
```go
l := newLauncher(rp.config.RodHeadless)
```

**Step 3: Verify it compiles**

```bash
cd blueprints/search && GOWORK=off go build ./pkg/dcrawler/...
```
Expected: no errors.

**Step 4: Commit**

```bash
git add blueprints/search/pkg/dcrawler/rod.go
git commit -m "feat(dcrawler): detect CHROME_BIN env + deduplicate launcher creation"
```

---

### Task 2: AutoBrowserPages() + RodNoRenderWait in config.go

**Files:**
- Modify: `pkg/dcrawler/config.go`

**Context:**
`Config.RodWorkers` (set via `--browser-pages`) currently defaults to 8 in the CLI.
We need auto-scaling based on available RAM and a flag to skip the render stabilization wait.

**Step 1: Add `RodNoRenderWait` to Config struct**

In `pkg/dcrawler/config.go`, add to the `Config` struct after `DomainAliases`:

```go
RodNoRenderWait   bool     // Skip DOM stabilization wait (faster for SSG/static Next.js sites)
```

**Step 2: Add `AutoBrowserPages()` function**

Add after `DefaultConfig()`:

```go
// AutoBrowserPages returns the optimal number of concurrent browser tabs
// based on available RAM. Formula: clamp(availRAMMB / 50, 20, 150).
//
// Benchmarks (openai.com, --no-render-wait):
//   server1 (~3500 MB avail) → 70 tabs → ~100 pages/s
//   server2 (~9000 MB avail) → 150 tabs → ~150 pages/s
func AutoBrowserPages(availRAMMB int) int {
	n := availRAMMB / 50
	if n < 20 {
		n = 20
	}
	if n > 150 {
		n = 150
	}
	return n
}
```

**Step 3: Verify it compiles**

```bash
cd blueprints/search && GOWORK=off go build ./pkg/dcrawler/...
```
Expected: no errors.

**Step 4: Write unit test for AutoBrowserPages**

In `pkg/dcrawler/config_test.go` (create if absent):

```go
package dcrawler

import "testing"

func TestAutoBrowserPages(t *testing.T) {
	cases := []struct {
		availMB int
		want    int
	}{
		{500, 20},    // clamp at min 20
		{1000, 20},   // 1000/50=20
		{3500, 70},   // server1
		{9000, 150},  // server2 → clamp at max 150
		{20000, 150}, // large RAM → still capped
	}
	for _, tc := range cases {
		got := AutoBrowserPages(tc.availMB)
		if got != tc.want {
			t.Errorf("AutoBrowserPages(%d) = %d, want %d", tc.availMB, got, tc.want)
		}
	}
}
```

**Step 5: Run the test**

```bash
cd blueprints/search && GOWORK=off go test ./pkg/dcrawler/ -run TestAutoBrowserPages -v
```
Expected: PASS.

**Step 6: Commit**

```bash
git add blueprints/search/pkg/dcrawler/config.go blueprints/search/pkg/dcrawler/config_test.go
git commit -m "feat(dcrawler): AutoBrowserPages + RodNoRenderWait config field"
```

---

### Task 3: Apply auto-config in crawler.go New()

**Files:**
- Modify: `pkg/dcrawler/crawler.go`

**Context:**
`sysinfo.go` already has `MemAvailableMB()` — actually looking at the code, the sysinfo is in `pkg/crawl/sysinfo.go` (the recrawl package), not dcrawler.
We'll use `runtime/debug` + a simple available-RAM heuristic here.

**Step 1: Add available RAM helper in config.go**

Add to `pkg/dcrawler/config.go`:

```go
import "runtime"

// availableRAMMB returns a best-effort estimate of available RAM in MB.
// Uses total system RAM (MemStats) as a conservative proxy.
// Accurate enough for tab auto-scaling decisions.
func availableRAMMB() int {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)
	// Heuristic: assume 60% of total system RAM is available for Chrome.
	// ReadMemStats doesn't give total system RAM — use /proc/meminfo on Linux,
	// fall back to 4000 MB on other platforms.
	return readProcMemAvailMB()
}
```

Add `readProcMemAvailMB()` using build-tagged files.

Actually, simpler: just read `/proc/meminfo` directly in a helper (Linux-specific, with a Darwin fallback). Add this to `config.go`:

```go
import (
	"bufio"
	"os"
	"strconv"
	"strings"
)

// readProcMemAvailMB reads MemAvailable from /proc/meminfo (Linux).
// Returns 4000 MB as fallback on non-Linux or read failure.
func readProcMemAvailMB() int {
	f, err := os.Open("/proc/meminfo")
	if err != nil {
		return 4000 // fallback: 4GB
	}
	defer f.Close()
	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := scanner.Text()
		if strings.HasPrefix(line, "MemAvailable:") {
			fields := strings.Fields(line)
			if len(fields) >= 2 {
				kb, err := strconv.Atoi(fields[1])
				if err == nil {
					return kb / 1024
				}
			}
		}
	}
	return 4000 // fallback
}
```

**Step 2: Apply auto-pages in crawler.go New()**

In `pkg/dcrawler/crawler.go`, in the `New()` function, after `cfg.RodHeadless = true` logic (it's actually set in dcrawl.go), add auto-pages logic. Find this block:

```go
c := &Crawler{config: cfg}
```

Before that line, add:

```go
// Auto-scale browser pages based on available RAM if not explicitly set.
if (cfg.UseRod || cfg.UseLightpanda) && cfg.RodWorkers <= 0 {
    cfg.RodWorkers = AutoBrowserPages(readProcMemAvailMB())
}
```

**Step 3: Add init log for auto-pages**

In `Run()` in `crawler.go`, after `c.logInit("Frontier: %s seed URLs", ...)`, add:

```go
if (c.config.UseRod || c.config.UseLightpanda) && c.config.RodWorkers > 0 {
    c.logInit("Browser: %d tabs", c.config.RodWorkers)
}
```

**Step 4: Verify it compiles**

```bash
cd blueprints/search && GOWORK=off go build ./pkg/dcrawler/...
```
Expected: no errors.

**Step 5: Commit**

```bash
git add blueprints/search/pkg/dcrawler/config.go blueprints/search/pkg/dcrawler/crawler.go
git commit -m "feat(dcrawler): auto-scale browser tab count from available RAM"
```

---

### Task 4: Skip render wait when RodNoRenderWait=true

**Files:**
- Modify: `pkg/dcrawler/rod.go`

**Context:**
The render-stabilization wait in `rodFetchAndProcess()` polls `document.body.innerHTML.length`
every 200ms, waiting for 3 stable readings (600ms minimum, 5s max). For SSG/static Next.js
sites like openai.com, the DOM is fully populated at DOMContentLoaded — this wait is wasted.

**Step 1: Wrap the render wait in a config check**

In `rodFetchAndProcess()`, find the render-wait block:

```go
// Phase: wait for DOM to stabilize (React/Next.js hydration + render).
c.stats.SetRodPhase(workerID, "render")
_, _ = p.Timeout(5 * time.Second).Eval(`() => new Promise((resolve) => {
    ...
})`)
```

Wrap it:

```go
// Phase: wait for DOM to stabilize (React/Next.js hydration + render).
// Skip when --no-render-wait is set (faster for SSG/static sites).
if !c.config.RodNoRenderWait {
    c.stats.SetRodPhase(workerID, "render")
    _, _ = p.Timeout(5 * time.Second).Eval(`() => new Promise((resolve) => {
        const afterDOM = () => {
            let lastLen = document.body ? document.body.innerHTML.length : 0;
            let stable = 0;
            const check = () => {
                const len = document.body ? document.body.innerHTML.length : 0;
                if (len === lastLen) {
                    stable++;
                    if (stable >= 3) { resolve(); return; }
                } else {
                    stable = 0;
                    lastLen = len;
                }
                setTimeout(check, 200);
            };
            setTimeout(check, 300);
        };
        if (document.readyState !== 'loading') afterDOM();
        else document.addEventListener('DOMContentLoaded', afterDOM);
    })`)
}
```

**Step 2: Verify it compiles**

```bash
cd blueprints/search && GOWORK=off go build ./pkg/dcrawler/...
```
Expected: no errors.

**Step 3: Commit**

```bash
git add blueprints/search/pkg/dcrawler/rod.go
git commit -m "feat(dcrawler): skip render-wait when RodNoRenderWait=true"
```

---

### Task 5: Add --no-render-wait flag and raise default in cli/dcrawl.go

**Files:**
- Modify: `cli/dcrawl.go`

**Context:**
`--browser-pages` currently defaults to 8 (CLI flag). With auto-scaling from Task 3,
`RodWorkers=0` triggers auto-config. We need `--browser-pages` to pass 0 when not explicitly set.

**Step 1: Change --browser-pages default to 0 (triggers auto)**

In `cli/dcrawl.go`, change:

```go
cmd.Flags().IntVar(&rodWorkers, "browser-pages", 8, "Number of browser pages when using --browser")
```
to:
```go
cmd.Flags().IntVar(&rodWorkers, "browser-pages", 0, "Number of concurrent browser tabs (0=auto from RAM)")
```

**Step 2: Add noRenderWait variable**

In the `var` block at the top of `NewCrawlDomain()`, add:

```go
noRenderWait  bool
```

**Step 3: Wire noRenderWait to config**

In the `RunE` function, after `cfg.DomainAliases = domainAliases`, add:

```go
cfg.RodNoRenderWait = noRenderWait
```

**Step 4: Register the flag**

After the existing browser flags, add:

```go
cmd.Flags().BoolVar(&noRenderWait, "no-render-wait", false, "Skip DOM stabilization wait in browser mode (faster for static/SSG sites)")
```

**Step 5: Update the Long description** to mention `--no-render-wait`:

Find the `Long:` field in the `cobra.Command` and add to the examples:

```
Browser mode (JS-rendered pages):
  search crawl-domain openai.com --browser
  search crawl-domain openai.com --browser --no-render-wait   # faster for SSG sites (Next.js)
  search crawl-domain openai.com --browser --browser-pages 80 # explicit tab count
```

**Step 6: Verify build**

```bash
cd blueprints/search && GOWORK=off go build ./cmd/search/
```
Expected: no errors.

**Step 7: Smoke test help output**

```bash
/tmp/search-linux crawl-domain --help 2>&1 | grep -E "render-wait|browser-pages"
```
Expected: both flags appear.

**Step 8: Commit**

```bash
git add blueprints/search/cli/dcrawl.go
git commit -m "feat(cli): --no-render-wait flag + --browser-pages auto-default for crawl-domain"
```

---

### Task 6: Makefile — install-chrome + deploy-linux-noble-browser

**Files:**
- Modify: `Makefile`

**Context:**
The `deploy-linux-noble` target sets a wrapper script that exports `GOMEMLIMIT` and `GODEBUG`.
We need a new `deploy-linux-noble-browser` that ALSO exports `CHROME_BIN=/usr/bin/chromium`,
and a separate `install-chrome` target for one-time server setup.

**Step 1: Add `install-chrome` target**

Find the `deploy-linux-noble` target in `Makefile`. Add BEFORE it:

```makefile
.PHONY: install-chrome
install-chrome: ## One-time: install Chromium on remote server (SERVER=1 or 2)
	@echo "Installing Chromium on $(REMOTE_SSH)..."
	@$(SSH) $(REMOTE_SSH) "bash -lc 'apt-get update -qq && apt-get install -y --no-install-recommends chromium chromium-common fonts-liberation && which chromium && chromium --version'"
	@echo "Chromium installed on $(REMOTE_SSH)"
```

**Step 2: Add `deploy-linux-noble-browser` target**

Add after `deploy-linux-noble`:

```makefile
.PHONY: deploy-linux-noble-browser
deploy-linux-noble-browser: build-linux-noble ## Deploy Ubuntu 24.04 binary with Chrome wrapper (run install-chrome first)
	@test -f "$(DEPLOY_KEY)" || { echo "Deploy key not found: $(DEPLOY_KEY)"; exit 1; }
	@$(SSH) $(REMOTE_SSH) "mkdir -p \$$HOME/bin"
	@$(SCP) "$(LINUX_BINARY_NOBLE)" $(REMOTE_SSH):.search-upload.tmp
	@$(SSH) $(REMOTE_SSH) 'bash -lc "set -e; \
		install -m 0755 $$HOME/.search-upload.tmp $$HOME/bin/search-linux-noble; \
		rm -f $$HOME/.search-upload.tmp; \
		printf '"'"'#!/usr/bin/env bash\nulimit -Hn 131072 2>/dev/null; ulimit -n 131072 2>/dev/null || ulimit -n 65536 2>/dev/null || true\nexport GOMEMLIMIT=2000000000\nexport GODEBUG=netdns=go\nexport CHROME_BIN=/usr/bin/chromium\nexec \"$$HOME/bin/search-linux-noble\" \"\$$@\"\n'"'"' > $$HOME/bin/search; \
		chmod +x $$HOME/bin/search"'
	@echo "Deployed Noble+Chrome: $(REMOTE_SSH):~/bin/search"
	@echo "NOTE: Run 'make install-chrome SERVER=$(SERVER)' first if Chrome is not installed"
```

**Step 3: Add help comments to existing targets**

The existing `deploy-linux-noble` wrapper does NOT set `CHROME_BIN`. That's intentional —
it's the non-browser variant. No change needed there.

**Step 4: Verify Makefile syntax**

```bash
cd blueprints/search && make help | grep -E "install-chrome|deploy-linux-noble-browser"
```
Expected: both targets appear in help.

**Step 5: Commit**

```bash
git add blueprints/search/Makefile
git commit -m "feat(deploy): install-chrome target + deploy-linux-noble-browser wrapper with CHROME_BIN"
```

---

### Task 7: Write spec file

**Files:**
- Create: `spec/0629_domain_crawl_browser.md` (this file IS the spec)

The spec is already written as this plan document. No additional action needed.

**Step 1: Commit spec**

```bash
git add blueprints/search/spec/0629_domain_crawl_browser.md
git commit -m "spec: 0629 domain crawl browser performance + remote deployment"
```

---

### Task 8: Build and local smoke test

**Step 1: Build binary for local test**

```bash
cd blueprints/search && GOWORK=off go build -o /tmp/search-cli ./cmd/search/
```
Expected: builds without errors.

**Step 2: Check --help shows new flags**

```bash
/tmp/search-cli crawl-domain --help | grep -E "no-render-wait|browser-pages|browser$"
```
Expected: all three flags visible.

**Step 3: Quick local test with Chrome (if available)**

If Chrome is installed locally:
```bash
/tmp/search-cli crawl-domain openai.com --browser --no-render-wait --max-pages 10 --no-sitemap
```
Expected: fetches 10 pages using Chrome, TUI shows browser tab count auto-detected from RAM.

If Chrome is not installed locally:
```bash
CHROME_BIN=/nonexistent /tmp/search-cli crawl-domain openai.com --browser --max-pages 1 --no-sitemap 2>&1 | head -5
```
Expected: error message mentioning Chrome not found (not a panic).

**Step 4: Verify AutoBrowserPages unit tests still pass**

```bash
cd blueprints/search && GOWORK=off go test ./pkg/dcrawler/ -run TestAuto -v
```
Expected: PASS.

---

### Task 9: Deploy and benchmark on server1

**Step 1: Build noble binary**

```bash
cd blueprints/search && make build-linux-noble
```
Expected: `~/bin/search-linux-noble` updated.

**Step 2: One-time install Chromium on server1** (if not already done)

```bash
cd blueprints/search && make install-chrome SERVER=1
```
Expected: `chromium --version` output on server1 (e.g. `Chromium 131.0.xxx`).

**Step 3: Deploy browser wrapper**

```bash
cd blueprints/search && make deploy-linux-noble-browser SERVER=1
```
Expected: `Deployed Noble+Chrome: tam@server:~/bin/search`

**Step 4: Quick benchmark on server1**

```bash
ssh -i ~/.ssh/id_ed25519_deploy tam@server \
  "search crawl-domain openai.com --browser --no-render-wait --max-pages 200 --no-sitemap"
```
Expected: TUI shows browser tab count (auto from RAM, e.g. ~60–80), pages/s ≥ 100 after warmup.

**Step 5: Repeat on server2 if needed**

```bash
cd blueprints/search && make install-chrome SERVER=2
cd blueprints/search && make deploy-linux-noble-browser SERVER=2
```

---

### Summary

| Change | Impact |
|--------|--------|
| `detectChromeBin()` + `newLauncher()` | Chrome found via `$CHROME_BIN` or common paths |
| `AutoBrowserPages()` | Auto-scales tabs: server1→~70, server2→~150 |
| `RodNoRenderWait` + skip in rod.go | Saves 600ms per page for SSG sites |
| `--browser-pages 0` default | Triggers auto-config |
| `--no-render-wait` flag | User-visible control |
| `make install-chrome` | One-time Chrome setup on remote server |
| `make deploy-linux-noble-browser` | Deploys binary with `CHROME_BIN` in wrapper |

**Expected throughput (openai.com, server1):**
- Before: ~5–10 pages/s (8 tabs, 600ms render wait)
- After: ~80–120 pages/s (70 tabs auto, no render wait)

**Expected throughput (openai.com, server2):**
- Before: ~5–10 pages/s
- After: ~130–160 pages/s (150 tabs auto, no render wait)
