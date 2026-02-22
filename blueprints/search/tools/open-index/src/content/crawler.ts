export const crawlerPage = `
<h2>OpenIndexBot</h2>
<p>OpenIndexBot is the open-source web crawler that powers the OpenIndex platform. It is a distributed, high-throughput crawler written in Go, designed for transparency, compliance, and respect for web publishers.</p>

<div class="note">
  <strong>Website owners:</strong> If you are seeing requests from OpenIndexBot and want to control its access, see the <a href="#blocking">Blocking OpenIndexBot</a> section below.
</div>

<h2>User-Agent String</h2>
<p>OpenIndexBot identifies itself with the following user-agent string:</p>

<pre><code>OpenIndexBot/1.0 (+https://open-index.go-mizu.workers.dev/crawler)</code></pre>

<p>The full HTTP request headers sent by the crawler:</p>
<pre><code>User-Agent: OpenIndexBot/1.0 (+https://open-index.go-mizu.workers.dev/crawler)
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8
Accept-Encoding: gzip, br
Accept-Language: en-US,en;q=0.5
Connection: keep-alive</code></pre>

<h2 id="blocking">Robots.txt Compliance</h2>
<p>OpenIndexBot fully respects the <a href="https://www.rfc-editor.org/rfc/rfc9309">Robots Exclusion Protocol (RFC 9309)</a>. To block OpenIndexBot from crawling your site, add the following to your <code>robots.txt</code>:</p>

<pre><code># Block OpenIndexBot from all pages
User-agent: OpenIndexBot
Disallow: /</code></pre>

<p>You can also selectively block specific paths:</p>
<pre><code># Block OpenIndexBot from specific directories
User-agent: OpenIndexBot
Disallow: /private/
Disallow: /admin/
Disallow: /api/
Allow: /api/public/</code></pre>

<p>OpenIndexBot checks <code>robots.txt</code> before every crawl request. The robots.txt file is cached for the duration specified by the <code>Cache-Control</code> header, or for a default of 24 hours if no cache header is present.</p>

<h2>Rate Limiting and Adaptive Back-off</h2>
<p>OpenIndexBot is designed to be a respectful visitor. It implements multiple layers of rate limiting:</p>

<table>
  <thead>
    <tr>
      <th>Mechanism</th>
      <th>Behavior</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Default delay</strong></td>
      <td>Minimum 1 second between requests to the same domain</td>
    </tr>
    <tr>
      <td><strong>Crawl-Delay directive</strong></td>
      <td>Honored if specified in robots.txt (up to 60 seconds)</td>
    </tr>
    <tr>
      <td><strong>HTTP 429 (Too Many Requests)</strong></td>
      <td>Backs off immediately, respects <code>Retry-After</code> header</td>
    </tr>
    <tr>
      <td><strong>HTTP 503 (Service Unavailable)</strong></td>
      <td>Backs off with exponential delay, respects <code>Retry-After</code></td>
    </tr>
    <tr>
      <td><strong>Connection errors</strong></td>
      <td>Exponential back-off starting at 5 seconds, max 5 retries</td>
    </tr>
    <tr>
      <td><strong>Slow responses</strong></td>
      <td>If response time exceeds 10 seconds, delay between requests is increased</td>
    </tr>
    <tr>
      <td><strong>Per-domain concurrency</strong></td>
      <td>Maximum 2 concurrent connections per domain (configurable down to 1)</td>
    </tr>
  </tbody>
</table>

<h3>Adaptive Back-off Algorithm</h3>
<p>The crawler continuously monitors the response behavior of each domain and adapts its crawl rate accordingly:</p>

<pre><code>// Simplified adaptive back-off logic
baseDelay := max(crawlDelay, 1*time.Second)

if responseTime > 10*time.Second {
    delay = baseDelay * 3    // Slow server, triple the delay
} else if statusCode == 429 || statusCode == 503 {
    delay = retryAfter       // Respect Retry-After header
    if retryAfter == 0 {
        delay = baseDelay * time.Duration(math.Pow(2, float64(retryCount)))
    }
} else if consecutiveErrors > 3 {
    delay = baseDelay * 10   // Persistent errors, back way off
} else {
    delay = baseDelay        // Normal operation
}</code></pre>

<h2>Crawl-Delay Directive</h2>
<p>OpenIndexBot honors the <code>Crawl-delay</code> directive in robots.txt. This is a non-standard but widely supported extension that specifies the minimum delay (in seconds) between consecutive requests:</p>

<pre><code>User-agent: OpenIndexBot
Crawl-delay: 5</code></pre>

<p>This tells OpenIndexBot to wait at least 5 seconds between requests to your site. The maximum honored value is 60 seconds. Values above 60 are treated as a signal to not crawl the site.</p>

<h2>Sitemap Protocol Support</h2>
<p>OpenIndexBot supports the <a href="https://www.sitemaps.org/protocol.html">Sitemap Protocol</a>. It will discover sitemaps via:</p>
<ul>
  <li>The <code>Sitemap:</code> directive in <code>robots.txt</code></li>
  <li>The default location at <code>/sitemap.xml</code></li>
  <li>Sitemap index files referencing multiple sub-sitemaps</li>
</ul>

<p>Sitemaps are used for URL discovery and crawl prioritization. The <code>&lt;priority&gt;</code> and <code>&lt;changefreq&gt;</code> hints are respected during scheduling. The <code>&lt;lastmod&gt;</code> field is used with conditional GET requests to avoid re-fetching unchanged pages.</p>

<h2>Conditional GET Support</h2>
<p>OpenIndexBot supports conditional HTTP requests to minimize bandwidth and server load:</p>

<table>
  <thead>
    <tr>
      <th>Header</th>
      <th>Behavior</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>If-Modified-Since</code></td>
      <td>Sent on revisits using the <code>Last-Modified</code> value from the previous crawl</td>
    </tr>
    <tr>
      <td><code>If-None-Match</code></td>
      <td>Sent on revisits using the <code>ETag</code> value from the previous crawl</td>
    </tr>
  </tbody>
</table>

<p>When the server responds with <code>304 Not Modified</code>, the crawler skips downloading the body and retains the previous version in the index. This significantly reduces bandwidth for sites that properly implement conditional responses.</p>

<h2>Compression Support</h2>
<p>OpenIndexBot sends <code>Accept-Encoding: gzip, br</code> and can decompress both gzip and Brotli responses. Servers that support compression will see reduced bandwidth usage from the crawler.</p>

<h2>Link Following and nofollow</h2>
<p>OpenIndexBot discovers new URLs by extracting links from crawled pages. It respects the following signals to avoid following specific links:</p>
<ul>
  <li><code>rel="nofollow"</code> on individual <code>&lt;a&gt;</code> tags</li>
  <li><code>&lt;meta name="robots" content="nofollow"&gt;</code> to prevent following all links on a page</li>
  <li><code>&lt;meta name="OpenIndexBot" content="nofollow"&gt;</code> for crawler-specific control</li>
  <li><code>X-Robots-Tag: nofollow</code> HTTP response header</li>
</ul>

<p>The <code>noindex</code> directive is also respected. Pages with <code>noindex</code> will be crawled (to discover outgoing links, if <code>nofollow</code> is not also set) but will not be included in the search index.</p>

<h2>IP Ranges</h2>
<p>OpenIndexBot crawls from the following IP address ranges. You can use these for firewall allowlisting or verification:</p>

<pre><code># IPv4 ranges
198.51.100.0/24
203.0.113.0/24
192.0.2.0/24

# IPv6 ranges
2001:db8:1000::/48
2001:db8:2000::/48</code></pre>

<div class="note">
  <strong>Note:</strong> IP ranges may change as infrastructure scales. Always verify using reverse DNS (see below) rather than relying solely on IP allowlists. An up-to-date list is maintained at <code>https://api.openindex.org/v1/crawler/ip-ranges.json</code>.
</div>

<h2>Reverse DNS Verification</h2>
<p>The most reliable way to verify that a request is genuinely from OpenIndexBot is through reverse DNS lookup. All crawler IPs resolve to hostnames under <code>*.crawl.openindex.org</code>.</p>

<h3>Verification Steps</h3>
<ol>
  <li>Perform a reverse DNS lookup on the IP address</li>
  <li>Confirm the hostname ends with <code>.crawl.openindex.org</code></li>
  <li>Perform a forward DNS lookup on the hostname</li>
  <li>Confirm the forward lookup resolves back to the original IP</li>
</ol>

<pre><code># Step 1: Reverse DNS lookup
$ dig -x 198.51.100.42 +short
crawler-042.us-east.crawl.openindex.org.

# Step 2: Verify the hostname matches *.crawl.openindex.org
# (hostname ends with .crawl.openindex.org -- verified)

# Step 3: Forward DNS lookup
$ dig crawler-042.us-east.crawl.openindex.org +short
198.51.100.42

# Step 4: Confirm the IP matches -- verified!</code></pre>

<p>Hostname format: <code>crawler-{id}.{region}.crawl.openindex.org</code></p>

<table>
  <thead>
    <tr>
      <th>Region</th>
      <th>Hostname Pattern</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>US East</td>
      <td><code>crawler-*.us-east.crawl.openindex.org</code></td>
    </tr>
    <tr>
      <td>US West</td>
      <td><code>crawler-*.us-west.crawl.openindex.org</code></td>
    </tr>
    <tr>
      <td>EU West</td>
      <td><code>crawler-*.eu-west.crawl.openindex.org</code></td>
    </tr>
    <tr>
      <td>EU Central</td>
      <td><code>crawler-*.eu-central.crawl.openindex.org</code></td>
    </tr>
    <tr>
      <td>Asia Pacific</td>
      <td><code>crawler-*.ap-east.crawl.openindex.org</code></td>
    </tr>
  </tbody>
</table>

<h2>Crawl Schedule</h2>
<p>OpenIndex operates two crawl modes:</p>

<div class="card-grid">
  <div class="card">
    <h3>Monthly Full Crawl</h3>
    <p>A comprehensive crawl of billions of URLs, producing a complete snapshot of the web. Each monthly crawl is a self-contained dataset identified by its crawl ID (e.g., <code>OI-2026-02</code>). Full crawls typically run from the 1st to the 25th of each month.</p>
  </div>
  <div class="card">
    <h3>Continuous Delta Crawl</h3>
    <p>A rolling crawl that continuously revisits high-priority and frequently-changing pages between full crawls. Delta crawl data is merged into the next monthly release. Priority is determined by historical change frequency, sitemap hints, and domain importance.</p>
  </div>
</div>

<h3>Crawl Prioritization</h3>
<p>URLs are prioritized for crawling based on multiple signals:</p>
<ol>
  <li><strong>Historical change frequency</strong> -- pages that change often are crawled more frequently</li>
  <li><strong>Sitemap priority and changefreq</strong> -- publisher-provided hints</li>
  <li><strong>Inbound link count</strong> -- well-linked pages are prioritized</li>
  <li><strong>Domain authority</strong> -- pages on high-authority domains are crawled first</li>
  <li><strong>Content diversity</strong> -- URLs are selected to maximize language and topic diversity</li>
</ol>

<h2>Contact</h2>
<p>If you have questions about OpenIndexBot, need help with robots.txt configuration, or want to report an issue with the crawler's behavior:</p>
<ul>
  <li>Email: <a href="mailto:crawler@openindex.org">crawler@openindex.org</a></li>
  <li>GitHub: <a href="https://github.com/nicholasgasior/gopher-crawl/issues">Report an issue</a></li>
  <li>Discord: <a href="https://discord.gg/openindex">#crawler channel</a></li>
</ul>
`
