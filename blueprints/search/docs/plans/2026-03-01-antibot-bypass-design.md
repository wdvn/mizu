# Anti-Bot Bypass Design

**Goal:** Make `search crawl-domain --browser` work on any site that blocks headless Chrome — including Cloudflare-protected sites (openai.com), CloudFront WAF, Tencent WAF, and DataDome — by fixing the confirmed resource-blocking bug, adding a domain cookie jar, hardening browser fingerprints, and adding proxy support.

**Architecture:** Five independent components layered into the existing `pkg/dcrawler/rod.go` pipeline: (1) CF challenge solver that disables resource blocking temporarily, (2) domain cookie jar that shares challenge cookies across all tabs, (3) extra Chrome launch flags + JS fingerprint patches, (4) proxy support via launcher flag, (5) human-like navigation jitter.

**Tech Stack:** Go, `github.com/go-rod/rod`, `github.com/go-rod/stealth` (already used), CDP protocol (`proto.*`), bash (Makefile deploy).

---

## Component 1 — CF Challenge Solver

**Root cause confirmed:** When `isChallenge=true` (title = "Just a moment..."), resource blocking (HijackRequests router) is active on the page. Cloudflare Turnstile loads JS + images from `challenges.cloudflare.com` in an iframe — which we're blocking → challenge never solves.

**Fix:** When a challenge is detected on a resource-blocked page:
1. Create a **temporary unblocked page** from the same browser (no HijackRequests router)
2. Navigate the unblocked page to the same URL
3. Poll title for up to 15s until it's no longer "Just a moment..."
4. Extract all cookies from the unblocked page
5. Inject cookies into the original page, re-navigate — skips challenge
6. Close the temporary unblocked page

New helper: `rodPool.solveChallengeUnblocked(ctx, url) ([]*proto.NetworkCookie, error)`

## Component 2 — Domain Cookie Jar

**Goal:** One challenge solve covers all 150 concurrent tabs for ~30 minutes.

```go
// In rodPool:
cookieJar sync.Map // string(domain) → []*proto.NetworkCookie
```

- **Before each navigation**: call `injectDomainCookies(page, url)` — injects stored cookies for that domain
- **After challenge solved**: call `storeDomainCookies(domain, cookies)` — broadcasts to jar immediately
- **After each successful page load**: extract + merge page cookies back into jar (keeps them fresh)

Cookie injection uses `proto.NetworkSetCookies`. Cookie extraction uses `page.Cookies([]string{url})`.

## Component 3 — Browser Fingerprint Hardening

**Chrome launch flags** added to `newLauncher()`:
- `--window-size=1920,1080` — desktop viewport (headless default is 0×0, detectable)
- `--lang=en-US` — locale
- `--disable-features=VizDisplayCompositor` — reduces crash rate on headless Linux
- `--user-data-dir=<path>` — persists cookies/localStorage across Chrome restarts (optional, from `cfg.UserDataDir`)

**JS injection** added to `getPage()` via `PageAddScriptToEvaluateOnNewDocument`, runs before page scripts:
```js
// Screen dimensions (headless reports 0×0 by default)
Object.defineProperty(screen, 'width',       {get: () => 1920});
Object.defineProperty(screen, 'height',      {get: () => 1080});
Object.defineProperty(screen, 'availWidth',  {get: () => 1920});
Object.defineProperty(screen, 'availHeight', {get: () => 1040});
Object.defineProperty(screen, 'colorDepth',  {get: () => 24});
Object.defineProperty(screen, 'pixelDepth',  {get: () => 24});
// window.outerWidth/Height (headless = 0)
Object.defineProperty(window, 'outerWidth',  {get: () => 1920});
Object.defineProperty(window, 'outerHeight', {get: () => 1080});
```

*(go-rod/stealth already handles: navigator.webdriver, canvas noise, WebGL vendor/renderer, chrome runtime, navigator.plugins — no duplication needed)*

## Component 4 — Proxy Support

**New Config fields:**
```go
ProxyURL  string  // e.g. "http://user:pass@1.2.3.4:8080" or "socks5://host:port"
ProxyFile string  // path to file with one proxy URL per line (enables multi-instance mode)
```

**Single proxy** (`--proxy-url`): pass `--proxy-server=<url>` to Chrome launcher. All tabs use same proxy.

**Multi-proxy** (`--proxy-file`): load N proxy URLs → launch N Chrome instances (one per proxy), each with its own page pool and cookie jar. The crawler's `rodWorker` pool selects a browser instance round-robin per URL.

**New launcher logic:**
```go
if cfg.ProxyURL != "" {
    l.Set("proxy-server", cfg.ProxyURL)
}
```

**New CLI flags** in `cli/dcrawl.go`:
```
--proxy-url string    HTTP/SOCKS5 proxy for Chrome (e.g. http://user:pass@host:port)
--proxy-file string   File with one proxy URL per line (round-robin across Chrome instances)
```

## Component 5 — Human-like Timing

Add random jitter (10–150ms) before each `proto.PageNavigate` call in `rodFetchAndProcess`:
```go
jitter := time.Duration(10+rand.Intn(140)) * time.Millisecond
select {
case <-time.After(jitter):
case <-fetchCtx.Done():
    return
}
```

This prevents exact-interval tab patterns that Cloudflare's bot scoring detects when 150 tabs all hammer the same domain at identical cadence.

---

## Files Changed

| File | Changes |
|------|---------|
| `pkg/dcrawler/rod.go` | solveChallengeUnblocked(), cookieJar in rodPool, fingerprint JS injection, jitter, multi-proxy rodPool slice |
| `pkg/dcrawler/config.go` | ProxyURL, ProxyFile, UserDataDir fields |
| `cli/dcrawl.go` | --proxy-url, --proxy-file, --user-data-dir flags |

## Success Criteria

- `search crawl-domain openai.com --browser --scroll 0` on server2: >20 pages/s (vs current ~6 pages/s)
- `search crawl-domain openai.com --browser --scroll 0` on server1: >5 pages (vs 5 total with IP block → needs --proxy-url)
- CF challenge solved once per domain per Chrome instance, not once per page
