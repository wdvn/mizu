export const dataFormatsPage = `
<h2>Data Format Overview</h2>
<p>OpenIndex stores crawled web data in multiple formats, each optimized for different access patterns. All formats are open standards or well-documented specifications, and all files are gzip-compressed for efficient storage and transfer.</p>

<table>
  <thead>
    <tr>
      <th>Format</th>
      <th>Content</th>
      <th>Use Case</th>
      <th>Typical File Size</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>WARC</strong></td>
      <td>Full HTTP responses (headers + body)</td>
      <td>Archival, replay, full content analysis</td>
      <td>~1 GB (compressed)</td>
    </tr>
    <tr>
      <td><strong>WAT</strong></td>
      <td>Metadata as JSON</td>
      <td>Link analysis, header analysis, lightweight processing</td>
      <td>~500 MB (compressed)</td>
    </tr>
    <tr>
      <td><strong>WET</strong></td>
      <td>Extracted plaintext</td>
      <td>NLP, text mining, language modeling</td>
      <td>~250 MB (compressed)</td>
    </tr>
    <tr>
      <td><strong>Parquet</strong></td>
      <td>Columnar index metadata</td>
      <td>Analytics, filtering, SQL queries</td>
      <td>~200 MB per file</td>
    </tr>
    <tr>
      <td><strong>Vector</strong></td>
      <td>Dense embeddings (float32)</td>
      <td>Semantic search, clustering, deduplication</td>
      <td>~4 GB per shard</td>
    </tr>
    <tr>
      <td><strong>JSON-LD</strong></td>
      <td>Knowledge graph entities and relations</td>
      <td>Entity search, graph analytics, linked data</td>
      <td>~1.5 GB (compressed)</td>
    </tr>
  </tbody>
</table>

<hr>

<h2>WARC Format (Web ARChive)</h2>
<p>WARC is the primary archive format used by OpenIndex. Each WARC file contains complete HTTP request/response pairs, preserving the full fidelity of the original web interaction. The format is defined by <a href="https://iipc.github.io/warc-specifications/specifications/warc-format/warc-1.1/">ISO 28500:2017</a>.</p>

<h3>Record Types</h3>
<table>
  <thead>
    <tr>
      <th>Type</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>warcinfo</code></td>
      <td>Metadata about the WARC file itself (crawler version, parameters, date range)</td>
    </tr>
    <tr>
      <td><code>request</code></td>
      <td>The HTTP request sent by the crawler</td>
    </tr>
    <tr>
      <td><code>response</code></td>
      <td>The full HTTP response (status, headers, body)</td>
    </tr>
    <tr>
      <td><code>metadata</code></td>
      <td>Additional metadata about the crawl (robots.txt status, fetch timing)</td>
    </tr>
    <tr>
      <td><code>revisit</code></td>
      <td>Indicates content identical to a previous crawl (deduplication)</td>
    </tr>
  </tbody>
</table>

<h3>Sample WARC Record</h3>
<pre><code>WARC/1.0
WARC-Type: response
WARC-Record-ID: &lt;urn:uuid:a1b2c3d4-e5f6-7890-abcd-ef1234567890&gt;
WARC-Date: 2026-02-15T08:30:00Z
WARC-Target-URI: https://example.com/article/climate-science
WARC-Payload-Digest: sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
Content-Type: application/http;msgtype=response
Content-Length: 45230
WARC-Block-Digest: sha256:abc123...

HTTP/1.1 200 OK
Date: Sat, 15 Feb 2026 08:30:00 GMT
Content-Type: text/html; charset=utf-8
Content-Length: 44891
Server: nginx/1.24.0

&lt;!DOCTYPE html&gt;
&lt;html lang="en"&gt;
&lt;head&gt;
  &lt;title&gt;Understanding Climate Science&lt;/title&gt;
&lt;/head&gt;
&lt;body&gt;
  ...page content...
&lt;/body&gt;
&lt;/html&gt;</code></pre>

<h3>WARC File Naming Convention</h3>
<pre><code>OI-{CRAWL_ID}-{FILE_NUMBER}.warc.gz

Examples:
  OI-2026-02-00000.warc.gz    # First file of February 2026 crawl
  OI-2026-02-00001.warc.gz    # Second file
  OI-2026-02-72841.warc.gz    # File 72,841</code></pre>

<div class="note">
  Each WARC file is approximately 1 GB when compressed. A typical monthly crawl produces 400,000+ WARC files totaling approximately 420 TiB.
</div>

<hr>

<h2>WAT Format (Web Archive Transformation)</h2>
<p>WAT files contain extracted metadata from each WARC record in JSON Lines format. They include HTTP headers, HTML metadata (title, meta tags, links), and crawler-specific annotations (language detection, content type classification).</p>

<p>WAT files are useful when you need metadata about pages without processing the full HTML content. They are significantly smaller than WARC files and faster to process.</p>

<h3>Sample WAT Record</h3>
<pre><code>{
  "Envelope": {
    "Format": "WARC",
    "WARC-Header-Length": 487,
    "WARC-Header-Metadata": {
      "WARC-Type": "response",
      "WARC-Record-ID": "&lt;urn:uuid:a1b2c3d4-e5f6-7890-abcd-ef1234567890&gt;",
      "WARC-Date": "2026-02-15T08:30:00Z",
      "WARC-Target-URI": "https://example.com/article/climate-science",
      "Content-Length": "45230"
    },
    "Payload-Metadata": {
      "Actual-Content-Type": "text/html",
      "HTTP-Response-Metadata": {
        "Response-Message": {
          "Status": 200,
          "Reason": "OK"
        },
        "Headers": {
          "Content-Type": "text/html; charset=utf-8",
          "Server": "nginx/1.24.0",
          "Content-Length": "44891"
        }
      },
      "HTML-Metadata": {
        "Head": {
          "Title": "Understanding Climate Science",
          "Metas": [
            {"name": "description", "content": "A comprehensive guide to climate science"},
            {"name": "author", "content": "Dr. Jane Smith"},
            {"property": "og:type", "content": "article"}
          ]
        },
        "Links": [
          {"url": "/about", "rel": "href", "text": "About Us"},
          {"url": "https://external.com/study", "rel": "href", "text": "Related Study"}
        ]
      },
      "Languages-Detected": {
        "value": "en",
        "confidence": 0.98
      }
    }
  }
}</code></pre>

<h3>WAT File Naming Convention</h3>
<pre><code>OI-{CRAWL_ID}-{FILE_NUMBER}.warc.wat.gz

Examples:
  OI-2026-02-00000.warc.wat.gz
  OI-2026-02-00001.warc.wat.gz</code></pre>

<hr>

<h2>WET Format (WARC Encapsulated Text)</h2>
<p>WET files contain clean plaintext extracted from each crawled page. HTML tags, scripts, stylesheets, boilerplate navigation, and advertisements are removed, leaving only the primary content text.</p>

<p>WET files are ideal for natural language processing, text mining, language modeling, and any analysis that operates on text content rather than HTML structure.</p>

<h3>Sample WET Record</h3>
<pre><code>WARC/1.0
WARC-Type: conversion
WARC-Record-ID: &lt;urn:uuid:b2c3d4e5-f6a7-8901-bcde-f12345678901&gt;
WARC-Date: 2026-02-15T08:30:00Z
WARC-Target-URI: https://example.com/article/climate-science
WARC-Refers-To: &lt;urn:uuid:a1b2c3d4-e5f6-7890-abcd-ef1234567890&gt;
Content-Type: text/plain
Content-Length: 2847

Understanding Climate Science

Climate science studies the long-term patterns of temperature,
humidity, wind, rainfall, and other meteorological variables in
a given region. These patterns, averaged over a period of 30
years or more, define a region's climate.

The Earth's climate has changed throughout history. In the last
650,000 years there have been seven cycles of glacial advance
and retreat. Most of these climate changes are attributed to
very small variations in Earth's orbit that change the amount
of solar energy our planet receives.

Current warming trends are significant because they are
proceeding at a rate that is unprecedented over millennia and
are unequivocally the result of human activities.</code></pre>

<h3>WET File Naming Convention</h3>
<pre><code>OI-{CRAWL_ID}-{FILE_NUMBER}.warc.wet.gz

Examples:
  OI-2026-02-00000.warc.wet.gz
  OI-2026-02-00001.warc.wet.gz</code></pre>

<hr>

<h2>Parquet Format (Columnar Index)</h2>
<p>Apache Parquet files provide a columnar index of all crawled URLs with associated metadata. The columnar format enables highly efficient analytical queries -- you only read the columns you need, and compression is applied per-column for optimal storage.</p>

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
      <td>Full URL of the crawled page</td>
    </tr>
    <tr>
      <td><code>domain</code></td>
      <td>STRING</td>
      <td>Registered domain (e.g., example.com)</td>
    </tr>
    <tr>
      <td><code>host</code></td>
      <td>STRING</td>
      <td>Full hostname (e.g., www.example.com)</td>
    </tr>
    <tr>
      <td><code>tld</code></td>
      <td>STRING</td>
      <td>Top-level domain (e.g., com, org, de)</td>
    </tr>
    <tr>
      <td><code>title</code></td>
      <td>STRING</td>
      <td>Page title from HTML &lt;title&gt; tag</td>
    </tr>
    <tr>
      <td><code>language</code></td>
      <td>STRING</td>
      <td>Detected language (ISO 639-1 code)</td>
    </tr>
    <tr>
      <td><code>content_type</code></td>
      <td>STRING</td>
      <td>HTTP Content-Type header value</td>
    </tr>
    <tr>
      <td><code>content_length</code></td>
      <td>INT64</td>
      <td>Response body size in bytes</td>
    </tr>
    <tr>
      <td><code>status_code</code></td>
      <td>INT32</td>
      <td>HTTP response status code</td>
    </tr>
    <tr>
      <td><code>timestamp</code></td>
      <td>TIMESTAMP</td>
      <td>Crawl timestamp (UTC)</td>
    </tr>
    <tr>
      <td><code>warc_file</code></td>
      <td>STRING</td>
      <td>WARC filename containing this record</td>
    </tr>
    <tr>
      <td><code>warc_offset</code></td>
      <td>INT64</td>
      <td>Byte offset within the WARC file</td>
    </tr>
    <tr>
      <td><code>warc_length</code></td>
      <td>INT64</td>
      <td>Length of the WARC record in bytes</td>
    </tr>
    <tr>
      <td><code>digest</code></td>
      <td>STRING</td>
      <td>SHA-256 hash of the response body</td>
    </tr>
    <tr>
      <td><code>charset</code></td>
      <td>STRING</td>
      <td>Character encoding (e.g., utf-8)</td>
    </tr>
  </tbody>
</table>

<h3>Example Queries</h3>
<pre><code># Count pages by language
SELECT language, COUNT(*) as pages
FROM read_parquet('s3://openindex/crawl/OI-2026-02/index/parquet/*.parquet')
GROUP BY language
ORDER BY pages DESC
LIMIT 20;

# Find large HTML pages on a specific domain
SELECT url, title, content_length
FROM read_parquet('s3://openindex/crawl/OI-2026-02/index/parquet/*.parquet')
WHERE domain = 'wikipedia.org'
  AND content_type LIKE 'text/html%'
  AND content_length > 100000
ORDER BY content_length DESC
LIMIT 50;</code></pre>

<h3>Parquet File Naming Convention</h3>
<pre><code>OI-{CRAWL_ID}-index-{PARTITION}.parquet

Examples:
  OI-2026-02-index-00000.parquet
  OI-2026-02-index-00001.parquet</code></pre>

<div class="note">
  Parquet files are partitioned by URL hash for balanced distribution. Each file contains approximately 5 million rows.
</div>

<hr>

<h2>Vector Format (Embeddings)</h2>
<p>Vector files contain dense embeddings generated for each crawled page. These 1024-dimensional float32 vectors encode the semantic meaning of page content and enable similarity search.</p>

<h3>Storage Format</h3>
<p>Embeddings are stored in a custom binary format optimized for bulk loading into vector databases:</p>

<pre><code>File header (32 bytes):
  magic:      "OIVEC001"         (8 bytes)
  version:    uint32             (4 bytes)
  dimensions: uint32             (4 bytes, always 1024)
  count:      uint64             (8 bytes, number of vectors)
  model:      uint64             (8 bytes, model identifier)

Per-vector record:
  url_hash:   [32]byte           (SHA-256 of the URL)
  vector:     [1024]float32      (4096 bytes, L2-normalized)

Total per record: 4128 bytes</code></pre>

<h3>Model Details</h3>
<table>
  <thead>
    <tr>
      <th>Property</th>
      <th>Value</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Model</td>
      <td><code>multilingual-e5-large</code></td>
    </tr>
    <tr>
      <td>Dimensions</td>
      <td>1024</td>
    </tr>
    <tr>
      <td>Input</td>
      <td>Title + first 512 tokens of body text</td>
    </tr>
    <tr>
      <td>Normalization</td>
      <td>L2-normalized (unit vectors)</td>
    </tr>
    <tr>
      <td>Similarity Metric</td>
      <td>Cosine similarity (via dot product)</td>
    </tr>
    <tr>
      <td>Languages</td>
      <td>100+ languages supported</td>
    </tr>
  </tbody>
</table>

<h3>Vector File Naming Convention</h3>
<pre><code>OI-{CRAWL_ID}-vectors-{SHARD}.oivec

Examples:
  OI-2026-02-vectors-0000.oivec
  OI-2026-02-vectors-0001.oivec</code></pre>

<hr>

<h2>Knowledge Graph Export Format (JSON-LD)</h2>
<p>Knowledge graph data is exported in <a href="https://json-ld.org/">JSON-LD</a> (JSON for Linked Data) format, following the OpenIndex ontology. Each record represents an entity or a relationship extracted from crawled web pages.</p>

<h3>Entity Record</h3>
<pre><code>{
  "@context": "https://schema.openindex.org/v1",
  "@type": "Entity",
  "@id": "oi:entity:q42",
  "name": "Douglas Adams",
  "entityType": "Person",
  "description": "English author and humourist",
  "properties": {
    "birthDate": "1952-03-11",
    "deathDate": "2001-05-11",
    "nationality": "British",
    "occupation": ["Author", "Screenwriter", "Humorist"]
  },
  "sources": [
    {
      "url": "https://en.wikipedia.org/wiki/Douglas_Adams",
      "crawl": "OI-2026-02",
      "confidence": 0.97
    }
  ],
  "relationships": [
    {
      "@type": "Relationship",
      "predicate": "authorOf",
      "object": "oi:entity:hitchhikers-guide",
      "confidence": 0.99
    },
    {
      "@type": "Relationship",
      "predicate": "bornIn",
      "object": "oi:entity:cambridge",
      "confidence": 0.95
    }
  ]
}</code></pre>

<h3>Relationship Record</h3>
<pre><code>{
  "@context": "https://schema.openindex.org/v1",
  "@type": "Relationship",
  "@id": "oi:rel:r-8472931",
  "subject": "oi:entity:q42",
  "predicate": "authorOf",
  "object": "oi:entity:hitchhikers-guide",
  "confidence": 0.99,
  "sources": [
    {
      "url": "https://en.wikipedia.org/wiki/The_Hitchhiker%27s_Guide_to_the_Galaxy",
      "crawl": "OI-2026-02"
    }
  ]
}</code></pre>

<h3>Knowledge Graph File Naming Convention</h3>
<pre><code>OI-{CRAWL_ID}-graph-entities-{PARTITION}.jsonld.gz
OI-{CRAWL_ID}-graph-relations-{PARTITION}.jsonld.gz

Examples:
  OI-2026-02-graph-entities-0000.jsonld.gz
  OI-2026-02-graph-relations-0000.jsonld.gz</code></pre>

<hr>

<h2>Compression</h2>
<p>All OpenIndex data files are gzip-compressed. This applies to WARC, WAT, WET, and JSON-LD files. Parquet files use internal Snappy or Zstd compression. Vector files use LZ4 block compression.</p>

<table>
  <thead>
    <tr>
      <th>Format</th>
      <th>External Compression</th>
      <th>Typical Ratio</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>WARC</td>
      <td>gzip</td>
      <td>~5:1</td>
    </tr>
    <tr>
      <td>WAT</td>
      <td>gzip</td>
      <td>~8:1</td>
    </tr>
    <tr>
      <td>WET</td>
      <td>gzip</td>
      <td>~6:1</td>
    </tr>
    <tr>
      <td>Parquet</td>
      <td>None (internal Snappy/Zstd)</td>
      <td>~10:1</td>
    </tr>
    <tr>
      <td>Vector</td>
      <td>LZ4 block</td>
      <td>~1.5:1</td>
    </tr>
    <tr>
      <td>JSON-LD</td>
      <td>gzip</td>
      <td>~12:1</td>
    </tr>
  </tbody>
</table>

<div class="note">
  Tools like <code>zcat</code>, <code>zgrep</code>, and <code>gunzip</code> can process gzip-compressed files directly. For Parquet files, use DuckDB, Spark, or Pandas which handle internal compression transparently.
</div>
`
