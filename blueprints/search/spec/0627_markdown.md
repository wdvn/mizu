# 0627 — Markdown Tool: Full Visual Redesign + Content Rework

> **Status:** Approved
> **Scope:** `blueprints/search/tools/markdown/`
> **Goal:** Full visual redesign with dark/light mode toggle, content rework across all pages (landing, preview, docs), and structural cleanup to remove duplicate sections and improve information flow.

---

## Design Language

### Color system

All colors use CSS custom properties. Light mode defined in `:root`, dark mode overrides in `[data-theme="dark"]` on `<html>`. Theme persists to `localStorage('theme')`. Applies to **all pages** (index.html, preview.html, docs page).

```css
:root {
  --bg:       #ffffff;
  --bg2:      #f7f7f7;
  --fg:       #0a0a0a;
  --fg2:      #525252;
  --fg3:      #a3a3a3;
  --border:   #e5e5e5;
  --border2:  #d4d4d4;
  --code-bg:  #0c0c0c;
  --code-fg:  #e4e4e7;
}
[data-theme="dark"] {
  --bg:       #0a0a0a;
  --bg2:      #111111;
  --fg:       #f0f0ef;
  --fg2:      #a3a3a3;
  --fg3:      #525252;
  --border:   #222222;
  --border2:  #2e2e2e;
  --code-bg:  #141414;
  --code-fg:  #e4e4e7;
}
```

Monochromatic — no accent color. Buttons use `--fg` background with `--bg` text (inverted). The toggle flips everything cleanly.

### Typography

Keep Geist + Geist Mono (already loaded). No changes to font families.

- Hero h1: `clamp(44px, 6vw, 72px)`, weight 700, tracking `-.04em`, line-height 1.05
- Section h2: `26px`, weight 600, tracking `-.025em`
- Body: `15px`, line-height `1.75`, color `--fg2`
- Code/mono labels: `11px`, weight 500, tracking `.08em`, uppercase, color `--fg3`
- Remove all `sec-lbl` uppercase label elements — replaced by heading hierarchy

### Logo

Replace current waveform SVG with the Lucide `square-m` icon everywhere (index.html, preview.html, docs.ts):

```svg
<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
     stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="3" y="3" width="18" height="18" rx="2"/>
  <path d="M8 16V8.5a.5.5 0 0 1 .9-.3l2.7 3.599a.5.5 0 0 0 .8 0l2.7-3.6a.5.5 0 0 1 .9.3V16"/>
</svg>
```

Logo square (`.logo-sq`) background uses `--fg`, SVG stroke uses `--bg` (inverts correctly in dark mode).

### Dark mode toggle

Button in all page headers, right side of nav. Uses a sun/moon SVG icon:
- Light mode shows moon icon (click to go dark)
- Dark mode shows sun icon (click to go light)

```javascript
// Shared pattern across all pages
(function() {
  var t = localStorage.getItem('theme');
  if (t) document.documentElement.setAttribute('data-theme', t);
})();

function toggleTheme() {
  var cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  var next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  updateToggleIcon();
}
```

Inject the theme-init script as the **first `<script>` in `<head>`** (before stylesheets load) to prevent flash of wrong theme.

---

## Page 1: Landing (`public/index.html`)

### Navigation

```
[logo-sq M icon]  markdown.go-mizu      API  ·  Docs  ·  GitHub  ·  [☾/☀ toggle]
```

- Remove: "For agents" anchor link (redundant with section on page)
- Remove: "llms.txt" from primary nav (move to footer)
- Logo text: `markdown.go-mizu` (no `→` character — cleaner)
- Nav links: `API` (anchor `#api`), `Docs` (/docs), `GitHub`
- Toggle button: icon-only, no label

### Hero section

```
Any URL →
Clean Markdown.

No API key. No account. Instant.

[ https://example.com ___________________________ ] [ Convert ]

Try:  example.com  ·  news.ycombinator.com  ·  docs.python.org
```

- Remove the numbered steps list (`<ul class="steps-list">`) entirely
- Remove the 2-column CTA grid — agent button moves to its own section below
- Single column: headline → tagline → input → example links
- Tagline: "No API key. No account. Instant." (three objections, 6 words)
- Clicking example links navigates to `/preview?url=...` directly (same as current `setEg`)

### Section 1: For AI Agents

First section after hero. Shows the actual instructions text visibly so users can read before copying.

```
For AI Agents

Copy these instructions into your agent's system prompt:

┌─────────────────────────────────────────────────────────────┐
│  Use https://markdown.go-mizu.workers.dev to read any URL   │
│  as clean Markdown. No auth required. Free.                 │
│                                                             │
│  Fetch any URL as Markdown text:                            │
│    GET https://markdown.go-mizu.workers.dev/{url}           │
│                                                             │
│  Fetch with JSON metadata (method, duration, title):        │
│    POST https://markdown.go-mizu.workers.dev/convert        │
│    Content-Type: application/json                           │
│    {"url": "https://example.com"}                           │
└─────────────────────────────────────────────────────────────┘
                                        [ Copy to clipboard ]
```

- The block is a `<pre>` with dark code background (`--code-bg`), `--code-fg` text, monospace font
- Copy button inside the block (top-right, same pattern as existing copy buttons)
- `AGENT_INSTRUCTIONS` JS variable in the script block holds the plain-text version to copy
- The visible text and the copied text are identical — no hidden content

### Section 2: How It Works

Consolidated from the two old sections ("Get Markdown in one request" + "Three tiers, one result"). One section, less text.

```
How it works

Every URL goes through three tiers, falling back automatically
until clean Markdown is produced.

  Tier 1 · Native       Accept: text/markdown negotiation —
                        sites that serve Markdown return it directly.

  Tier 2 · Workers AI   HTML fetched and converted via
                        Cloudflare Workers AI toMarkdown().

  Tier 3 · Browser      JS-heavy SPAs rendered in a headless browser
                        before AI conversion.

Responses are edge-cached for 1 hour with stale-while-revalidate.
CORS enabled — fetch from any origin.
```

Layout: simple definition-list style (`<dl>`) or three rows with `tier · name` in mono and description in regular text. No grid cards — just clean text rows. Tight, minimal.

### Section 3: Code Examples

Full-width, tabbed. Tabs: **Shell · JavaScript · Python · TypeScript**

**Shell:**
```bash
# Returns text/markdown
curl https://markdown.go-mizu.workers.dev/https://example.com

# Returns structured JSON
curl -s -X POST https://markdown.go-mizu.workers.dev/convert \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://example.com"}'
```

**JavaScript:**
```javascript
// Markdown text
const md = await fetch(
  'https://markdown.go-mizu.workers.dev/' + url
).then(r => r.text());

// JSON with metadata
const res = await fetch('https://markdown.go-mizu.workers.dev/convert', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url })
}).then(r => r.json());
```

**Python:**
```python
import httpx

# Markdown text
md = httpx.get('https://markdown.go-mizu.workers.dev/' + url).text

# JSON with metadata
res = httpx.post(
    'https://markdown.go-mizu.workers.dev/convert',
    json={'url': url}
).json()
```

**TypeScript:**
```typescript
const md = await fetch(
  'https://markdown.go-mizu.workers.dev/' + url
).then(r => r.text());

interface ConvertResult {
  markdown: string;
  method: 'primary' | 'ai' | 'browser';
  durationMs: number;
  title: string;
  tokens?: number;
}
const res: ConvertResult = await fetch(
  'https://markdown.go-mizu.workers.dev/convert',
  { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }) }
).then(r => r.json());
```

Remove `| jq .method` from curl example — it was confusing. Show the plain JSON response instead via comments.

### Section 4: API Reference

Keep current structure (two endpoint blocks). Minor copy cleanup only:

- `GET /{url}` header copy: "Convert any URL to Markdown text"
- `POST /convert` header copy: "Convert a URL, receive structured JSON"
- Remove response headers block from the GET example — too noisy. Keep just the curl command. Response headers documented in `/docs` instead.

### Footer

```
© 2026 markdown.go-mizu  ·  GitHub  ·  Docs  ·  llms.txt
```

Simple single-row footer. Small text, `--fg3` color.

---

## Page 2: Preview (`public/preview.html`)

### Top bar

Keep current Google-style bar: `[logo-sq] [url input ——————] [Convert]`

Add dark mode toggle on the right end of the top bar:
```
[logo-sq] [url input ——————————————————————————] [Convert] [☾/☀]
```

### Empty state

When `/preview` is loaded with no `?url=` parameter, show:

```
[Large M logo, --fg3 color, 48px]
Enter a URL above to preview its Markdown output.
Try:  example.com  ·  news.ycombinator.com  ·  docs.python.org
```

Center-aligned, shown in place of the result/loading/error states. Hidden once a URL is submitted. Clicking example links fills the URL input and triggers conversion.

### Result view

Meta bar, tab bar, and panels: keep current structure. Apply new color vars throughout.

Method badges — remove emoji, clean text only:
- `primary` → badge with `.b-native` style
- `ai` → badge with `.b-ai` style
- `browser` → badge with `.b-browser` style

(Badge background colors should use subtle tints that work in both light and dark modes.)

Badge colors updated for dark mode compatibility:
```css
.b-native { background: var(--bg2); color: var(--fg); border: 1px solid var(--border); }
.b-ai     { background: var(--bg2); color: var(--fg); border: 1px solid var(--border); }
.b-browser{ background: var(--bg2); color: var(--fg); border: 1px solid var(--border); }
```

Simpler: all badges use the same neutral style. The `X-Conversion-Method` value (`primary`/`ai`/`browser`) is the differentiator.

---

## Page 3: Docs (`src/docs.ts`)

### Layout

**Remove sidebar entirely.** Single centered column:

```css
.content {
  max-width: 720px;
  margin: 0 auto;
  padding: 48px 32px 80px;
}
```

No `.layout`, no `.sidebar`. Just a full-width page with centered content. The page is short enough (7-8 sections) that ToC is unnecessary.

### Header

Same pattern as other pages:

```
[logo-sq M icon]  markdown.go-mizu      Home  ·  GitHub  ·  [☾/☀ toggle]
```

Uses the same shared CSS variables from `styles.css`.

### Content (docs.md rewrite)

Replace 4-space indented code blocks with fenced blocks. Add two new sections.

**Full section list:**
1. Overview
2. Quick start
3. GET /{url}
4. POST /convert
5. Conversion pipeline
6. Response headers
7. Error responses ← new
8. CORS ← new
9. Limits

**Error responses section:**
```markdown
## Error responses

| Status | When |
|---|---|
| `400` | Missing or invalid `url` field in POST body |
| `422` | Conversion failed (fetch error, unsupported content type) |

Error body (JSON for POST /convert):
```json
{"error": "description of what went wrong"}
```

Text API (GET /{url}) returns plain text: `Error: description`
```

**CORS section:**
```markdown
## CORS

All endpoints return `Access-Control-Allow-Origin: *`.
You can call the API directly from browser JavaScript with no proxy.
```

All code blocks must use fenced syntax with language identifier:
- Shell examples: ` ```bash `
- JSON: ` ```json `
- JavaScript: ` ```javascript `
- Python: ` ```python `

### Dark mode

Same `toggleTheme()` pattern as other pages. The `renderDocs()` function in `docs.ts` includes the theme-init script in `<head>` and the toggle button in the header.

---

## Shared: `public/styles.css`

Add to the existing file:

1. Dark mode color vars (`[data-theme="dark"]` block)
2. Toggle button styles (`.theme-toggle`)
3. Updated badge styles (neutral, dark-mode-compatible)
4. Footer styles (`.site-footer`)

### Toggle button

```css
.theme-toggle {
  background: none;
  border: 1px solid var(--border);
  color: var(--fg3);
  cursor: pointer;
  padding: 6px 8px;
  display: flex;
  align-items: center;
  transition: color .15s, border-color .15s;
}
.theme-toggle:hover { color: var(--fg); border-color: var(--border2); }
```

### Footer

```css
.site-footer {
  border-top: 1px solid var(--border);
  padding: 24px 32px;
  text-align: center;
  font-size: 13px;
  color: var(--fg3);
}
.site-footer a { color: var(--fg3); }
.site-footer a:hover { color: var(--fg); }
```

---

## Implementation tasks

### Task 1: styles.css — dark mode vars + shared components

**Files:** `public/styles.css`

Add:
- `[data-theme="dark"]` color variable overrides
- `.theme-toggle` button style
- `.site-footer` style
- Updated `.badge` / `.b-native` / `.b-ai` / `.b-browser` to use `--bg2`/`--fg`/`--border` vars (dark-mode-compatible)
- Theme-init inline script snippet (documented in this file as a comment for reference)

### Task 2: Landing page full rework (`public/index.html`)

**Files:** `public/index.html`

Changes:
- Replace logo SVG with `square-m` Lucide icon everywhere
- Update nav: remove "For agents" anchor + "llms.txt", add dark mode toggle
- Hero: remove `steps-list`, remove 2-col CTA grid, single-column with input + tagline + examples
- New Section 1 "For AI Agents": visible `<pre>` block + copy button
- New Section 2 "How it works": `<dl>`-style tier rows, merged pipeline info
- Section 3 code examples: add TypeScript tab, remove `| jq .method`
- Section 4 API reference: remove response headers block from GET example
- Add `<footer class="site-footer">`
- Add dark mode toggle button + `toggleTheme()` JS
- Add theme-init `<script>` in `<head>` (first script, before stylesheets)
- Add `<meta name="description">` tag

### Task 3: Preview page (`public/preview.html`)

**Files:** `public/preview.html`

Changes:
- Replace logo SVG with `square-m`
- Add dark mode toggle to top bar (right end)
- Add empty state `<div id="empty-state">` shown on load when no URL param
- Update method badge class assignment to neutral badge styles (remove colored badges)
- Add `toggleTheme()` JS + theme-init in `<head>`

### Task 4: Docs page (`src/docs.ts` + `src/content/docs.md`)

**Files:** `src/docs.ts`, `src/content/docs.md`

`docs.ts` changes:
- Remove `.layout` / `.sidebar` CSS, replace with single centered `.content` block
- Replace `square-m` logo SVG in header
- Header nav: Home · GitHub · toggle
- Remove all sidebar JS (nav building, scroll-spy)
- Add `toggleTheme()` + theme-init in `<head>`

`docs.md` changes:
- Convert all 4-space indented code blocks to fenced with language identifier
- Add `## Error responses` section
- Add `## CORS` section
- Minor copy edits throughout for clarity

### Task 5: Deploy and verify

```bash
npm run deploy
```

Verify:
- `/` loads, dark mode toggle works, persists on reload
- `/preview` shows empty state, conversion works, dark mode applies
- `/docs` shows centered single-column, dark mode applies
- All three pages: logo uses `square-m`, nav is consistent
- `localStorage('theme')` = `'dark'` persists across page navigations
