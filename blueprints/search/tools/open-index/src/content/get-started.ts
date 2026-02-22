export const getStartedPage = `
<h2>Three Ways to Access OpenIndex</h2>
<p>OpenIndex provides multiple ways to access the open web index, from quick API calls to running your own instance. Choose the path that fits your use case.</p>

<div class="card-grid">
  <div class="card">
    <div class="card-icon" style="background:#eff6ff;color:#2563eb">&#x26A1;</div>
    <h3>API (Quick Start)</h3>
    <p>Query the index immediately with simple HTTP requests. No installation required. Free for research and open-source use.</p>
    <span class="card-link">Jump to API &darr;</span>
  </div>
  <div class="card">
    <div class="card-icon" style="background:#fef3c7;color:#d97706">&#x1F4BB;</div>
    <h3>CLI Tool</h3>
    <p>Install the <code>openindex</code> command-line tool for scripted access, bulk operations, and automation workflows.</p>
    <span class="card-link">Jump to CLI &darr;</span>
  </div>
  <div class="card">
    <div class="card-icon" style="background:#dcfce7;color:#16a34a">&#x1F3E0;</div>
    <h3>Self-Host</h3>
    <p>Run the entire OpenIndex stack on your own infrastructure. Full control over data, indexing, and query processing.</p>
    <span class="card-link">Jump to Self-Host &darr;</span>
  </div>
</div>

<hr>

<h2>Path 1: API Quick Start</h2>
<p>The fastest way to start querying OpenIndex. No signup is required for basic access (100 requests/minute). For higher limits, get a free API key.</p>

<h3>Your First Query</h3>
<p>Search the entire index for pages matching a query:</p>

<pre><code># Search for pages about climate change
curl "https://api.openindex.org/v1/search?q=climate+change&limit=5"

# Look up a specific URL
curl "https://api.openindex.org/v1/url?url=https://example.com"

# Browse a domain
curl "https://api.openindex.org/v1/domain?domain=wikipedia.org&limit=10"</code></pre>

<h3>Authenticated Requests</h3>
<p>For higher rate limits and access to vector search, include your API key:</p>

<pre><code># Get a free API key at https://openindex.org/api-key
curl -H "Authorization: Bearer oi_your_api_key_here" \\
  "https://api.openindex.org/v1/search?q=machine+learning&limit=20"

# Semantic search (requires API key)
curl -X POST "https://api.openindex.org/v1/vector/search" \\
  -H "Authorization: Bearer oi_your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"query": "how do neural networks learn", "limit": 10}'</code></pre>

<h3>Response Format</h3>
<p>All API responses are JSON. Here is a typical search response:</p>

<pre><code>{
  "results": [
    {
      "url": "https://example.com/article",
      "title": "Understanding Climate Change",
      "snippet": "Climate change refers to long-term shifts in...",
      "crawl": "OI-2026-02",
      "timestamp": "2026-02-15T08:30:00Z",
      "language": "en",
      "content_length": 45230
    }
  ],
  "total": 1847293,
  "offset": 0,
  "limit": 5
}</code></pre>

<div class="note">
  See the full <a href="/api">API Reference</a> for all endpoints, parameters, and response schemas.
</div>

<hr>

<h2>Path 2: CLI Tool</h2>
<p>The <code>openindex</code> CLI provides powerful command-line access for scripting, bulk downloads, and automated workflows.</p>

<h3>Installation</h3>

<details>
  <summary>macOS (Homebrew)</summary>
  <div class="details-body">
<pre><code>brew install openindex/tap/openindex
openindex --version</code></pre>
  </div>
</details>

<details>
  <summary>Linux (apt / deb)</summary>
  <div class="details-body">
<pre><code>curl -fsSL https://get.openindex.org/install.sh | bash
# or manually:
wget https://github.com/openindex/cli/releases/latest/download/openindex-linux-amd64.deb
sudo dpkg -i openindex-linux-amd64.deb</code></pre>
  </div>
</details>

<details>
  <summary>Go (from source)</summary>
  <div class="details-body">
<pre><code>go install github.com/openindex/cli/cmd/openindex@latest</code></pre>
  </div>
</details>

<details>
  <summary>Docker</summary>
  <div class="details-body">
<pre><code>docker pull openindex/cli:latest
docker run --rm openindex/cli search "climate change"</code></pre>
  </div>
</details>

<h3>Basic Commands</h3>
<pre><code># Configure your API key (optional, increases rate limits)
openindex auth login

# Search the index
openindex search "renewable energy policy"

# Look up a URL
openindex url https://example.com

# Download WARC files for a domain
openindex download --domain example.com --output ./data/

# Export search results as JSON
openindex search "machine learning" --format json --limit 1000 > results.json

# Query with OQL (OpenIndex Query Language)
openindex query "SELECT url, title FROM index WHERE CONTAINS('deep learning') LIMIT 50"</code></pre>

<hr>

<h2>Path 3: Self-Host</h2>
<p>Run the entire OpenIndex platform on your own infrastructure. This gives you full control over the data, custom indexing pipelines, and zero rate limits.</p>

<div class="note note-warn">
  Self-hosting requires significant infrastructure. A minimal setup needs at least 64 GB RAM and 10 TB of storage. Production deployments typically run across a Kubernetes cluster.
</div>

<h3>Quick Start with Docker Compose</h3>
<pre><code># Clone the repository
git clone https://github.com/openindex/openindex.git
cd openindex

# Start all services (API, indexer, vector DB, graph DB)
docker compose up -d

# Verify services are running
docker compose ps

# Import a sample dataset
openindex import --source s3://openindex/samples/sample-1m.warc.gz</code></pre>

<h3>Kubernetes Deployment</h3>
<pre><code># Add the OpenIndex Helm chart
helm repo add openindex https://charts.openindex.org
helm repo update

# Install with default configuration
helm install openindex openindex/openindex \\
  --namespace openindex \\
  --create-namespace \\
  --set storage.class=gp3 \\
  --set storage.size=10Ti</code></pre>

<hr>

<h2>Data Access</h2>
<p>All OpenIndex data is freely available for download. The dataset is stored on S3-compatible object storage and served via a global CDN.</p>

<h3>Access Methods</h3>
<table>
  <thead>
    <tr>
      <th>Method</th>
      <th>URL / Endpoint</th>
      <th>Best For</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>S3 (Direct)</strong></td>
      <td><code>s3://openindex/</code></td>
      <td>Bulk downloads, cloud processing (AWS, GCP, Azure)</td>
    </tr>
    <tr>
      <td><strong>HTTPS CDN</strong></td>
      <td><code>https://data.openindex.org/</code></td>
      <td>Direct file downloads, small to medium datasets</td>
    </tr>
    <tr>
      <td><strong>API</strong></td>
      <td><code>https://api.openindex.org/v1/</code></td>
      <td>Querying, searching, programmatic access</td>
    </tr>
    <tr>
      <td><strong>CLI</strong></td>
      <td><code>openindex download</code></td>
      <td>Scripted downloads, resumable transfers</td>
    </tr>
  </tbody>
</table>

<h3>S3 Bucket Structure</h3>
<pre><code>s3://openindex/
  crawl/
    OI-2026-02/
      warc/                 # Raw WARC files (~420 TiB)
        OI-2026-02-00000.warc.gz
        OI-2026-02-00001.warc.gz
        ...
      wat/                  # Metadata (WAT format)
      wet/                  # Plaintext (WET format)
      index/
        cdx/                # CDX index files
        parquet/            # Columnar index (Parquet)
      vector/               # Embedding files
      graph/                # Knowledge graph exports
  metadata/
    crawl-manifest.json     # List of all crawls
    file-manifest.json      # File listing with checksums</code></pre>

<h3>Downloading with AWS CLI</h3>
<pre><code># List available crawls
aws s3 ls s3://openindex/crawl/ --no-sign-request

# Download the Parquet index for the latest crawl
aws s3 sync s3://openindex/crawl/OI-2026-02/index/parquet/ ./data/parquet/ \\
  --no-sign-request

# Download a single WARC file
aws s3 cp s3://openindex/crawl/OI-2026-02/warc/OI-2026-02-00000.warc.gz ./data/ \\
  --no-sign-request</code></pre>

<hr>

<h2>Data Formats Overview</h2>
<p>OpenIndex stores data in multiple formats, each optimized for different use cases.</p>

<details>
  <summary>WARC (Web ARChive) -- Full HTTP Responses</summary>
  <div class="details-body">
    <p>The primary archive format. Contains complete HTTP request/response pairs including headers, body, and metadata. Each file is gzip-compressed and typically 1 GB in size.</p>
<pre><code>WARC/1.0
WARC-Type: response
WARC-Date: 2026-02-15T08:30:00Z
WARC-Target-URI: https://example.com/article
Content-Length: 45230
Content-Type: application/http;msgtype=response

HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8

&lt;!DOCTYPE html&gt;
&lt;html&gt;...&lt;/html&gt;</code></pre>
  </div>
</details>

<details>
  <summary>WAT (Web Archive Transformation) -- Metadata as JSON</summary>
  <div class="details-body">
    <p>Extracted metadata from each WARC record in JSON Lines format. Includes HTTP headers, HTML metadata, link graphs, and detected languages.</p>
<pre><code>{
  "Envelope": {
    "WARC-Header-Metadata": {
      "WARC-Target-URI": "https://example.com/article",
      "WARC-Date": "2026-02-15T08:30:00Z"
    },
    "Payload-Metadata": {
      "HTTP-Response-Metadata": {
        "Response-Message": { "Status": 200 },
        "Headers": { "Content-Type": "text/html" }
      },
      "HTML-Metadata": {
        "Head": { "Title": "Example Article" },
        "Links": [{"url": "https://example.com/other", "rel": "href"}]
      }
    }
  }
}</code></pre>
  </div>
</details>

<details>
  <summary>WET (WARC Encapsulated Text) -- Plaintext Extraction</summary>
  <div class="details-body">
    <p>Clean plaintext extracted from each page. Boilerplate, navigation, and ads are removed. Ideal for NLP and text analysis.</p>
<pre><code>WARC/1.0
WARC-Type: conversion
WARC-Target-URI: https://example.com/article
Content-Type: text/plain
Content-Length: 2847

Understanding Climate Change
Climate change refers to long-term shifts in
temperatures and weather patterns. These shifts
may be natural, but since the 1800s, human
activities have been the main driver...</code></pre>
  </div>
</details>

<details>
  <summary>Parquet -- Columnar Index</summary>
  <div class="details-body">
    <p>Apache Parquet files provide a columnar index of all crawled URLs with metadata. Ideal for analytics queries with tools like DuckDB, Spark, or Pandas.</p>
<pre><code># Query with DuckDB
SELECT url, title, language, content_length
FROM read_parquet('s3://openindex/crawl/OI-2026-02/index/parquet/*.parquet')
WHERE language = 'en'
  AND content_length > 10000
LIMIT 100;</code></pre>
  </div>
</details>

<hr>

<h2>Cloud Processing</h2>
<p>For large-scale analysis, process OpenIndex data directly in the cloud without downloading it first.</p>

<h3>AWS Athena</h3>
<pre><code>-- Query Parquet index directly with Athena
SELECT language, COUNT(*) as page_count,
       AVG(content_length) as avg_size
FROM openindex.crawl_index
WHERE crawl_id = 'OI-2026-02'
GROUP BY language
ORDER BY page_count DESC
LIMIT 20;</code></pre>

<h3>DuckDB (Remote Query)</h3>
<pre><code>-- Query directly from S3 without downloading
INSTALL httpfs;
LOAD httpfs;

SELECT url, title, language
FROM read_parquet('https://data.openindex.org/crawl/OI-2026-02/index/parquet/*.parquet')
WHERE domain = 'wikipedia.org'
LIMIT 1000;</code></pre>

<h3>Python (pandas + pyarrow)</h3>
<pre><code>import pandas as pd

# Read Parquet index directly from S3
df = pd.read_parquet(
    "s3://openindex/crawl/OI-2026-02/index/parquet/",
    storage_options={"anon": True},
    filters=[("language", "==", "en")]
)
print(f"English pages: {len(df):,}")</code></pre>

<hr>

<h2>First Query Walkthrough</h2>
<p>Let us walk through a complete example: finding and downloading pages about a specific topic.</p>

<h3>Step 1: Search the Index</h3>
<pre><code>curl "https://api.openindex.org/v1/search?q=quantum+computing&limit=3" | jq .</code></pre>

<h3>Step 2: Get Details for a Specific URL</h3>
<pre><code>curl "https://api.openindex.org/v1/url?url=https://example.com/quantum-intro" | jq .</code></pre>

<h3>Step 3: Fetch the WARC Record</h3>
<pre><code># The URL lookup returns the WARC file and byte offset
curl -r 53847234-53892481 \\
  "https://data.openindex.org/crawl/OI-2026-02/warc/OI-2026-02-00142.warc.gz" \\
  | zcat</code></pre>

<h3>Step 4: Find Semantically Similar Pages</h3>
<pre><code>curl -X POST "https://api.openindex.org/v1/vector/search" \\
  -H "Authorization: Bearer oi_your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"query": "quantum computing applications in cryptography", "limit": 5}' | jq .</code></pre>

<h3>Step 5: Explore the Knowledge Graph</h3>
<pre><code># Find entities related to "quantum computing"
curl "https://api.openindex.org/v1/graph/entity?name=quantum+computing" \\
  -H "Authorization: Bearer oi_your_api_key_here" | jq .</code></pre>

<div class="note">
  Ready for more? See the <a href="/api">API Reference</a> for the full list of endpoints, or explore the <a href="/query-language">OpenIndex Query Language (OQL)</a> for advanced queries.
</div>
`
