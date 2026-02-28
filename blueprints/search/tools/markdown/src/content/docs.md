# URL → Markdown

Free, instant URL-to-Markdown conversion for AI agents and LLM pipelines. No API key, no account.

## Overview

Convert any HTTP/HTTPS URL to clean, structured Markdown with a single request.

- Works with any HTTP/HTTPS URL
- Three-tier pipeline: native negotiation → Workers AI → Browser rendering
- Edge-cached for 1 hour with stale-while-revalidate
- CORS-enabled for browser and agent use

## Quick start

Fetch as Markdown:

    curl https://markdown.go-mizu.workers.dev/https://example.com

Use the JSON API:

    curl -X POST https://markdown.go-mizu.workers.dev/convert \
      -H 'Content-Type: application/json' \
      -d '{"url":"https://example.com"}'

JavaScript:

    const md = await fetch(
      'https://markdown.go-mizu.workers.dev/' + url
    ).then(r => r.text());

Python:

    import httpx
    md = httpx.get('https://markdown.go-mizu.workers.dev/' + url).text

## API reference

### GET /{url}

Convert a URL to Markdown. Append any `http://` or `https://` URL to the worker base URL. Query strings are preserved.

    curl https://markdown.go-mizu.workers.dev/https://example.com?q=hello

### POST /convert

Convert a URL and receive a structured JSON response.

Request body: `{"url": "https://example.com"}`

Response:

    {
      "markdown": "# Example Domain\n\n...",
      "method": "primary" | "ai" | "browser",
      "durationMs": 342,
      "title": "Example Domain",
      "tokens": 1248
    }

### GET /llms.txt

Machine-readable API summary for LLM agents.

## Pipeline

Every URL goes through up to three tiers, falling back automatically:

- **Tier 1 — Native Markdown:** Requests with `Accept: text/markdown`. Sites that support this return structured Markdown directly.
- **Tier 2 — Workers AI:** Fetches HTML and converts via Cloudflare Workers AI `toMarkdown()`.
- **Tier 3 — Browser Render:** For JS-heavy SPAs. Renders in headless browser via `@cloudflare/puppeteer`, then passes to Workers AI.

## Response headers

The `GET /{url}` endpoint returns these headers:

| Header | Description |
|---|---|
| X-Conversion-Method | `primary`, `ai`, or `browser` |
| X-Duration-Ms | Server-side processing time in milliseconds |
| X-Title | Percent-encoded page title (max 200 chars) |
| X-Markdown-Tokens | Approximate token count (when available) |
| Cache-Control | `public, max-age=300, s-maxage=3600, stale-while-revalidate=86400` |

## Limits

- Max response body: **5 MB** per URL
- Fetch timeout: **10 seconds** (30 seconds for browser rendering)
- Protocols: **http://** and **https://** only
- Rate limits: Cloudflare Workers free tier (100,000 requests/day)
