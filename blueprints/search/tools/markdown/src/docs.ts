export function renderDocs(): string {
  return '<!DOCTYPE html>\n' +
'<html lang="en">\n' +
'<head>\n' +
'  <meta charset="UTF-8">\n' +
'  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
'  <title>Docs \u2014 URL \u2192 Markdown<\/title>\n' +
'  <link rel="preconnect" href="https://fonts.googleapis.com">\n' +
'  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
'  <link href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet">\n' +
'  <style>\n' +
'*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}\n' +
':root{\n' +
'  --sans:\'Geist\',-apple-system,sans-serif;\n' +
'  --mono:\'Geist Mono\',ui-monospace,monospace;\n' +
'  --bg:#fff;--fg:#0a0a0a;--fg2:#555;--fg3:#999;\n' +
'  --border:#e8e8e8;--border2:#e0e0e0;\n' +
'  --code-bg:#111;--code-fg:#e4e4e7;\n' +
'  --w:1120px\n' +
'}\n' +
'html{font-size:15px}\n' +
'body{font-family:var(--sans);background:var(--bg);color:var(--fg);line-height:1.6;-webkit-font-smoothing:antialiased}\n' +
'a{color:inherit;text-decoration:none}\n' +
'code{font-family:var(--mono);font-size:12.5px;background:#f5f5f5;padding:2px 6px}\n' +
'\n' +
'/* header */\n' +
'header{padding:14px 32px;border-bottom:1px solid var(--border2)}\n' +
'.hdr{display:flex;align-items:center;justify-content:space-between}\n' +
'.logo{font-size:13.5px;font-weight:500;letter-spacing:-.02em;display:flex;align-items:center;gap:8px;color:var(--fg)}\n' +
'.logo-sq{width:22px;height:22px;background:var(--fg);display:flex;align-items:center;justify-content:center;flex-shrink:0}\n' +
'nav a{font-size:13px;color:var(--fg3);margin-left:20px;transition:color .15s}\n' +
'nav a:hover{color:var(--fg)}\n' +
'\n' +
'/* two-column layout */\n' +
'.layout{display:flex;min-height:calc(100vh - 52px)}\n' +
'.sidebar{width:240px;flex-shrink:0;padding:32px 24px;position:sticky;top:0;height:calc(100vh - 52px);overflow-y:auto;border-right:1px solid var(--border2)}\n' +
'.content{flex:1;padding:48px 64px;max-width:900px}\n' +
'@media(max-width:720px){.sidebar{display:none}.content{padding:32px 24px}}\n' +
'\n' +
'/* sidebar */\n' +
'.sidebar-title{font-family:var(--mono);font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--fg3);margin-bottom:16px}\n' +
'.sidebar a{display:block;font-size:14px;color:var(--fg3);padding:4px 0;transition:color .15s}\n' +
'.sidebar a:hover{color:var(--fg)}\n' +
'.sidebar a.on{color:var(--fg);font-weight:500}\n' +
'\n' +
'/* content typography */\n' +
'.content h1{font-size:36px;font-weight:700;letter-spacing:-.03em;margin-bottom:16px}\n' +
'.content h2{font-size:22px;font-weight:600;letter-spacing:-.02em;margin:48px 0 14px;scroll-margin-top:24px}\n' +
'.content h2:first-of-type{margin-top:0}\n' +
'.content h3{font-size:17px;font-weight:600;margin:28px 0 10px}\n' +
'.content p{font-size:16px;color:var(--fg2);line-height:1.75;margin-bottom:16px}\n' +
'.content ul{padding-left:1.5em;margin-bottom:16px}\n' +
'.content li{font-size:16px;color:var(--fg2);margin:4px 0;line-height:1.7}\n' +
'.content strong{color:var(--fg);font-weight:600}\n' +
'\n' +
'/* code blocks */\n' +
'.cb{position:relative;margin:20px 0}\n' +
'.cb pre{background:var(--code-bg);padding:20px 22px;overflow-x:auto;font-family:var(--mono);font-size:13.5px;line-height:1.7;color:var(--code-fg);white-space:pre}\n' +
'.cb-copy{position:absolute;top:10px;right:10px;background:#222;border:1px solid #333;color:#aaa;font-family:var(--mono);font-size:11px;padding:4px 10px;cursor:pointer;transition:all .15s}\n' +
'.cb-copy:hover{background:#333;color:#fff}\n' +
'.c1{color:#6b7280}.c2{color:#93c5fd}.c3{color:#86efac}.c4{color:#fcd34d}\n' +
'.rk{color:#93c5fd}.rv{color:#e4e4e7}.rc{color:#6b7280}\n' +
'\n' +
'/* method tags */\n' +
'.mtag{font-family:var(--mono);font-size:11px;font-weight:500;padding:2px 8px;display:inline-block;margin-right:6px}\n' +
'.get{background:#f0fdf4;color:#15803d}\n' +
'.post{background:#eff6ff;color:#1d4ed8}\n' +
'\n' +
'/* response headers table */\n' +
'.tbl{width:100%;border-collapse:collapse;margin:16px 0;font-size:14px}\n' +
'.tbl th{text-align:left;padding:8px 14px;border-bottom:2px solid var(--border);font-weight:600;color:var(--fg)}\n' +
'.tbl td{padding:8px 14px;border-bottom:1px solid var(--border2);color:var(--fg2)}\n' +
'.tbl td:first-child{font-family:var(--mono);font-size:12.5px;color:var(--fg)}\n' +
'  <\/style>\n' +
'<\/head>\n' +
'<body>\n' +
'\n' +
'<header>\n' +
'  <div class="hdr">\n' +
'    <a href="/" class="logo">\n' +
'      <span class="logo-sq">\n' +
'        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">\n' +
'          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"\/>\n' +
'          <polyline points="14 2 14 8 20 8"\/>\n' +
'        <\/svg>\n' +
'      <\/span>\n' +
'      URL \u2192 Markdown\n' +
'    <\/a>\n' +
'    <nav>\n' +
'      <a href="/">Home<\/a>\n' +
'      <a href="/llms.txt">llms.txt<\/a>\n' +
'      <a href="https://github.com/go-mizu/mizu">GitHub<\/a>\n' +
'    <\/nav>\n' +
'  <\/div>\n' +
'<\/header>\n' +
'\n' +
'<div class="layout">\n' +
'\n' +
'  <nav class="sidebar">\n' +
'    <div class="sidebar-title">Docs<\/div>\n' +
'    <a href="#overview" class="on">Overview<\/a>\n' +
'    <a href="#quickstart">Quick start<\/a>\n' +
'    <a href="#api">API reference<\/a>\n' +
'    <a href="#pipeline">Pipeline<\/a>\n' +
'    <a href="#headers">Response headers<\/a>\n' +
'    <a href="#limits">Limits<\/a>\n' +
'  <\/nav>\n' +
'\n' +
'  <div class="content">\n' +
'\n' +
'    <h1>URL \u2192 Markdown<\/h1>\n' +
'    <p>Free, instant URL-to-Markdown conversion for AI agents and LLM pipelines. No API key, no account.<\/p>\n' +
'\n' +
'    <h2 id="overview">Overview<\/h2>\n' +
'    <p>Convert any HTTP/HTTPS URL to clean, structured Markdown with a single request.<\/p>\n' +
'    <ul>\n' +
'      <li>Works with any HTTP/HTTPS URL<\/li>\n' +
'      <li>Three-tier pipeline: native negotiation \u2192 Workers AI \u2192 Browser rendering<\/li>\n' +
'      <li>Edge-cached for 1 hour with stale-while-revalidate<\/li>\n' +
'      <li>CORS-enabled for browser and agent use<\/li>\n' +
'    <\/ul>\n' +
'\n' +
'    <h2 id="quickstart">Quick start<\/h2>\n' +
'\n' +
'    <h3>Fetch as Markdown<\/h3>\n' +
'    <div class="cb">\n' +
'      <button class="cb-copy" onclick="copyBlock(this)">copy<\/button>\n' +
'      <pre>curl https:\/\/markdown.go-mizu.workers.dev\/https:\/\/example.com<\/pre>\n' +
'    <\/div>\n' +
'\n' +
'    <h3>Use the JSON API<\/h3>\n' +
'    <div class="cb">\n' +
'      <button class="cb-copy" onclick="copyBlock(this)">copy<\/button>\n' +
'      <pre>curl -X POST https:\/\/markdown.go-mizu.workers.dev\/convert \\\n' +
'  -H \'Content-Type: application\/json\' \\\n' +
'  -d \'{"url":"https:\/\/example.com"}\'<\/pre>\n' +
'    <\/div>\n' +
'\n' +
'    <h3>JavaScript<\/h3>\n' +
'    <div class="cb">\n' +
'      <button class="cb-copy" onclick="copyBlock(this)">copy<\/button>\n' +
'      <pre><span class="c2">const<\/span> md = <span class="c2">await<\/span> <span class="c4">fetch<\/span>(\n' +
'  <span class="c3">\'https:\/\/markdown.go-mizu.workers.dev\/\'<\/span> + url\n' +
').<span class="c4">then<\/span>(r =&gt; r.<span class="c4">text<\/span>());<\/pre>\n' +
'    <\/div>\n' +
'\n' +
'    <h3>Python<\/h3>\n' +
'    <div class="cb">\n' +
'      <button class="cb-copy" onclick="copyBlock(this)">copy<\/button>\n' +
'      <pre><span class="c2">import<\/span> httpx\n' +
'md = httpx.<span class="c4">get<\/span>(<span class="c3">\'https:\/\/markdown.go-mizu.workers.dev\/\'<\/span> + url).text<\/pre>\n' +
'    <\/div>\n' +
'\n' +
'    <h2 id="api">API reference<\/h2>\n' +
'\n' +
'    <h3><span class="mtag get">GET<\/span> \/{url}<\/h3>\n' +
'    <p>Convert a URL to Markdown. Append any http:\/\/ or https:\/\/ URL to the worker base URL. Query strings are preserved.<\/p>\n' +
'    <div class="cb">\n' +
'      <button class="cb-copy" onclick="copyBlock(this)">copy<\/button>\n' +
'      <pre>curl https:\/\/markdown.go-mizu.workers.dev\/https:\/\/example.com<\/pre>\n' +
'    <\/div>\n' +
'\n' +
'    <h3><span class="mtag post">POST<\/span> \/convert<\/h3>\n' +
'    <p>Convert a URL and receive a structured JSON response.<\/p>\n' +
'    <div class="cb">\n' +
'      <button class="cb-copy" onclick="copyBlock(this)">copy<\/button>\n' +
'      <pre><span class="rc"># Request<\/span>\n' +
'curl -X POST https:\/\/markdown.go-mizu.workers.dev\/convert \\\n' +
'  -H \'Content-Type: application\/json\' \\\n' +
'  -d \'{"url":"https:\/\/example.com"}\'\n' +
'\n' +
'<span class="rc"># Response JSON<\/span>\n' +
'{\n' +
'  <span class="rk">"markdown"<\/span>: <span class="rv">"# Example Domain\\n\\n..."<\/span>,\n' +
'  <span class="rk">"method"<\/span>: <span class="rv">"ai"<\/span>,\n' +
'  <span class="rk">"durationMs"<\/span>: <span class="rv">342<\/span>,\n' +
'  <span class="rk">"title"<\/span>: <span class="rv">"Example Domain"<\/span>,\n' +
'  <span class="rk">"tokens"<\/span>: <span class="rv">1248<\/span>\n' +
'}<\/pre>\n' +
'    <\/div>\n' +
'\n' +
'    <h3><span class="mtag get">GET<\/span> \/llms.txt<\/h3>\n' +
'    <p>Machine-readable API summary for LLM agents.<\/p>\n' +
'\n' +
'    <h2 id="pipeline">Pipeline<\/h2>\n' +
'    <p>Every URL goes through up to three tiers, falling back automatically:<\/p>\n' +
'    <ul>\n' +
'      <li><strong>Tier 1 \u2014 Native Markdown:<\/strong> Requests with <code>Accept: text\/markdown<\/code> \u2014 sites that serve Markdown natively return it directly, with zero transformation overhead.<\/li>\n' +
'      <li><strong>Tier 2 \u2014 Workers AI:<\/strong> Fetches HTML and converts via Cloudflare Workers AI <code>toMarkdown()<\/code> \u2014 fast, structure-aware extraction for static pages.<\/li>\n' +
'      <li><strong>Tier 3 \u2014 Browser Render:<\/strong> For JS-heavy SPAs. Renders in headless browser to capture dynamic content before AI conversion.<\/li>\n' +
'    <\/ul>\n' +
'\n' +
'    <h2 id="headers">Response headers<\/h2>\n' +
'    <p>The GET \/{url} endpoint returns these headers:<\/p>\n' +
'    <table class="tbl">\n' +
'      <thead>\n' +
'        <tr><th>Header<\/th><th>Description<\/th><\/tr>\n' +
'      <\/thead>\n' +
'      <tbody>\n' +
'        <tr><td>X-Conversion-Method<\/td><td>primary, ai, or browser<\/td><\/tr>\n' +
'        <tr><td>X-Duration-Ms<\/td><td>Server-side processing time in milliseconds<\/td><\/tr>\n' +
'        <tr><td>X-Title<\/td><td>Percent-encoded page title (max 200 chars)<\/td><\/tr>\n' +
'        <tr><td>X-Markdown-Tokens<\/td><td>Approximate token count (when available)<\/td><\/tr>\n' +
'        <tr><td>Cache-Control<\/td><td>public, max-age=300, s-maxage=3600, stale-while-revalidate=86400<\/td><\/tr>\n' +
'      <\/tbody>\n' +
'    <\/table>\n' +
'\n' +
'    <h2 id="limits">Limits<\/h2>\n' +
'    <ul>\n' +
'      <li>Max response body: <strong>5 MB<\/strong> per URL<\/li>\n' +
'      <li>Fetch timeout: <strong>10 seconds<\/strong> (30 seconds for browser rendering)<\/li>\n' +
'      <li>Protocols: <strong>http:\/\/<\/strong> and <strong>https:\/\/<\/strong> only<\/li>\n' +
'      <li>Rate limits: Cloudflare Workers free tier (100,000 requests\/day)<\/li>\n' +
'    <\/ul>\n' +
'\n' +
'  <\/div>\n' +
'\n' +
'<\/div>\n' +
'\n' +
'<script>\n' +
'async function copyBlock(btn) {\n' +
'  var cb = btn.parentElement;\n' +
'  var pre = cb.querySelector(\'pre\');\n' +
'  var text = pre ? (pre.innerText || pre.textContent || \'\') : \'\';\n' +
'  try { await navigator.clipboard.writeText(text.trim()); }\n' +
'  catch(e) {\n' +
'    var ta = document.createElement(\'textarea\');\n' +
'    ta.style.position = \'fixed\'; ta.style.top = \'-9999px\';\n' +
'    ta.value = text.trim();\n' +
'    document.body.appendChild(ta); ta.select();\n' +
'    document.execCommand(\'copy\'); document.body.removeChild(ta);\n' +
'  }\n' +
'  btn.textContent = \'copied!\';\n' +
'  setTimeout(function() { btn.textContent = \'copy\'; }, 2000);\n' +
'}\n' +
'\n' +
'var sections = document.querySelectorAll(\'.content h2[id]\');\n' +
'var links = document.querySelectorAll(\'.sidebar a[href^="#"]\');\n' +
'window.addEventListener(\'scroll\', function() {\n' +
'  var pos = window.scrollY + 80;\n' +
'  var active = null;\n' +
'  sections.forEach(function(s) { if (s.offsetTop <= pos) active = s; });\n' +
'  links.forEach(function(l) {\n' +
'    var isActive = active && l.getAttribute(\'href\') === \'#\' + active.id;\n' +
'    l.className = isActive ? \'on\' : \'\';\n' +
'  });\n' +
'}, { passive: true });\n' +
'<\/script>\n' +
'<\/body>\n' +
'<\/html>';
}
