export const architecturePage = `
<h2>System Architecture</h2>
<p>OpenIndex is a distributed web intelligence platform composed of six major layers. Each layer is independently scalable, open source, and designed for high throughput and fault tolerance.</p>

<h3>High-Level Architecture</h3>
<pre><code>                        +---------------------------+
                        |        API Layer           |
                        |  REST + GraphQL + gRPC     |
                        +-------------+-------------+
                                      |
                  +-------------------+-------------------+
                  |                   |                   |
          +-------+-------+  +-------+-------+  +-------+-------+
          |  Query Layer  |  |  Query Layer  |  |  Query Layer  |
          |  (Full-text)  |  |   (Vector)    |  |   (Graph)     |
          +-------+-------+  +-------+-------+  +-------+-------+
                  |                   |                   |
          +-------+-------+  +-------+-------+  +-------+-------+
          |  Index Layer  |  |  Index Layer  |  |  Index Layer  |
          |  Tantivy CDX  |  |    Vald       |  |   Neo4j       |
          +-------+-------+  +-------+-------+  +-------+-------+
                  |                   |                   |
                  +-------------------+-------------------+
                                      |
                        +-------------+-------------+
                        |      Storage Layer         |
                        |  S3 + DuckDB + Parquet     |
                        +-------------+-------------+
                                      |
                        +-------------+-------------+
                        |    Ingestion Pipeline      |
                        |  Extract / Transform / Load|
                        +-------------+-------------+
                                      |
                        +-------------+-------------+
                        |   Distributed Crawler      |
                        |   OpenIndexBot (Go)        |
                        +---------------------------+</code></pre>

<h2>Pipeline Overview</h2>
<p>Data flows through six layers from crawl to query. Each stage is decoupled via message queues and object storage, allowing independent scaling.</p>

<div class="card-grid">
  <div class="card">
    <h3>1. Distributed Crawler</h3>
    <p>Written in Go, the crawler coordinates thousands of workers across multiple regions. It respects robots.txt, adapts rate limits per domain, and stores raw HTTP responses as WARC files.</p>
  </div>
  <div class="card">
    <h3>2. Ingestion Pipeline</h3>
    <p>Raw WARC files are processed through an ETL pipeline: HTML parsing, text extraction, metadata extraction, language detection, entity recognition, and embedding generation.</p>
  </div>
  <div class="card">
    <h3>3. Storage Layer</h3>
    <p>All data is stored on S3-compatible object storage. WARC files for raw data, Parquet files for structured metadata, and DuckDB databases for analytics queries.</p>
  </div>
  <div class="card">
    <h3>4. Index Layer</h3>
    <p>Four index types are built: CDX for URL lookup, Parquet columnar index for analytics, Tantivy full-text index for keyword search, and Vald vector index for semantic search.</p>
  </div>
  <div class="card">
    <h3>5. Query Layer</h3>
    <p>Query engines route requests to the appropriate index. Supports full-text queries, vector similarity search, graph traversals, and SQL analytics over Parquet files.</p>
  </div>
  <div class="card">
    <h3>6. API Layer</h3>
    <p>REST, GraphQL, and gRPC endpoints expose all query capabilities. Includes authentication, rate limiting, caching, and usage tracking.</p>
  </div>
</div>

<h2>Technology Stack</h2>
<table>
  <thead>
    <tr>
      <th>Component</th>
      <th>Technology</th>
      <th>Purpose</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Crawler</strong></td>
      <td>Go</td>
      <td>High-throughput distributed web crawling</td>
    </tr>
    <tr>
      <td><strong>Ingestion</strong></td>
      <td>Go + Python</td>
      <td>ETL pipeline, NER, embedding generation</td>
    </tr>
    <tr>
      <td><strong>Object Storage</strong></td>
      <td>S3-compatible (MinIO / R2)</td>
      <td>WARC files, Parquet files, index segments</td>
    </tr>
    <tr>
      <td><strong>Analytics DB</strong></td>
      <td>DuckDB</td>
      <td>SQL queries over Parquet, columnar analytics</td>
    </tr>
    <tr>
      <td><strong>Columnar Index</strong></td>
      <td>Apache Parquet</td>
      <td>Columnar storage for high-throughput analytics</td>
    </tr>
    <tr>
      <td><strong>Full-text Index</strong></td>
      <td>Tantivy</td>
      <td>Inverted index for keyword search (Rust)</td>
    </tr>
    <tr>
      <td><strong>Vector Database</strong></td>
      <td>Vald</td>
      <td>Distributed ANN for semantic search</td>
    </tr>
    <tr>
      <td><strong>Knowledge Graph</strong></td>
      <td>Neo4j</td>
      <td>Entity and relationship storage, graph traversal</td>
    </tr>
    <tr>
      <td><strong>Message Queue</strong></td>
      <td>NATS JetStream</td>
      <td>Inter-service communication, work distribution</td>
    </tr>
    <tr>
      <td><strong>Orchestration</strong></td>
      <td>Kubernetes</td>
      <td>Container orchestration, auto-scaling</td>
    </tr>
    <tr>
      <td><strong>API Gateway</strong></td>
      <td>Go (Mizu framework)</td>
      <td>REST/GraphQL/gRPC with auth and rate limiting</td>
    </tr>
    <tr>
      <td><strong>Monitoring</strong></td>
      <td>Prometheus + Grafana</td>
      <td>Metrics, alerting, dashboards</td>
    </tr>
  </tbody>
</table>

<h2>Data Flow</h2>
<p>The following diagram shows the complete data flow from a URL being discovered to it becoming searchable across all index types.</p>

<pre><code>URL Discovery (seed lists, sitemaps, link extraction)
       |
       v
+------------------+     WARC files      +-------------------+
|   Crawler Nodes  | ------------------> |   Object Storage  |
|   (Go workers)   |                     |   (S3 / R2)       |
+------------------+                     +---------+---------+
                                                   |
                                    +--------------+--------------+
                                    |                             |
                              +-----v------+              +------v------+
                              |  HTML Parse |              | WAT Extract |
                              |  + Extract  |              | (metadata)  |
                              +-----+------+              +------+------+
                                    |                             |
                         +----------+----------+                  |
                         |          |          |                  |
                   +-----v--+ +----v---+ +----v----+    +--------v--------+
                   |  Text  | | Entity | | Embed   |    | Parquet Writer  |
                   | (WET)  | |  (NER) | | (dense) |    | (columnar idx)  |
                   +---+----+ +---+----+ +----+----+    +--------+--------+
                       |          |           |                   |
                 +-----v--+  +---v----+  +---v----+    +---------v--------+
                 | Tantivy|  | Neo4j  |  |  Vald  |    | DuckDB / Parquet |
                 | Index  |  | Graph  |  | Vector |    | Columnar Index   |
                 +--------+  +--------+  +--------+    +------------------+
                       \          |           /                  |
                        \         |          /                   |
                         +--------v---------+-------------------+
                         |            Query Layer                |
                         +------------------+--------------------+
                                            |
                                   +--------v--------+
                                   |    API Layer     |
                                   +-----------------+</code></pre>

<h3>Example: From Crawl to Index</h3>
<p>Here is a simplified example showing a page being crawled, processed, and made available across all index types.</p>

<h4>Step 1: Crawl</h4>
<p>The crawler fetches the page and writes a WARC record:</p>
<pre><code>WARC/1.0
WARC-Type: response
WARC-Date: 2026-02-15T08:30:00Z
WARC-Target-URI: https://example.com/article/ai-research
WARC-Record-ID: &lt;urn:uuid:a1b2c3d4-e5f6-7890-abcd-ef1234567890&gt;
Content-Type: application/http;msgtype=response
Content-Length: 45230

HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
...</code></pre>

<h4>Step 2: CDX Index Entry</h4>
<p>A CDX record is written for URL-level lookup:</p>
<pre><code>com,example)/article/ai-research 20260215083000 {"url":"https://example.com/article/ai-research","mime":"text/html","status":"200","digest":"sha1:ABC123...","length":"45230","offset":"892034","filename":"OI-2026-02/segments/1708000000000.00/warc/00042.warc.gz"}</code></pre>

<h4>Step 3: Parquet Row</h4>
<p>Structured metadata is written to Parquet:</p>
<pre><code>SELECT url, fetch_time, content_languages, title, warc_filename
FROM read_parquet('s3://openindex/OI-2026-02/parquet/segment-00042.parquet')
WHERE url = 'https://example.com/article/ai-research';

-- Result:
-- url: https://example.com/article/ai-research
-- fetch_time: 2026-02-15T08:30:00Z
-- content_languages: en
-- title: "Advances in AI Research - 2026"
-- warc_filename: segments/1708000000000.00/warc/00042.warc.gz</code></pre>

<h4>Step 4: Full-text Index</h4>
<p>The extracted text is indexed in Tantivy for keyword search:</p>
<pre><code>curl "https://api.openindex.org/v1/search?q=advances+AI+research+2026&crawl=OI-2026-02"

{
  "results": [
    {
      "url": "https://example.com/article/ai-research",
      "title": "Advances in AI Research - 2026",
      "snippet": "Recent &lt;em&gt;advances&lt;/em&gt; in &lt;em&gt;AI research&lt;/em&gt; have...",
      "score": 0.892
    }
  ]
}</code></pre>

<h4>Step 5: Vector Embedding</h4>
<p>Dense embeddings are generated and stored in Vald for semantic search:</p>
<pre><code>curl -X POST "https://api.openindex.org/v1/vector/search" \\
  -H "Content-Type: application/json" \\
  -d '{"query": "latest breakthroughs in machine learning", "k": 10}'

{
  "results": [
    {
      "url": "https://example.com/article/ai-research",
      "similarity": 0.943,
      "title": "Advances in AI Research - 2026"
    }
  ]
}</code></pre>

<h2>Deployment Model</h2>
<p>OpenIndex runs on Kubernetes with the following deployment topology:</p>

<div class="card-grid">
  <div class="card">
    <h3>Crawler Fleet</h3>
    <p>Horizontally scaled crawler pods distributed across multiple cloud regions. Each pod runs hundreds of concurrent Go workers. Regional distribution ensures geographic diversity and reduces latency to target hosts.</p>
  </div>
  <div class="card">
    <h3>Ingestion Workers</h3>
    <p>Stateless worker pods consume WARC files from the object store, process them through the ETL pipeline, and write outputs to the appropriate storage backends. Auto-scaled based on queue depth.</p>
  </div>
  <div class="card">
    <h3>Index Cluster</h3>
    <p>Each index type runs as a separate stateful service. Tantivy nodes serve full-text search, Vald cluster handles vector queries, and Neo4j serves graph traversals. Each scales independently.</p>
  </div>
  <div class="card">
    <h3>API Gateway</h3>
    <p>Stateless API pods behind a global load balancer. Routes queries to the appropriate index cluster, handles authentication, enforces rate limits, and caches frequent queries.</p>
  </div>
</div>

<h3>Kubernetes Resource Overview</h3>
<table>
  <thead>
    <tr>
      <th>Service</th>
      <th>Replicas</th>
      <th>CPU / Pod</th>
      <th>Memory / Pod</th>
      <th>Storage</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Crawler</td>
      <td>50-200</td>
      <td>4 vCPU</td>
      <td>8 GiB</td>
      <td>Ephemeral</td>
    </tr>
    <tr>
      <td>Ingestion Worker</td>
      <td>20-100</td>
      <td>8 vCPU</td>
      <td>32 GiB</td>
      <td>Ephemeral</td>
    </tr>
    <tr>
      <td>Tantivy Index</td>
      <td>10-30</td>
      <td>8 vCPU</td>
      <td>64 GiB</td>
      <td>2 TiB NVMe</td>
    </tr>
    <tr>
      <td>Vald Agent</td>
      <td>20-60</td>
      <td>4 vCPU</td>
      <td>32 GiB</td>
      <td>500 GiB SSD</td>
    </tr>
    <tr>
      <td>Neo4j</td>
      <td>3-9</td>
      <td>16 vCPU</td>
      <td>128 GiB</td>
      <td>4 TiB NVMe</td>
    </tr>
    <tr>
      <td>API Gateway</td>
      <td>10-50</td>
      <td>2 vCPU</td>
      <td>4 GiB</td>
      <td>Ephemeral</td>
    </tr>
    <tr>
      <td>NATS JetStream</td>
      <td>3</td>
      <td>4 vCPU</td>
      <td>16 GiB</td>
      <td>500 GiB SSD</td>
    </tr>
  </tbody>
</table>

<h2>Storage Architecture</h2>
<p>OpenIndex uses a tiered storage architecture optimized for different access patterns.</p>

<h3>Object Storage (S3-compatible)</h3>
<p>All raw and derived data lives on S3-compatible object storage (MinIO self-hosted or Cloudflare R2 for CDN-served data). The bucket layout follows a consistent convention:</p>

<pre><code>s3://openindex/
  OI-2026-02/                          # Crawl identifier
    segments/
      1708000000000.00/
        warc/
          00000.warc.gz                # Raw HTTP responses
          00001.warc.gz
          ...
        wat/
          00000.warc.wat.gz            # Metadata extracts
        wet/
          00000.warc.wet.gz            # Text extracts
    parquet/
      segment-00000.parquet            # Columnar index
      segment-00001.parquet
    cdx/
      cdx-00000.gz                     # CDX index shards
    vectors/
      shard-0000.vald                  # Vector index segments
    graph/
      entities.jsonl.gz                # Knowledge graph export
      relationships.jsonl.gz
    stats.json                         # Crawl statistics</code></pre>

<h3>DuckDB for Analytics</h3>
<p>DuckDB is used as the analytics engine. It reads Parquet files directly from object storage, enabling SQL queries without data movement:</p>

<pre><code>-- Query the columnar index directly from S3
SELECT
    url_host_tld,
    count(*) as page_count,
    avg(content_length) as avg_size
FROM read_parquet('s3://openindex/OI-2026-02/parquet/*.parquet')
GROUP BY url_host_tld
ORDER BY page_count DESC
LIMIT 20;</code></pre>

<div class="note">
  <strong>Cloud-native by design:</strong> Every component is containerized, stateless where possible, and designed for horizontal scaling. The storage layer is decoupled from compute, allowing independent scaling of crawl throughput, ingestion capacity, and query performance.
</div>

<h3>Data Retention</h3>
<table>
  <thead>
    <tr>
      <th>Data Type</th>
      <th>Retention</th>
      <th>Storage Tier</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>WARC files (latest 6 crawls)</td>
      <td>Indefinite</td>
      <td>Standard (hot)</td>
    </tr>
    <tr>
      <td>WARC files (older)</td>
      <td>Indefinite</td>
      <td>Infrequent access (warm)</td>
    </tr>
    <tr>
      <td>Parquet index</td>
      <td>Indefinite</td>
      <td>Standard (hot)</td>
    </tr>
    <tr>
      <td>Full-text index</td>
      <td>Latest 3 crawls</td>
      <td>NVMe (hot)</td>
    </tr>
    <tr>
      <td>Vector index</td>
      <td>Latest 3 crawls</td>
      <td>SSD (hot)</td>
    </tr>
    <tr>
      <td>Knowledge graph</td>
      <td>Cumulative (merged)</td>
      <td>NVMe (hot)</td>
    </tr>
  </tbody>
</table>
`
