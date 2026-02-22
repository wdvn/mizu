export const indexerPage = `
<h2>Multi-Layer Indexing</h2>
<p>OpenIndex maintains four complementary index types, each optimized for a different access pattern. Together they provide URL lookup, analytics, keyword search, and semantic search over the entire corpus.</p>

<div class="card-grid">
  <div class="card">
    <h3>CDX Index</h3>
    <p>CDXJ-format index for fast URL-to-WARC record lookup. Compatible with the Common Crawl / Wayback Machine CDX format. Enables random access to any page in the archive.</p>
  </div>
  <div class="card">
    <h3>Columnar Index</h3>
    <p>Apache Parquet files containing structured metadata for every crawled page. Queryable with DuckDB, Spark, Athena, Polars, and any Parquet-compatible tool.</p>
  </div>
  <div class="card">
    <h3>Full-Text Index</h3>
    <p>Tantivy-based inverted index for keyword search across the entire corpus. Supports BM25 ranking, phrase queries, field-specific search, and faceted filtering.</p>
  </div>
  <div class="card">
    <h3>Vector Index</h3>
    <p>Dense embeddings stored in Vald distributed vector database. Enables semantic similarity search, content clustering, and retrieval-augmented generation (RAG).</p>
  </div>
</div>

<hr>

<h2>CDX Index</h2>
<p>The CDX (Capture/Crawl inDeX) provides a sorted index mapping URLs to their locations in WARC files. OpenIndex uses the CDXJ format (JSON-based CDX), the same format used by Common Crawl and the Wayback Machine.</p>

<h3>Format</h3>
<p>Each line in a CDXJ file contains a SURT-encoded URL key, a timestamp, and a JSON block with record metadata:</p>

<pre><code>com,example)/path 20260215083000 {"url":"https://example.com/path","mime":"text/html","status":"200","digest":"sha1:KZLQOIQAVCERZ6CQZJAGWKBGW4RCEUGC","length":"12453","offset":"3245678","filename":"segments/1708000000000.00/warc/00042.warc.gz"}</code></pre>

<h3>SURT URL Key</h3>
<p>URLs are stored in SURT (Sort-friendly URI Rewriting Transform) order, which reverses the domain components for efficient prefix-based lookups:</p>

<table>
  <thead>
    <tr>
      <th>Original URL</th>
      <th>SURT Key</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>https://example.com/page</code></td>
      <td><code>com,example)/page</code></td>
    </tr>
    <tr>
      <td><code>https://blog.example.com/post/1</code></td>
      <td><code>com,example,blog)/post/1</code></td>
    </tr>
    <tr>
      <td><code>https://docs.example.org/api</code></td>
      <td><code>org,example,docs)/api</code></td>
    </tr>
  </tbody>
</table>

<h3>CDX JSON Fields</h3>
<table>
  <thead>
    <tr>
      <th>Field</th>
      <th>Type</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>url</code></td>
      <td>string</td>
      <td>Original URL as crawled</td>
    </tr>
    <tr>
      <td><code>mime</code></td>
      <td>string</td>
      <td>Content-Type (detected MIME type)</td>
    </tr>
    <tr>
      <td><code>mime-detected</code></td>
      <td>string</td>
      <td>MIME type detected from content (may differ from server header)</td>
    </tr>
    <tr>
      <td><code>status</code></td>
      <td>string</td>
      <td>HTTP status code</td>
    </tr>
    <tr>
      <td><code>digest</code></td>
      <td>string</td>
      <td>SHA-1 digest of the response payload (<code>sha1:BASE32</code>)</td>
    </tr>
    <tr>
      <td><code>length</code></td>
      <td>string</td>
      <td>Compressed record length in bytes</td>
    </tr>
    <tr>
      <td><code>offset</code></td>
      <td>string</td>
      <td>Byte offset within the WARC file</td>
    </tr>
    <tr>
      <td><code>filename</code></td>
      <td>string</td>
      <td>Path to the WARC file (relative to crawl root)</td>
    </tr>
    <tr>
      <td><code>languages</code></td>
      <td>string</td>
      <td>Detected content languages (comma-separated ISO 639-1)</td>
    </tr>
    <tr>
      <td><code>charset</code></td>
      <td>string</td>
      <td>Detected character encoding</td>
    </tr>
  </tbody>
</table>

<h3>CDX API</h3>

<div class="endpoint">
  <div class="endpoint-header">
    <span class="endpoint-method method-get">GET</span>
    <span class="endpoint-path">/v1/cdx?url={url}&crawl={crawl_id}</span>
  </div>
  <div class="endpoint-body">
    <p>Look up CDX records for a URL. Supports exact match, prefix match, and domain queries.</p>
    <h4>Parameters</h4>
    <table>
      <thead>
        <tr>
          <th>Parameter</th>
          <th>Type</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><code>url</code></td>
          <td>string</td>
          <td>URL to look up (required)</td>
        </tr>
        <tr>
          <td><code>crawl</code></td>
          <td>string</td>
          <td>Crawl ID, e.g. <code>OI-2026-02</code> (default: latest)</td>
        </tr>
        <tr>
          <td><code>matchType</code></td>
          <td>string</td>
          <td><code>exact</code>, <code>prefix</code>, <code>host</code>, or <code>domain</code></td>
        </tr>
        <tr>
          <td><code>limit</code></td>
          <td>integer</td>
          <td>Maximum number of results (default: 100, max: 10000)</td>
        </tr>
        <tr>
          <td><code>output</code></td>
          <td>string</td>
          <td><code>json</code> (default) or <code>cdxj</code></td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

<pre><code># Look up a specific URL
curl "https://api.openindex.org/v1/cdx?url=https://example.com/&crawl=OI-2026-02"

# Domain-level query (all pages under example.com)
curl "https://api.openindex.org/v1/cdx?url=example.com&matchType=domain&limit=1000"

# Get results in CDXJ format
curl "https://api.openindex.org/v1/cdx?url=https://example.com/&output=cdxj"</code></pre>

<hr>

<h2>Columnar Index (Parquet)</h2>
<p>The columnar index stores structured metadata for every crawled page in Apache Parquet format. This enables high-performance analytical queries using any Parquet-compatible tool.</p>

<h3>Schema</h3>
<table>
  <thead>
    <tr>
      <th>Column</th>
      <th>Type</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>url</code></td>
      <td>STRING</td>
      <td>Full URL</td>
    </tr>
    <tr>
      <td><code>url_surtkey</code></td>
      <td>STRING</td>
      <td>SURT-encoded URL key</td>
    </tr>
    <tr>
      <td><code>url_host_name</code></td>
      <td>STRING</td>
      <td>Hostname (e.g., <code>www.example.com</code>)</td>
    </tr>
    <tr>
      <td><code>url_host_tld</code></td>
      <td>STRING</td>
      <td>Top-level domain (e.g., <code>com</code>)</td>
    </tr>
    <tr>
      <td><code>url_host_registered_domain</code></td>
      <td>STRING</td>
      <td>Registered domain (e.g., <code>example.com</code>)</td>
    </tr>
    <tr>
      <td><code>url_path</code></td>
      <td>STRING</td>
      <td>URL path component</td>
    </tr>
    <tr>
      <td><code>fetch_time</code></td>
      <td>TIMESTAMP</td>
      <td>UTC timestamp of the crawl</td>
    </tr>
    <tr>
      <td><code>fetch_status</code></td>
      <td>INT16</td>
      <td>HTTP status code</td>
    </tr>
    <tr>
      <td><code>content_mime_type</code></td>
      <td>STRING</td>
      <td>Content-Type from server</td>
    </tr>
    <tr>
      <td><code>content_mime_detected</code></td>
      <td>STRING</td>
      <td>Content-Type detected from content</td>
    </tr>
    <tr>
      <td><code>content_charset</code></td>
      <td>STRING</td>
      <td>Character encoding</td>
    </tr>
    <tr>
      <td><code>content_languages</code></td>
      <td>STRING</td>
      <td>Detected languages (comma-separated)</td>
    </tr>
    <tr>
      <td><code>content_length</code></td>
      <td>INT64</td>
      <td>Response body size in bytes</td>
    </tr>
    <tr>
      <td><code>content_text_length</code></td>
      <td>INT64</td>
      <td>Extracted text length in characters</td>
    </tr>
    <tr>
      <td><code>title</code></td>
      <td>STRING</td>
      <td>Page title from <code>&lt;title&gt;</code> tag</td>
    </tr>
    <tr>
      <td><code>description</code></td>
      <td>STRING</td>
      <td>Meta description</td>
    </tr>
    <tr>
      <td><code>warc_filename</code></td>
      <td>STRING</td>
      <td>WARC file path</td>
    </tr>
    <tr>
      <td><code>warc_record_offset</code></td>
      <td>INT64</td>
      <td>Byte offset in WARC file</td>
    </tr>
    <tr>
      <td><code>warc_record_length</code></td>
      <td>INT64</td>
      <td>Compressed record length</td>
    </tr>
    <tr>
      <td><code>warc_segment</code></td>
      <td>STRING</td>
      <td>Segment identifier</td>
    </tr>
    <tr>
      <td><code>content_digest</code></td>
      <td>STRING</td>
      <td>SHA-1 content digest</td>
    </tr>
    <tr>
      <td><code>links_count</code></td>
      <td>INT32</td>
      <td>Number of outgoing links</td>
    </tr>
  </tbody>
</table>

<h3>Query Examples</h3>
<p>The Parquet files can be queried directly from S3 using DuckDB, without downloading:</p>

<pre><code>-- Count pages per TLD
SELECT url_host_tld, count(*) as pages
FROM read_parquet('s3://openindex/OI-2026-02/parquet/*.parquet')
GROUP BY url_host_tld
ORDER BY pages DESC
LIMIT 20;

-- Find all English-language pages from a domain
SELECT url, title, fetch_time
FROM read_parquet('s3://openindex/OI-2026-02/parquet/*.parquet')
WHERE url_host_registered_domain = 'example.com'
  AND content_languages LIKE '%en%'
ORDER BY fetch_time DESC;

-- Language distribution
SELECT content_languages, count(*) as pages,
       round(count(*) * 100.0 / sum(count(*)) OVER (), 2) as pct
FROM read_parquet('s3://openindex/OI-2026-02/parquet/*.parquet')
WHERE content_languages IS NOT NULL
GROUP BY content_languages
ORDER BY pages DESC
LIMIT 30;</code></pre>

<h3>Compatible Tools</h3>
<table>
  <thead>
    <tr>
      <th>Tool</th>
      <th>Usage</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>DuckDB</strong></td>
      <td><code>SELECT * FROM read_parquet('s3://openindex/...')</code></td>
    </tr>
    <tr>
      <td><strong>Apache Spark</strong></td>
      <td><code>spark.read.parquet("s3://openindex/...")</code></td>
    </tr>
    <tr>
      <td><strong>AWS Athena</strong></td>
      <td>Create external table pointing to S3 path</td>
    </tr>
    <tr>
      <td><strong>Polars</strong></td>
      <td><code>pl.scan_parquet("s3://openindex/...")</code></td>
    </tr>
    <tr>
      <td><strong>pandas</strong></td>
      <td><code>pd.read_parquet("s3://openindex/...")</code></td>
    </tr>
    <tr>
      <td><strong>ClickHouse</strong></td>
      <td><code>SELECT * FROM s3('s3://openindex/...', 'Parquet')</code></td>
    </tr>
  </tbody>
</table>

<h3>Storage Details</h3>
<p>Parquet files use Snappy compression and are partitioned by crawl segment. Each file is approximately 500 MB compressed, containing metadata for roughly 5 million pages. Total size per crawl is approximately 280 GB.</p>

<hr>

<h2>Full-Text Index (Tantivy)</h2>
<p>The full-text index is built on <a href="https://github.com/quickwit-oss/tantivy">Tantivy</a>, a high-performance full-text search engine library written in Rust. It provides keyword search across the text content of all crawled pages.</p>

<h3>Indexed Fields</h3>
<table>
  <thead>
    <tr>
      <th>Field</th>
      <th>Type</th>
      <th>Searchable</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>url</code></td>
      <td>string</td>
      <td>Exact + tokenized</td>
      <td>Page URL</td>
    </tr>
    <tr>
      <td><code>title</code></td>
      <td>text</td>
      <td>Full-text (boosted 2x)</td>
      <td>Page title</td>
    </tr>
    <tr>
      <td><code>body</code></td>
      <td>text</td>
      <td>Full-text</td>
      <td>Extracted plaintext content</td>
    </tr>
    <tr>
      <td><code>description</code></td>
      <td>text</td>
      <td>Full-text (boosted 1.5x)</td>
      <td>Meta description</td>
    </tr>
    <tr>
      <td><code>domain</code></td>
      <td>string</td>
      <td>Exact</td>
      <td>Registered domain</td>
    </tr>
    <tr>
      <td><code>language</code></td>
      <td>string</td>
      <td>Exact</td>
      <td>Detected language code</td>
    </tr>
    <tr>
      <td><code>fetch_time</code></td>
      <td>datetime</td>
      <td>Range</td>
      <td>Crawl timestamp</td>
    </tr>
    <tr>
      <td><code>content_type</code></td>
      <td>string</td>
      <td>Exact</td>
      <td>MIME type</td>
    </tr>
  </tbody>
</table>

<h3>Search API</h3>

<div class="endpoint">
  <div class="endpoint-header">
    <span class="endpoint-method method-get">GET</span>
    <span class="endpoint-path">/v1/search?q={query}&crawl={crawl_id}</span>
  </div>
  <div class="endpoint-body">
    <p>Full-text search across the corpus. Supports Boolean operators, phrase queries, field-specific search, and faceted filtering.</p>
    <h4>Query Syntax</h4>
    <table>
      <thead>
        <tr>
          <th>Syntax</th>
          <th>Example</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Keywords</td>
          <td><code>machine learning</code></td>
          <td>Match pages containing both terms</td>
        </tr>
        <tr>
          <td>Phrase</td>
          <td><code>"machine learning"</code></td>
          <td>Exact phrase match</td>
        </tr>
        <tr>
          <td>Boolean</td>
          <td><code>machine AND learning NOT deep</code></td>
          <td>Boolean operators</td>
        </tr>
        <tr>
          <td>Field</td>
          <td><code>title:"AI research"</code></td>
          <td>Search within a specific field</td>
        </tr>
        <tr>
          <td>Wildcard</td>
          <td><code>mach*</code></td>
          <td>Prefix matching</td>
        </tr>
        <tr>
          <td>Filter</td>
          <td><code>language:en domain:example.com</code></td>
          <td>Exact field filters</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

<pre><code># Simple keyword search
curl "https://api.openindex.org/v1/search?q=climate+change+policy&crawl=OI-2026-02&limit=10"

# Field-specific search with language filter
curl "https://api.openindex.org/v1/search?q=title:%22artificial+intelligence%22+language:en&limit=20"

# Response
{
  "query": "climate change policy",
  "crawl": "OI-2026-02",
  "total_hits": 4823019,
  "results": [
    {
      "url": "https://example.com/climate-policy-2026",
      "title": "Global Climate Change Policy Framework 2026",
      "snippet": "The latest &lt;em&gt;climate change policy&lt;/em&gt; framework addresses...",
      "score": 12.847,
      "domain": "example.com",
      "language": "en",
      "fetch_time": "2026-02-12T14:30:00Z"
    }
  ]
}</code></pre>

<h3>Storage Details</h3>
<p>The Tantivy index is sharded across multiple nodes, with each shard containing approximately 100 million documents. The full index for a single crawl occupies approximately 8 TiB on NVMe storage. Only the latest 3 crawls are kept in the live full-text index; older crawls can be queried via the Parquet columnar index.</p>

<hr>

<h2>Vector Index (Vald)</h2>
<p>The vector index stores dense embeddings for every crawled page, enabling semantic similarity search. It is powered by <a href="https://vald.vdaas.org/">Vald</a>, a distributed approximate nearest neighbor (ANN) search engine.</p>

<h3>Embedding Model</h3>
<table>
  <thead>
    <tr>
      <th>Property</th>
      <th>Value</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Model</strong></td>
      <td>multilingual-e5-large</td>
    </tr>
    <tr>
      <td><strong>Dimensions</strong></td>
      <td>1024</td>
    </tr>
    <tr>
      <td><strong>Granularity</strong></td>
      <td>Per-page (title + first 512 tokens of body)</td>
    </tr>
    <tr>
      <td><strong>Normalization</strong></td>
      <td>L2-normalized</td>
    </tr>
    <tr>
      <td><strong>Similarity metric</strong></td>
      <td>Cosine similarity (default), L2 distance</td>
    </tr>
  </tbody>
</table>

<h3>Vector Search API</h3>

<div class="endpoint">
  <div class="endpoint-header">
    <span class="endpoint-method method-post">POST</span>
    <span class="endpoint-path">/v1/vector/search</span>
  </div>
  <div class="endpoint-body">
    <p>Search by semantic similarity. Pass a text query (auto-embedded) or a raw vector.</p>
  </div>
</div>

<pre><code># Search by text (auto-embedded on the server)
curl -X POST "https://api.openindex.org/v1/vector/search" \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "recent advances in quantum computing",
    "crawl": "OI-2026-02",
    "k": 10,
    "metric": "cosine"
  }'

# Response
{
  "results": [
    {
      "url": "https://example.com/quantum-computing-2026",
      "title": "Quantum Computing Breakthroughs in 2026",
      "similarity": 0.951,
      "language": "en"
    },
    {
      "url": "https://arxiv.org/abs/2602.12345",
      "title": "A Survey of Quantum Error Correction Techniques",
      "similarity": 0.938,
      "language": "en"
    }
  ]
}</code></pre>

<p>For more details on the vector search capabilities, see the <a href="/vector-search">Vector Search</a> page.</p>

<h3>Storage Details</h3>
<p>Vector data is stored in Vald's distributed index across multiple agent nodes. Each crawl produces approximately 2.8 billion vectors at 1024 dimensions (float32), requiring approximately 12 TiB of storage. The index uses NGT (Neighborhood Graph and Tree) for efficient ANN search with sub-millisecond query latency.</p>

<hr>

<h2>Index Size Summary</h2>
<table>
  <thead>
    <tr>
      <th>Index Type</th>
      <th>Size per Crawl</th>
      <th>Format</th>
      <th>Retained</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>CDX</td>
      <td>~45 GB (compressed)</td>
      <td>CDXJ (gzip shards)</td>
      <td>All crawls</td>
    </tr>
    <tr>
      <td>Columnar (Parquet)</td>
      <td>~280 GB</td>
      <td>Apache Parquet (Snappy)</td>
      <td>All crawls</td>
    </tr>
    <tr>
      <td>Full-text (Tantivy)</td>
      <td>~8 TiB</td>
      <td>Tantivy segments</td>
      <td>Latest 3 crawls</td>
    </tr>
    <tr>
      <td>Vector (Vald)</td>
      <td>~12 TiB</td>
      <td>NGT index</td>
      <td>Latest 3 crawls</td>
    </tr>
  </tbody>
</table>

<div class="note">
  <strong>Accessing index data:</strong> CDX and Parquet indices are freely downloadable from S3. The full-text and vector indices are available via API only due to their size. See the <a href="/get-started">Get Started</a> guide for access details.
</div>
`
