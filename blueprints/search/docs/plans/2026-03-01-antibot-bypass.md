# Anti-Bot Bypass Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make `search crawl-domain --browser` bypass Cloudflare, CloudFront, and any headless-Chrome-detection system by fixing the confirmed resource-blocking bug during CF challenges, adding a domain cookie jar, hardening browser fingerprints, adding proxy support, and adding human-like timing jitter.

**Architecture:** Five components all in `pkg/dcrawler/rod.go` + thin additions to `config.go` and `cli/dcrawl.go`. No new files. The cookie jar is added to `rodPool`; the challenge solver creates a temporary unblocked page; proxy support adds a `--proxy-server` Chrome flag; fingerprint hardening adds launch args and JS injection at page creation time; jitter adds a random sleep before each navigation.

**Tech Stack:** Go, `github.com/go-rod/rod v0.116.2`, `github.com/go-rod/stealth v0.4.9`, CDP `proto.*` package, bash Makefile for deploy.

---

## Context You Must Read First

Run: `cat blueprints/search/pkg/dcrawler/rod.go` — understand the full file before touching it.

Key facts:
- `stealth.Page(b)` is called in `getPage()` — already patches navigator.webdriver, canvas, WebGL
- `setupResourceBlocking(p)` adds a `HijackRequests` router that blocks images/fonts/CSS/media — this router runs forever in a goroutine and CANNOT be stopped per-page
- CF challenge detection is at line ~476: checks `info.Title == "Just a moment..."`, then waits 8s — **but resource blocking is still active → challenge JS can never load → bug**
- `page.Cookies(urls []string) ([]*proto.NetworkCookie, error)` — gets cookies
- `page.SetCookies(cookies []*proto.NetworkCookieParam) error` — sets cookies
- `NetworkCookieParam` fields: Name, Value, Domain, Path, Secure, HTTPOnly, SameSite, URL

All changes are in `blueprints/search/` directory. Run tests with `go test ./pkg/dcrawler/...` from that dir.

---

## Task 1: Cookie jar + cookie helpers

**Files:**
- Modify: `pkg/dcrawler/rod.go` (add cookieJar type + helpers, add jar field to rodPool, init in newRodPool)

### Step 1: Add the cookieJar type and helpers after the `rodPool` struct definition (after line 84)

Find the `type rodPool struct {` block (lines 77–84). After the closing `}`, add:

```go
// cookieJar stores cookies per domain so CF clearance cookies solved by one tab
// are shared with all other tabs. Thread-safe.
type cookieJar struct {
	mu      sync.RWMutex
	cookies map[string][]*proto.NetworkCookie // hostname → cookies
}

func newCookieJar() *cookieJar {
	return &cookieJar{cookies: make(map[string][]*proto.NetworkCookie)}
}

// store replaces all cookies for a hostname.
func (j *cookieJar) store(host string, cookies []*proto.NetworkCookie) {
	j.mu.Lock()
	defer j.mu.Unlock()
	j.cookies[host] = cookies
}

// merge merges new cookies into existing ones for a hostname (newer values win).
func (j *cookieJar) merge(host string, incoming []*proto.NetworkCookie) {
	j.mu.Lock()
	defer j.mu.Unlock()
	existing := j.cookies[host]
	m := make(map[string]*proto.NetworkCookie, len(existing)+len(incoming))
	for _, c := range existing {
		m[c.Name] = c
	}
	for _, c := range incoming {
		m[c.Name] = c // newer wins
	}
	merged := make([]*proto.NetworkCookie, 0, len(m))
	for _, c := range m {
		merged = append(merged, c)
	}
	j.cookies[host] = merged
}

// get returns stored cookies for a hostname (nil if none).
func (j *cookieJar) get(host string) []*proto.NetworkCookie {
	j.mu.RLock()
	defer j.mu.RUnlock()
	return j.cookies[host]
}

// cookiesToParams converts NetworkCookie (read) to NetworkCookieParam (write).
func cookiesToParams(cookies []*proto.NetworkCookie) []*proto.NetworkCookieParam {
	params := make([]*proto.NetworkCookieParam, 0, len(cookies))
	for _, c := range cookies {
		if c.Name != "" {
			params = append(params, &proto.NetworkCookieParam{
				Name:     c.Name,
				Value:    c.Value,
				Domain:   c.Domain,
				Path:     c.Path,
				Secure:   c.Secure,
				HTTPOnly: c.HTTPOnly,
				SameSite: c.SameSite,
			})
		}
	}
	return params
}
```

### Step 2: Add `jar *cookieJar` field to `rodPool` struct

The struct currently ends at line 84. Add `jar *cookieJar` as the last field:

```go
type rodPool struct {
	mu          sync.Mutex
	browser     *rod.Browser
	pool        rod.Pool[rod.Page]
	config      Config
	lastRestart time.Time
	restarts    int
	jar         *cookieJar // shared domain cookie store (CF clearance, session cookies)
}
```

### Step 3: Initialize jar in `newRodPool()`

In `newRodPool()`, in the return statement, add `jar: newCookieJar()`:

```go
return &rodPool{
	browser: browser,
	pool:    pool,
	config:  cfg,
	jar:     newCookieJar(),
}, nil
```

### Step 4: Verify it compiles

```bash
cd blueprints/search && go build ./pkg/dcrawler/...
```

Expected: no errors.

### Step 5: Commit

```bash
git add blueprints/search/pkg/dcrawler/rod.go
git commit -m "feat(dcrawler): add domain cookie jar to rodPool for cross-tab cookie sharing"
```

---

## Task 2: CF challenge solver + cookie injection before navigation

**Files:**
- Modify: `pkg/dcrawler/rod.go`

This is the highest-impact change. When CF challenge is detected, the current code waits 8s on a resource-blocked page — challenge JS can never load. Fix: spin up a temporary unblocked page to solve it, extract `cf_clearance`, inject into the blocked page, re-navigate.

Also: before every navigation, inject any stored domain cookies (so tabs benefit from cookies solved by other tabs).

### Step 1: Add `solveChallengeUnblocked` method to rodPool

Add after the `tryRestart` method (after line ~179):

```go
// solveChallengeUnblocked creates a temporary page WITHOUT resource blocking,
// navigates to the challenge URL, and waits up to 15s for CF Turnstile to solve.
// Returns the cookies from the solved page (including cf_clearance).
// The caller should inject these cookies into the main page and re-navigate.
func (rp *rodPool) solveChallengeUnblocked(ctx context.Context, pageURL string) ([]*proto.NetworkCookie, error) {
	rp.mu.Lock()
	b := rp.browser
	rp.mu.Unlock()

	// Create a fresh page WITHOUT resource blocking so CF Turnstile JS can load.
	p, err := stealth.Page(b)
	if err != nil {
		return nil, fmt.Errorf("challenge page: %w", err)
	}
	defer p.Close()

	solveCtx, cancel := context.WithTimeout(ctx, 20*time.Second)
	defer cancel()
	sp := p.Context(solveCtx)

	if _, err := proto.PageNavigate{URL: pageURL}.Call(sp); err != nil {
		return nil, fmt.Errorf("challenge navigate: %w", err)
	}

	// Poll title until "Just a moment..." clears (CF solved) or timeout.
	deadline := time.Now().Add(15 * time.Second)
	for time.Now().Before(deadline) && solveCtx.Err() == nil {
		info, err := sp.Timeout(2 * time.Second).Info()
		if err == nil && info != nil && info.Title != "Just a moment..." && info.Title != "" {
			break
		}
		select {
		case <-time.After(500 * time.Millisecond):
		case <-solveCtx.Done():
		}
	}

	cookies, err := p.Cookies([]string{pageURL})
	if err != nil {
		return nil, fmt.Errorf("challenge cookies: %w", err)
	}
	return cookies, nil
}
```

### Step 2: Add `injectJarCookies` helper

Add right after `solveChallengeUnblocked`:

```go
// injectJarCookies injects stored domain cookies into the page before navigation.
// This ensures CF clearance cookies solved by another tab are reused immediately.
func (rp *rodPool) injectJarCookies(page *rod.Page, pageURL string) {
	u, err := url.Parse(pageURL)
	if err != nil {
		return
	}
	stored := rp.jar.get(u.Hostname())
	if len(stored) == 0 {
		return
	}
	_ = page.SetCookies(cookiesToParams(stored))
}
```

### Step 3: Modify `rodFetchAndProcess` — inject cookies before navigation

In `rodFetchAndProcess`, find the comment `// Send the navigate command` (around line 385). **Before** the `proto.PageNavigate` call, add the cookie injection:

```go
	// Inject stored domain cookies (e.g., CF clearance from a previously solved challenge).
	rp.injectJarCookies(page, item.URL)

	// Send the navigate command — Chrome starts loading immediately.
	navRes, navErr := proto.PageNavigate{URL: item.URL}.Call(p)
```

### Step 4: Replace the CF challenge handling block

Find the existing `if isChallenge {` block (starts around line 494, ends around line 510). Replace it entirely with:

```go
		if isChallenge {
			c.stats.SetRodPhase(workerID, "cf-solve")
			// Resource blocking prevents CF Turnstile JS from loading on this page.
			// Spin up a temporary unblocked page to solve the challenge, extract cookies,
			// then inject into this page and re-navigate.
			if u, parseErr := url.Parse(item.URL); parseErr == nil {
				domain := u.Hostname()
				solvedCookies, solveErr := rp.solveChallengeUnblocked(fetchCtx, item.URL)
				if solveErr == nil && len(solvedCookies) > 0 {
					rp.jar.store(domain, solvedCookies)
					_ = page.SetCookies(cookiesToParams(solvedCookies))
					// Re-navigate with clearance cookies — CF should skip challenge.
					if _, renavErr := proto.PageNavigate{URL: item.URL}.Call(p); renavErr == nil {
						// Wait for DOM ready after re-navigation.
						select {
						case <-dclCh:
						case <-time.After(timeout):
						case <-fetchCtx.Done():
						}
					}
				}
			}
		}
```

### Step 5: Store cookies after successful extraction

At the end of `rodFetchAndProcess`, just before `c.resultDB.AddPage(result)` (around line 702), add:

```go
	// Merge page cookies into jar so other tabs can reuse them (CF clearance, session cookies).
	if u, parseErr := url.Parse(finalURL); parseErr == nil {
		if pageCookies, cookieErr := page.Cookies([]string{finalURL}); cookieErr == nil && len(pageCookies) > 0 {
			rp.jar.merge(u.Hostname(), pageCookies)
		}
	}
```

### Step 6: Build and verify

```bash
cd blueprints/search && go build ./pkg/dcrawler/...
```

Expected: no errors. Fix any import issues (`url` is already imported).

### Step 7: Commit

```bash
git add blueprints/search/pkg/dcrawler/rod.go
git commit -m "fix(dcrawler): solve CF challenge via temp unblocked page + share cookies across tabs"
```

---

## Task 3: Browser fingerprint hardening

**Files:**
- Modify: `pkg/dcrawler/rod.go` (newLauncher + getPage)
- Modify: `pkg/dcrawler/config.go` (add UserDataDir field)

### Step 1: Add `UserDataDir` to Config

In `config.go`, add to the `Config` struct after `RodNoRenderWait`:

```go
UserDataDir string // Chrome user-data-dir for persistent cookies/localStorage across restarts
```

### Step 2: Add fingerprint JS constant to rod.go

Add near the top of rod.go (after the `networkInterceptJS` const block, around line 74):

```go
// fingerprintJS patches headless-Chrome-detectable properties that go-rod/stealth doesn't cover.
// Injected before page scripts via PageAddScriptToEvaluateOnNewDocument.
const fingerprintJS = `(function(){
// Screen dimensions: headless Chrome reports 0x0; real desktop = 1920x1080
try{Object.defineProperty(screen,'width',{get:()=>1920});
Object.defineProperty(screen,'height',{get:()=>1080});
Object.defineProperty(screen,'availWidth',{get:()=>1920});
Object.defineProperty(screen,'availHeight',{get:()=>1040});
Object.defineProperty(screen,'colorDepth',{get:()=>24});
Object.defineProperty(screen,'pixelDepth',{get:()=>24});}catch(e){}
// outerWidth/Height: headless = 0; real Chrome = window size
try{Object.defineProperty(window,'outerWidth',{get:()=>1920});
Object.defineProperty(window,'outerHeight',{get:()=>1080});}catch(e){}
// devicePixelRatio: headless = 1; real HiDPI = 2 (but 1 is fine for non-retina)
try{Object.defineProperty(window,'devicePixelRatio',{get:()=>1});}catch(e){}
})()`
```

### Step 3: Update `newLauncher()` with fingerprint Chrome flags

Replace the existing `newLauncher()` function (lines 49–60):

```go
// newLauncher creates a rod launcher with Chrome path and server-safe flags.
func newLauncher(cfg Config) *launcher.Launcher {
	l := launcher.New().
		Headless(cfg.RodHeadless).
		Set("disable-blink-features", "AutomationControlled").
		Set("disable-features", "IsolateOrigins,site-per-process,VizDisplayCompositor").
		Set("disable-dev-shm-usage", ""). // required in Docker/CI (no /dev/shm)
		Set("no-sandbox", "").            // required when running as root on servers
		Set("window-size", "1920,1080").  // match fingerprintJS screen dimensions
		Set("lang", "en-US").             // consistent locale; headless often uses system locale
		Set("accept-lang", "en-US,en;q=0.9")
	if bin := detectChromeBin(); bin != "" {
		l = l.Bin(bin)
	}
	if cfg.UserDataDir != "" {
		l = l.UserDataDir(cfg.UserDataDir)
	}
	if cfg.ProxyURL != "" {
		l = l.Set("proxy-server", cfg.ProxyURL)
	}
	return l
}
```

Note: `newLauncher` now takes `cfg Config` instead of `headless bool`. Update all callers:
- `newRodPool(cfg Config)` calls `newLauncher(cfg.RodHeadless)` → change to `newLauncher(cfg)`
- `tryRestart()` calls `newLauncher(rp.config.RodHeadless)` → change to `newLauncher(rp.config)`

### Step 4: Inject fingerprintJS in `getPage()`

In `getPage()`, after the `stealth.Page(b)` call and `p.MustSetUserAgent(...)`, add:

```go
		// Inject screen/window dimension patches before any page scripts run.
		_, _ = proto.PageAddScriptToEvaluateOnNewDocument{Source: fingerprintJS}.Call(p)
```

The full updated `getPage()` pool factory function should look like:

```go
	p, err := rp.pool.Get(func() (*rod.Page, error) {
		rp.mu.Lock()
		b := rp.browser
		rp.mu.Unlock()

		p, err := stealth.Page(b)
		if err != nil {
			return nil, err
		}
		if rp.config.UserAgent != "" {
			p.MustSetUserAgent(&proto.NetworkSetUserAgentOverride{
				UserAgent: rp.config.UserAgent,
			})
		}
		// Inject screen/window dimension patches before any page scripts run.
		_, _ = proto.PageAddScriptToEvaluateOnNewDocument{Source: fingerprintJS}.Call(p)
		if rp.config.RodBlockResources {
			setupResourceBlocking(p)
		}
		return p, nil
	})
```

### Step 5: Build

```bash
cd blueprints/search && go build ./pkg/dcrawler/...
```

Expected: no errors. The `Config` struct change (`UserDataDir`) needs no default — empty string = no user-data-dir.

### Step 6: Commit

```bash
git add blueprints/search/pkg/dcrawler/rod.go blueprints/search/pkg/dcrawler/config.go
git commit -m "feat(dcrawler): fingerprint hardening — window size, lang, screen JS patch, UserDataDir"
```

---

## Task 4: Proxy support (--proxy-url + --proxy-file)

**Files:**
- Modify: `pkg/dcrawler/config.go`
- Modify: `pkg/dcrawler/rod.go` (newRodPool already gets ProxyURL via cfg after Task 3)
- Modify: `pkg/dcrawler/crawler.go` (multi-proxy: one rodPool per proxy)
- Modify: `cli/dcrawl.go` (new flags)

The `newLauncher(cfg)` in Task 3 already handles `cfg.ProxyURL` with `--proxy-server`. This task adds the config fields, multi-proxy support in `crawler.go`, and CLI flags.

### Step 1: Add proxy fields to Config

In `config.go`, add after `UserDataDir`:

```go
ProxyURL  string // HTTP or SOCKS5 proxy URL for Chrome, e.g. "http://user:pass@host:port"
ProxyFile string // File with one proxy URL per line; enables multi-browser-instance mode
```

### Step 2: Add `loadProxies` helper to crawler.go

In `crawler.go`, add this function near the top (after imports or near other helpers). It needs `bufio`, `os`, `strings` — all already imported in crawler.go.

```go
// loadProxies returns a deduplicated list of proxy URLs from ProxyURL and/or ProxyFile.
// Returns nil (not an error) if neither is configured.
func loadProxies(cfg Config) ([]string, error) {
	seen := make(map[string]bool)
	var proxies []string
	add := func(p string) {
		p = strings.TrimSpace(p)
		if p != "" && !strings.HasPrefix(p, "#") && !seen[p] {
			seen[p] = true
			proxies = append(proxies, p)
		}
	}
	if cfg.ProxyURL != "" {
		add(cfg.ProxyURL)
	}
	if cfg.ProxyFile != "" {
		f, err := os.Open(cfg.ProxyFile)
		if err != nil {
			return nil, fmt.Errorf("proxy-file: %w", err)
		}
		defer f.Close()
		sc := bufio.NewScanner(f)
		for sc.Scan() {
			add(sc.Text())
		}
	}
	return proxies, nil
}
```

### Step 3: Update the `UseRod` branch in `Run()` to support multi-proxy

In `crawler.go`, find the `} else if c.config.UseRod {` block (around line 455). Replace it:

```go
	} else if c.config.UseRod {
		proxies, proxyErr := loadProxies(c.config)
		if proxyErr != nil {
			return proxyErr
		}
		numPools := max(len(proxies), 1)
		rodPools := make([]*rodPool, numPools)
		for i := range numPools {
			proxyCfg := c.config
			if i < len(proxies) {
				proxyCfg.ProxyURL = proxies[i]
			}
			rp, err := newRodPool(proxyCfg)
			if err != nil {
				// Close already-opened pools before returning.
				for j := range i {
					rodPools[j].close()
				}
				return fmt.Errorf("rod[%d]: %w", i, err)
			}
			rodPools[i] = rp
		}
		// Close all pools on exit.
		defer func() {
			for _, rp := range rodPools {
				rp.close()
			}
		}()
		c.rodPool = rodPools[0] // used by health monitor in coordinator

		workers := c.config.RodWorkers
		c.stats.SetRodTotalWorkers(workers)
		for i := range workers {
			workerID := i
			rp := rodPools[workerID%numPools] // round-robin across proxy instances
			g.Go(func() error {
				c.rodWorker(gctx, rp, workerID)
				return nil
			})
		}
```

**Important:** Remove the existing `defer rp.close()` line that was in the old block — it's now handled by the defer above.

### Step 4: Add CLI flags in dcrawl.go

In `cli/dcrawl.go`, add two variables to the `var (...)` block:

```go
proxyURL  string
proxyFile string
```

In `RunE`, after `cfg.DomainAliases = domainAliases`:

```go
cfg.ProxyURL = proxyURL
cfg.ProxyFile = proxyFile
```

In the flags section at the bottom:

```go
cmd.Flags().StringVar(&proxyURL, "proxy-url", "", "HTTP/SOCKS5 proxy for Chrome (e.g. http://user:pass@host:port or socks5://host:port)")
cmd.Flags().StringVar(&proxyFile, "proxy-file", "", "File with one proxy URL per line (enables one Chrome instance per proxy)")
```

### Step 5: Build

```bash
cd blueprints/search && go build ./pkg/dcrawler/... && go build ./cmd/search/
```

Expected: no errors.

### Step 6: Quick smoke test (no proxy needed — just verify flags parse)

```bash
cd blueprints/search && go build -o /tmp/search-test ./cmd/search/ && /tmp/search-test crawl-domain --help | grep proxy
```

Expected output includes:
```
      --proxy-file string   File with one proxy URL per line...
      --proxy-url string    HTTP/SOCKS5 proxy for Chrome...
```

### Step 7: Commit

```bash
git add blueprints/search/pkg/dcrawler/config.go blueprints/search/pkg/dcrawler/crawler.go blueprints/search/cli/dcrawl.go
git commit -m "feat(dcrawler): proxy support — --proxy-url / --proxy-file with multi-Chrome-instance mode"
```

---

## Task 5: Human-like timing jitter + deploy + benchmark

**Files:**
- Modify: `pkg/dcrawler/rod.go` (add jitter before navigate)
- Modify: `Makefile` (deploy)

### Step 1: Add jitter import

`math/rand` is needed. Add to the import block in `rod.go` if not present:

```go
"math/rand"
```

### Step 2: Add jitter before PageNavigate in rodFetchAndProcess

Find the comment `// Inject stored domain cookies` (added in Task 2, before `proto.PageNavigate`). Add jitter before the cookie injection:

```go
	// Human-like timing: small random delay before navigation.
	// Prevents exact-interval patterns that CF bot scoring detects when
	// 150 tabs all hammer the same domain at identical cadence.
	select {
	case <-time.After(time.Duration(10+rand.Intn(140)) * time.Millisecond):
	case <-fetchCtx.Done():
		return
	}

	// Inject stored domain cookies (e.g., CF clearance from a previously solved challenge).
	rp.injectJarCookies(page, item.URL)
```

### Step 3: Build

```bash
cd blueprints/search && go build ./pkg/dcrawler/...
```

### Step 4: Deploy to both servers

Build noble binary (server2) and focal binary (server1):

```bash
cd blueprints/search && make build-linux-noble
make deploy-linux-noble-browser SERVER=2
```

```bash
make build-linux
make deploy-linux-browser SERVER=1
```

### Step 5: Run benchmark on server2

```bash
ssh -tt root@server2 'TERM=xterm-256color ~/bin/search crawl-domain openai.com --browser --no-render-wait --scroll 0 --max-pages 500 --no-sitemap 2>&1'
```

Expected: >50 pages in first 60s (vs 5 pages previously), ideally >100 if CF challenge is solved.

### Step 6: Run benchmark on server1

```bash
ssh -tt tam@server 'TERM=xterm-256color ~/bin/search crawl-domain openai.com --browser --no-render-wait --scroll 0 --max-pages 200 --no-sitemap 2>&1'
```

Expected: >5 pages (server1 was getting only 5 before).

### Step 7: Commit

```bash
git add blueprints/search/pkg/dcrawler/rod.go
git commit -m "feat(dcrawler): human-like navigation jitter (10-150ms random delay per tab)"
```

---

## Quick Reference: All Changes by File

### `pkg/dcrawler/rod.go`
1. Add `fingerprintJS` const (screen/window dimensions)
2. `newLauncher(cfg Config)` — now takes full Config; adds `--window-size`, `--lang`, `--user-data-dir`, `--proxy-server`
3. `rodPool` struct — add `jar *cookieJar` field
4. `newRodPool()` — init `jar`, call `newLauncher(cfg)`
5. `cookieJar` type + `newCookieJar()`, `store()`, `merge()`, `get()` methods
6. `cookiesToParams()` — convert NetworkCookie → NetworkCookieParam
7. `getPage()` — inject fingerprintJS via PageAddScriptToEvaluateOnNewDocument
8. `tryRestart()` — call `newLauncher(rp.config)` (was `newLauncher(rp.config.RodHeadless)`)
9. `solveChallengeUnblocked()` — temp unblocked page, wait 15s for challenge to clear, return cookies
10. `injectJarCookies()` — inject jar cookies before navigation
11. `rodFetchAndProcess()` — add jitter + inject cookies before navigate; replace CF challenge block with solver; store cookies after success

### `pkg/dcrawler/config.go`
- Add `UserDataDir string`
- Add `ProxyURL string`
- Add `ProxyFile string`

### `pkg/dcrawler/crawler.go`
- Add `loadProxies(cfg Config) ([]string, error)`
- Replace `UseRod` block in `Run()` with multi-pool support

### `cli/dcrawl.go`
- Add `proxyURL`, `proxyFile` vars
- Set `cfg.ProxyURL`, `cfg.ProxyFile` in RunE
- Add `--proxy-url`, `--proxy-file` flags
