export const latestBuildPage = `
<h2>Current Build: OI-2026-02</h2>
<p>The February 2026 crawl is now complete and available for download and API access.</p>

<div class="card-grid">
  <div class="card" style="text-align:center">
    <h3 style="margin:0;font-size:2rem;color:#2563eb">2.8B</h3>
    <p>Pages Crawled</p>
  </div>
  <div class="card" style="text-align:center">
    <h3 style="margin:0;font-size:2rem;color:#2563eb">420 TiB</h3>
    <p>Raw Data</p>
  </div>
  <div class="card" style="text-align:center">
    <h3 style="margin:0;font-size:2rem;color:#2563eb">180+</h3>
    <p>Languages</p>
  </div>
  <div class="card" style="text-align:center">
    <h3 style="margin:0;font-size:2rem;color:#2563eb">890M</h3>
    <p>Unique Entities</p>
  </div>
</div>

<h3>Crawl Details</h3>
<table>
  <thead>
    <tr>
      <th>Property</th>
      <th>Value</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Crawl ID</strong></td>
      <td><code>OI-2026-02</code></td>
    </tr>
    <tr>
      <td><strong>Crawl period</strong></td>
      <td>February 1 -- February 22, 2026</td>
    </tr>
    <tr>
      <td><strong>Pages crawled</strong></td>
      <td>2,814,392,047</td>
    </tr>
    <tr>
      <td><strong>Unique domains</strong></td>
      <td>42,183,291</td>
    </tr>
    <tr>
      <td><strong>Unique hosts</strong></td>
      <td>185,420,813</td>
    </tr>
    <tr>
      <td><strong>Languages detected</strong></td>
      <td>183</td>
    </tr>
    <tr>
      <td><strong>Total raw size</strong></td>
      <td>420.3 TiB (compressed)</td>
    </tr>
    <tr>
      <td><strong>WARC files</strong></td>
      <td>72,000</td>
    </tr>
    <tr>
      <td><strong>Segments</strong></td>
      <td>900</td>
    </tr>
  </tbody>
</table>

<h2>File Listings</h2>

<details>
  <summary>WARC Files (raw HTTP responses)</summary>
  <div class="details-body">
    <p>WARC (Web ARChive) files contain the complete HTTP request and response for every crawled page. Each file is approximately 1 GB compressed (gzip).</p>
    <table>
      <thead>
        <tr>
          <th>Property</th>
          <th>Value</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>File count</td>
          <td>72,000</td>
        </tr>
        <tr>
          <td>File size (each)</td>
          <td>~1 GB compressed</td>
        </tr>
        <tr>
          <td>Total size</td>
          <td>~72 TiB</td>
        </tr>
        <tr>
          <td>Format</td>
          <td>WARC/1.1 (gzip)</td>
        </tr>
        <tr>
          <td>Path pattern</td>
          <td><code>OI-2026-02/segments/{segment}/warc/{file}.warc.gz</code></td>
        </tr>
      </tbody>
    </table>
    <pre><code># List WARC files
aws s3 ls s3://openindex-data/OI-2026-02/segments/1738368000000.00/warc/

# Download a single WARC file
wget https://data.openindex.org/OI-2026-02/segments/1738368000000.00/warc/00000.warc.gz</code></pre>
  </div>
</details>

<details>
  <summary>WAT Files (metadata extracts)</summary>
  <div class="details-body">
    <p>WAT files contain structured metadata extracted from each HTTP response, including headers, HTML metadata, link lists, and detected properties. Stored in WARC envelope format with JSON payloads.</p>
    <table>
      <thead>
        <tr>
          <th>Property</th>
          <th>Value</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>File count</td>
          <td>72,000</td>
        </tr>
        <tr>
          <td>Total size</td>
          <td>~28 TiB</td>
        </tr>
        <tr>
          <td>Format</td>
          <td>WARC envelope with JSON metadata (gzip)</td>
        </tr>
        <tr>
          <td>Path pattern</td>
          <td><code>OI-2026-02/segments/{segment}/wat/{file}.warc.wat.gz</code></td>
        </tr>
      </tbody>
    </table>
  </div>
</details>

<details>
  <summary>WET Files (text extracts)</summary>
  <div class="details-body">
    <p>WET files contain clean extracted plaintext from each crawled page. HTML tags, scripts, styles, and boilerplate content are removed. Useful for NLP, text mining, and language model training.</p>
    <table>
      <thead>
        <tr>
          <th>Property</th>
          <th>Value</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>File count</td>
          <td>72,000</td>
        </tr>
        <tr>
          <td>Total size</td>
          <td>~18 TiB</td>
        </tr>
        <tr>
          <td>Format</td>
          <td>WARC envelope with plaintext (gzip)</td>
        </tr>
        <tr>
          <td>Path pattern</td>
          <td><code>OI-2026-02/segments/{segment}/wet/{file}.warc.wet.gz</code></td>
        </tr>
      </tbody>
    </table>
  </div>
</details>

<h2>Index Files</h2>

<details>
  <summary>CDX Index</summary>
  <div class="details-body">
    <p>CDXJ-format index for URL-level lookups. Sorted by SURT key for efficient binary search and prefix queries.</p>
    <table>
      <thead>
        <tr>
          <th>Property</th>
          <th>Value</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>File count</td>
          <td>300 shards</td>
        </tr>
        <tr>
          <td>Total size</td>
          <td>~45 GB (compressed)</td>
        </tr>
        <tr>
          <td>Format</td>
          <td>CDXJ (gzip)</td>
        </tr>
        <tr>
          <td>Path pattern</td>
          <td><code>OI-2026-02/cdx/cdx-{shard}.gz</code></td>
        </tr>
      </tbody>
    </table>
    <pre><code># Download CDX shard
wget https://data.openindex.org/OI-2026-02/cdx/cdx-00000.gz

# Query via API (recommended)
curl "https://api.openindex.org/v1/cdx?url=https://example.com/&crawl=OI-2026-02"</code></pre>
  </div>
</details>

<details>
  <summary>Columnar Index (Parquet)</summary>
  <div class="details-body">
    <p>Apache Parquet files containing structured metadata for every crawled page. Queryable with DuckDB, Spark, Polars, or any Parquet-compatible tool.</p>
    <table>
      <thead>
        <tr>
          <th>Property</th>
          <th>Value</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>File count</td>
          <td>560 files</td>
        </tr>
        <tr>
          <td>File size (each)</td>
          <td>~500 MB</td>
        </tr>
        <tr>
          <td>Total size</td>
          <td>~280 GB</td>
        </tr>
        <tr>
          <td>Compression</td>
          <td>Snappy</td>
        </tr>
        <tr>
          <td>Path pattern</td>
          <td><code>OI-2026-02/parquet/segment-{id}.parquet</code></td>
        </tr>
      </tbody>
    </table>
    <pre><code># Query directly from S3 with DuckDB
duckdb -c "
  SELECT url_host_tld, count(*) as pages
  FROM read_parquet('s3://openindex-data/OI-2026-02/parquet/*.parquet')
  GROUP BY url_host_tld
  ORDER BY pages DESC
  LIMIT 10;
"

# Download individual files
wget https://data.openindex.org/OI-2026-02/parquet/segment-00000.parquet</code></pre>
  </div>
</details>

<details>
  <summary>Vector Index</summary>
  <div class="details-body">
    <p>Pre-computed dense embeddings (1024-dim, float32) for every crawled page. Available as downloadable shards or via the vector search API.</p>
    <table>
      <thead>
        <tr>
          <th>Property</th>
          <th>Value</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Vectors</td>
          <td>2,814,392,047</td>
        </tr>
        <tr>
          <td>Dimensions</td>
          <td>1024</td>
        </tr>
        <tr>
          <td>Total size</td>
          <td>~12 TiB</td>
        </tr>
        <tr>
          <td>Format</td>
          <td>Vald index shards</td>
        </tr>
        <tr>
          <td>Access</td>
          <td>API only (too large for download)</td>
        </tr>
      </tbody>
    </table>
    <pre><code># Query via API
curl -X POST "https://api.openindex.org/v1/vector/search" \\
  -H "Content-Type: application/json" \\
  -d '{"query": "climate change mitigation strategies", "k": 10, "crawl": "OI-2026-02"}'</code></pre>
  </div>
</details>

<h2>Knowledge Graph Exports</h2>

<details>
  <summary>Entity Graph</summary>
  <div class="details-body">
    <p>All extracted entities with properties, relationships, and provenance links.</p>
    <table>
      <thead>
        <tr>
          <th>File</th>
          <th>Format</th>
          <th>Size</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><code>entities.jsonld.gz</code></td>
          <td>JSON-LD</td>
          <td>82 GB</td>
        </tr>
        <tr>
          <td><code>relationships.nt.gz</code></td>
          <td>N-Triples</td>
          <td>120 GB</td>
        </tr>
        <tr>
          <td><code>entities.jsonl.gz</code></td>
          <td>JSONL</td>
          <td>68 GB</td>
        </tr>
      </tbody>
    </table>
    <pre><code>wget https://data.openindex.org/OI-2026-02/graph/entities.jsonld.gz
wget https://data.openindex.org/OI-2026-02/graph/relationships.nt.gz</code></pre>
  </div>
</details>

<details>
  <summary>Web Graph</summary>
  <div class="details-body">
    <p>Host-level and domain-level hyperlink graphs.</p>
    <table>
      <thead>
        <tr>
          <th>File</th>
          <th>Granularity</th>
          <th>Nodes</th>
          <th>Edges</th>
          <th>Size</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><code>webgraph-host.tsv.gz</code></td>
          <td>Host-level</td>
          <td>185M</td>
          <td>12.4B</td>
          <td>48 GB</td>
        </tr>
        <tr>
          <td><code>webgraph-domain.tsv.gz</code></td>
          <td>Domain-level</td>
          <td>42M</td>
          <td>2.1B</td>
          <td>8.5 GB</td>
        </tr>
      </tbody>
    </table>
    <pre><code>wget https://data.openindex.org/OI-2026-02/graph/webgraph-host.tsv.gz
wget https://data.openindex.org/OI-2026-02/graph/webgraph-domain.tsv.gz</code></pre>
  </div>
</details>

<h2>Download Paths</h2>
<p>Data is available via both S3-compatible storage and HTTP download:</p>

<h3>S3 Access</h3>
<pre><code># Requires AWS CLI or compatible S3 client
# No authentication required (public bucket)

# List all files in the latest crawl
aws s3 ls s3://openindex-data/OI-2026-02/ --no-sign-request

# Download a specific WARC file
aws s3 cp s3://openindex-data/OI-2026-02/segments/1738368000000.00/warc/00000.warc.gz . --no-sign-request

# Sync an entire segment
aws s3 sync s3://openindex-data/OI-2026-02/segments/1738368000000.00/ ./segment-00/ --no-sign-request</code></pre>

<h3>HTTP Download</h3>
<pre><code># Direct download via CDN
wget https://data.openindex.org/OI-2026-02/segments/1738368000000.00/warc/00000.warc.gz

# Download Parquet index
wget https://data.openindex.org/OI-2026-02/parquet/segment-00000.parquet

# Download file listings
wget https://data.openindex.org/OI-2026-02/warc.paths.gz
wget https://data.openindex.org/OI-2026-02/wat.paths.gz
wget https://data.openindex.org/OI-2026-02/wet.paths.gz</code></pre>

<h3>CLI Tool</h3>
<pre><code># Install the OpenIndex CLI
go install github.com/nicholasgasior/gopher-crawl/cmd/openindex@latest

# List available crawls
openindex crawls

# Download Parquet index for latest crawl
openindex download --type parquet --crawl OI-2026-02

# Query via CLI
openindex search "climate change" --crawl OI-2026-02 --limit 20</code></pre>

<h3>API Access</h3>
<pre><code># CDX lookup
curl "https://api.openindex.org/v1/cdx?url=https://example.com/&crawl=OI-2026-02"

# Full-text search
curl "https://api.openindex.org/v1/search?q=machine+learning&crawl=OI-2026-02&limit=10"

# Vector search
curl -X POST "https://api.openindex.org/v1/vector/search" \\
  -H "Content-Type: application/json" \\
  -d '{"query": "advances in robotics", "crawl": "OI-2026-02", "k": 10}'</code></pre>

<h2>Previous Builds</h2>
<table>
  <thead>
    <tr>
      <th>Crawl ID</th>
      <th>Date</th>
      <th>Pages</th>
      <th>Size</th>
      <th>Domains</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>OI-2026-02</strong></td>
      <td>February 2026</td>
      <td>2.8B</td>
      <td>420 TiB</td>
      <td>42.2M</td>
      <td><span class="status-badge status-operational">Current</span></td>
    </tr>
    <tr>
      <td><strong>OI-2026-01</strong></td>
      <td>January 2026</td>
      <td>2.6B</td>
      <td>398 TiB</td>
      <td>40.8M</td>
      <td>Available</td>
    </tr>
    <tr>
      <td><strong>OI-2025-12</strong></td>
      <td>December 2025</td>
      <td>2.5B</td>
      <td>385 TiB</td>
      <td>39.5M</td>
      <td>Available</td>
    </tr>
    <tr>
      <td><strong>OI-2025-11</strong></td>
      <td>November 2025</td>
      <td>2.4B</td>
      <td>372 TiB</td>
      <td>38.1M</td>
      <td>Available</td>
    </tr>
    <tr>
      <td><strong>OI-2025-10</strong></td>
      <td>October 2025</td>
      <td>2.3B</td>
      <td>358 TiB</td>
      <td>37.0M</td>
      <td>Available</td>
    </tr>
    <tr>
      <td><strong>OI-2025-09</strong></td>
      <td>September 2025</td>
      <td>2.2B</td>
      <td>342 TiB</td>
      <td>35.8M</td>
      <td>Available</td>
    </tr>
    <tr>
      <td><strong>OI-2025-08</strong></td>
      <td>August 2025</td>
      <td>2.1B</td>
      <td>328 TiB</td>
      <td>34.5M</td>
      <td>Available</td>
    </tr>
    <tr>
      <td><strong>OI-2025-07</strong></td>
      <td>July 2025</td>
      <td>2.0B</td>
      <td>315 TiB</td>
      <td>33.2M</td>
      <td>Available</td>
    </tr>
    <tr>
      <td><strong>OI-2025-06</strong></td>
      <td>June 2025</td>
      <td>1.9B</td>
      <td>298 TiB</td>
      <td>32.0M</td>
      <td>Available</td>
    </tr>
    <tr>
      <td><strong>OI-2025-05</strong></td>
      <td>May 2025</td>
      <td>1.8B</td>
      <td>282 TiB</td>
      <td>30.7M</td>
      <td>Available</td>
    </tr>
    <tr>
      <td><strong>OI-2025-04</strong></td>
      <td>April 2025</td>
      <td>1.6B</td>
      <td>265 TiB</td>
      <td>29.1M</td>
      <td>Archive</td>
    </tr>
    <tr>
      <td><strong>OI-2025-03</strong></td>
      <td>March 2025</td>
      <td>1.5B</td>
      <td>248 TiB</td>
      <td>27.6M</td>
      <td>Archive</td>
    </tr>
    <tr>
      <td><strong>OI-2025-02</strong></td>
      <td>February 2025</td>
      <td>1.3B</td>
      <td>220 TiB</td>
      <td>25.8M</td>
      <td>Archive</td>
    </tr>
    <tr>
      <td><strong>OI-2025-01</strong></td>
      <td>January 2025</td>
      <td>1.1B</td>
      <td>192 TiB</td>
      <td>23.4M</td>
      <td>Archive</td>
    </tr>
    <tr>
      <td><strong>OI-2024-12</strong></td>
      <td>December 2024</td>
      <td>0.9B</td>
      <td>158 TiB</td>
      <td>20.1M</td>
      <td>Archive</td>
    </tr>
  </tbody>
</table>

<div class="note">
  <strong>Status key:</strong> <strong>Current</strong> = latest production crawl, all indices available. <strong>Available</strong> = WARC + Parquet + CDX downloadable, full-text and vector search available for latest 3 only. <strong>Archive</strong> = WARC + Parquet + CDX downloadable from cold storage (slower access).
</div>

<h2>Content Breakdown (OI-2026-02)</h2>

<h3>Top Languages</h3>
<table>
  <thead>
    <tr>
      <th>Language</th>
      <th>Pages</th>
      <th>Percentage</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>English</td><td>1,240M</td><td>44.1%</td></tr>
    <tr><td>Chinese</td><td>198M</td><td>7.0%</td></tr>
    <tr><td>German</td><td>168M</td><td>6.0%</td></tr>
    <tr><td>Japanese</td><td>152M</td><td>5.4%</td></tr>
    <tr><td>French</td><td>140M</td><td>5.0%</td></tr>
    <tr><td>Spanish</td><td>132M</td><td>4.7%</td></tr>
    <tr><td>Russian</td><td>118M</td><td>4.2%</td></tr>
    <tr><td>Portuguese</td><td>85M</td><td>3.0%</td></tr>
    <tr><td>Italian</td><td>72M</td><td>2.6%</td></tr>
    <tr><td>Other (173 languages)</td><td>509M</td><td>18.1%</td></tr>
  </tbody>
</table>

<h3>Top TLDs</h3>
<table>
  <thead>
    <tr>
      <th>TLD</th>
      <th>Pages</th>
      <th>Domains</th>
    </tr>
  </thead>
  <tbody>
    <tr><td><code>.com</code></td><td>1,180M</td><td>18.4M</td></tr>
    <tr><td><code>.org</code></td><td>185M</td><td>2.1M</td></tr>
    <tr><td><code>.de</code></td><td>142M</td><td>1.8M</td></tr>
    <tr><td><code>.net</code></td><td>98M</td><td>1.2M</td></tr>
    <tr><td><code>.ru</code></td><td>92M</td><td>1.1M</td></tr>
    <tr><td><code>.jp</code></td><td>88M</td><td>0.9M</td></tr>
    <tr><td><code>.fr</code></td><td>82M</td><td>0.8M</td></tr>
    <tr><td><code>.uk</code></td><td>76M</td><td>0.7M</td></tr>
    <tr><td><code>.cn</code></td><td>68M</td><td>0.6M</td></tr>
    <tr><td><code>.io</code></td><td>54M</td><td>0.4M</td></tr>
  </tbody>
</table>
`
