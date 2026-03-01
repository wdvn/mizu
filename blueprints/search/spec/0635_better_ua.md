# Better User-Agent & Browser Impersonation

> Spec for reducing bot-holding timeouts via browser-like request profiles.

## Problem

37.5% of crawl URLs timeout at 1s. Root cause analysis (spec/0634):
- **Bot-holding**: Servers detect crawler UA and hold connections open (>5s for crawler UAs,
  <200ms for browser UAs). This is the single largest source of timeouts.
- Go crawler already has `BrowserUserAgents` pool (8 UAs) — reduced timeout rate from
  95.8% to ~67%. But UA alone isn't enough.

**Detection signals beyond UA**:
1. Missing `Sec-CH-UA` / `Sec-Fetch-*` headers (real Chrome always sends them)
2. TLS fingerprint mismatch (Go/Rust TLS ≠ Chrome TLS — trivially detectable via JA3/JA4)
3. Missing `Accept`, `Accept-Language`, `Accept-Encoding` (or wrong values for claimed browser)
4. Header order mismatch (Chrome sends headers in a specific order)

## Current State

### Rust Crawler (`ua.rs`)
- 8 browser UAs: Chrome 131 (Win/Mac/Linux), Firefox 133 (Win/Mac), Safari 18.2, Edge 131, Chrome 131 Android
- `pick_user_agent()` — uniform random per request
- **Only sets User-Agent header** — no Accept, no Sec-CH-UA, no Sec-Fetch-*
- TLS: `native-tls-vendored` (OpenSSL) — Go/Rust fingerprint, not Chrome

### Go Crawler (`engine.go`)
- Same 8 UAs, `PickUserAgent()` — random per request
- **Only sets User-Agent** — no additional headers
- TLS: Go standard `crypto/tls` — Go fingerprint, not Chrome

## Solution: Browser Profiles

Replace individual UA strings with **complete browser profiles** — coherent sets of headers
that match what a real browser sends.

### Profile Structure

```rust
pub struct BrowserProfile {
    pub user_agent: &'static str,
    pub accept: &'static str,
    pub accept_language: &'static str,
    pub accept_encoding: &'static str,
    pub sec_ch_ua: Option<&'static str>,        // None for Firefox/Safari
    pub sec_ch_ua_mobile: Option<&'static str>,  // None for Firefox/Safari
    pub sec_ch_ua_platform: Option<&'static str>,// None for Firefox/Safari
    pub upgrade_insecure_requests: &'static str, // "1"
    pub sec_fetch_dest: &'static str,            // "document"
    pub sec_fetch_mode: &'static str,            // "navigate"
    pub sec_fetch_site: &'static str,            // "none"
    pub sec_fetch_user: &'static str,            // "?1"
}
```

### Defined Profiles

**Profile 1: Chrome 133 / Windows**
```
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Accept-Encoding: gzip, deflate, br, zstd
Accept-Language: en-US,en;q=0.9
Sec-CH-UA: "Chromium";v="133", "Not(A:Brand";v="99", "Google Chrome";v="133"
Sec-CH-UA-Mobile: ?0
Sec-CH-UA-Platform: "Windows"
Upgrade-Insecure-Requests: 1
Sec-Fetch-Dest: document
Sec-Fetch-Mode: navigate
Sec-Fetch-Site: none
Sec-Fetch-User: ?1
```

**Profile 2: Chrome 133 / macOS**
```
User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Accept-Encoding: gzip, deflate, br, zstd
Accept-Language: en-US,en;q=0.9
Sec-CH-UA: "Chromium";v="133", "Not(A:Brand";v="99", "Google Chrome";v="133"
Sec-CH-UA-Mobile: ?0
Sec-CH-UA-Platform: "macOS"
Upgrade-Insecure-Requests: 1
Sec-Fetch-Dest: document
Sec-Fetch-Mode: navigate
Sec-Fetch-Site: none
Sec-Fetch-User: ?1
```

**Profile 3: Firefox 133 / Windows**
```
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8
Accept-Encoding: gzip, deflate, br, zstd
Accept-Language: en-US,en;q=0.5
Upgrade-Insecure-Requests: 1
Sec-Fetch-Dest: document
Sec-Fetch-Mode: navigate
Sec-Fetch-Site: none
Sec-Fetch-User: ?1
```
Note: Firefox does NOT send Sec-CH-UA headers.

**Profile 4: Chrome 133 / Linux**
```
User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Accept-Encoding: gzip, deflate, br, zstd
Accept-Language: en-US,en;q=0.9
Sec-CH-UA: "Chromium";v="133", "Not(A:Brand";v="99", "Google Chrome";v="133"
Sec-CH-UA-Mobile: ?0
Sec-CH-UA-Platform: "Linux"
Upgrade-Insecure-Requests: 1
Sec-Fetch-Dest: document
Sec-Fetch-Mode: navigate
Sec-Fetch-Site: none
Sec-Fetch-User: ?1
```

### Selection Strategy

- **Per-domain** (not per-request): Pick one profile per domain and reuse it for all URLs
  from that domain. Real browsers don't change identity mid-session.
- **Deterministic from domain**: `hash(domain) % profiles.len()` — same profile on retries
- **Session consistency**: If implementing cookies later, profile stays fixed per session

## Implementation Plan

### Phase 1: Browser Profiles (immediate)
1. Replace `BROWSER_USER_AGENTS` in `ua.rs` with `BROWSER_PROFILES` array
2. Add `pick_profile(domain: &str) -> &BrowserProfile` using domain hash
3. In `fetch_one()`, set all headers from the profile instead of just User-Agent
4. **Expected impact**: Bypass basic header-checking WAFs, reduce bot-holding timeouts

### Phase 2: TLS Fingerprint (future, if needed)
- **Rust**: Switch from `reqwest` to `rquest` or `reqwest-impersonate` (BoringSSL-based,
  impersonates Chrome TLS fingerprint including JA3/JA4 and HTTP/2 SETTINGS)
- **Go**: Use `utls` (refraction-networking) or `httpcloak` for Chrome TLS impersonation
- **Impact**: Bypass JA3/JA4-based bot detection (Cloudflare, Akamai, DataDome)
- **Trade-off**: BoringSSL adds C dependency, complicates cross-compilation

### Phase 3: HTTP/2 Fingerprint (future, if needed)
- HTTP/2 SETTINGS frame values (HEADER_TABLE_SIZE, INITIAL_WINDOW_SIZE, etc.)
- Pseudo-header order (:method, :authority, :scheme, :path)
- Priority/HPACK patterns
- **Impact**: Bypass Akamai-style HTTP/2 fingerprinting

## Key Consistency Rules

| UA Claims | Sec-CH-UA | Sec-Fetch | Accept |
|-----------|-----------|-----------|--------|
| Chrome | MUST send, version must match | MUST send | Include image/avif,webp,apng |
| Firefox | MUST NOT send | MUST send | Simple: `*/*;q=0.8` |
| Safari | MUST NOT send | MUST NOT send | Simple: `*/*;q=0.8` |

**Critical**: Sending Sec-CH-UA with a Firefox UA, or omitting Sec-CH-UA with a Chrome UA,
is a stronger bot signal than using a generic crawler UA. Consistency > randomness.

## Open Source References

| Library | Language | Approach |
|---------|----------|----------|
| [BrowserForge](https://github.com/daijro/browserforge) | Python | Bayesian profile generation |
| [Crawlee](https://crawlee.dev) | Node/Python | Full fingerprint including canvas/WebGL |
| [rquest](https://lib.rs/crates/rquest) | Rust | reqwest fork with TLS impersonation |
| [reqwest-impersonate](https://github.com/4JX/reqwest-impersonate) | Rust | Chrome TLS via BoringSSL |
| [impit](https://github.com/AresS31/impit) | Rust | Patched rustls for browser TLS |
| [utls](https://github.com/refraction-networking/utls) | Go | ClientHello impersonation |
| [httpcloak](https://github.com/sardanioss/httpcloak) | Go | Full browser-identical fingerprint |
| [surf](https://github.com/enetx/surf) | Go | Chrome/Firefox impersonation |

## Anti-Bot Detection Layers (from easiest to hardest to bypass)

1. **User-Agent string** — trivial to bypass (already done)
2. **HTTP headers** (Accept, Sec-CH-UA, Sec-Fetch) — Phase 1 (this spec)
3. **TLS fingerprint** (JA3/JA4) — Phase 2 (requires client replacement)
4. **HTTP/2 fingerprint** (Akamai) — Phase 3 (requires low-level HTTP/2 control)
5. **JavaScript execution** — requires headless browser (out of scope for HTTP crawler)
6. **Behavioral analysis** (timing, navigation patterns) — requires session simulation

Phase 1 should bypass the majority of bot-holding servers. Most bot detection in
production uses layers 1-2 for initial triage before escalating to JS challenges.
