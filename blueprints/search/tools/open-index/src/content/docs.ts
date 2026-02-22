export const docsPage = `
<h2>Documentation</h2>
<p>Everything you need to use, understand, and contribute to OpenIndex. Whether you are making your first API call or deploying your own instance, the docs have you covered.</p>

<div class="card-grid">
  <a href="/get-started" class="card" style="text-decoration:none;color:inherit">
    <div class="card-icon" style="background:#eff6ff;color:#2563eb">&#x1F680;</div>
    <h3>Get Started</h3>
    <p>Quick start guide covering API access, CLI installation, and self-hosting. Make your first query in under a minute.</p>
    <span class="card-link">Read guide &rarr;</span>
  </a>
  <a href="/api" class="card" style="text-decoration:none;color:inherit">
    <div class="card-icon" style="background:#fef3c7;color:#d97706">&#x26A1;</div>
    <h3>API Reference</h3>
    <p>Complete REST API documentation with endpoints, parameters, request/response examples, and error codes.</p>
    <span class="card-link">View reference &rarr;</span>
  </a>
  <a href="/data-formats" class="card" style="text-decoration:none;color:inherit">
    <div class="card-icon" style="background:#dcfce7;color:#16a34a">&#x1F4C4;</div>
    <h3>Data Formats</h3>
    <p>Detailed documentation of WARC, WAT, WET, Parquet, Vector, and Knowledge Graph export formats.</p>
    <span class="card-link">Learn formats &rarr;</span>
  </a>
  <a href="/query-language" class="card" style="text-decoration:none;color:inherit">
    <div class="card-icon" style="background:#ede9fe;color:#7c3aed">&#x1F50E;</div>
    <h3>Query Language (OQL)</h3>
    <p>SQL-like query language for the index. Full-text search, vector similarity, graph traversal, and analytics.</p>
    <span class="card-link">Learn OQL &rarr;</span>
  </a>
  <a href="/architecture" class="card" style="text-decoration:none;color:inherit">
    <div class="card-icon" style="background:#fce7f3;color:#db2777">&#x1F3D7;</div>
    <h3>Architecture</h3>
    <p>System architecture overview: crawler, ingestion pipeline, storage, indexing, query layer, and API.</p>
    <span class="card-link">View architecture &rarr;</span>
  </a>
  <a href="/errata" class="card" style="text-decoration:none;color:inherit">
    <div class="card-icon" style="background:#fef9c3;color:#ca8a04">&#x26A0;</div>
    <h3>Errata</h3>
    <p>Known issues and data quality notes for each crawl. Check here before reporting a bug.</p>
    <span class="card-link">View errata &rarr;</span>
  </a>
</div>

<hr>

<h2>Tutorials</h2>
<p>Step-by-step guides for common tasks and workflows.</p>

<div class="card-grid">
  <div class="card">
    <h3>First Query in 60 Seconds</h3>
    <p>Make your first API call and get search results back. No signup required.</p>
    <span class="card-link"><a href="/get-started">Start tutorial &rarr;</a></span>
  </div>
  <div class="card">
    <h3>Building a Search Application</h3>
    <p>Build a simple web search app using the OpenIndex API, React, and server-side rendering.</p>
    <span class="card-link"><a href="/docs">View tutorial &rarr;</a></span>
  </div>
  <div class="card">
    <h3>Analyzing Web Data with DuckDB</h3>
    <p>Query the Parquet index with DuckDB for analytics: language distribution, domain statistics, and content trends.</p>
    <span class="card-link"><a href="/docs">View tutorial &rarr;</a></span>
  </div>
  <div class="card">
    <h3>Semantic Search with Vector Embeddings</h3>
    <p>Use the vector search API to find content by meaning. Build a RAG pipeline with OpenIndex data.</p>
    <span class="card-link"><a href="/docs">View tutorial &rarr;</a></span>
  </div>
  <div class="card">
    <h3>Knowledge Graph Exploration</h3>
    <p>Traverse the knowledge graph to discover entity relationships. Build a graph visualization from the API.</p>
    <span class="card-link"><a href="/docs">View tutorial &rarr;</a></span>
  </div>
  <div class="card">
    <h3>Downloading and Processing WARC Files</h3>
    <p>Download WARC files from S3, extract content with warcio, and process at scale with Spark.</p>
    <span class="card-link"><a href="/docs">View tutorial &rarr;</a></span>
  </div>
</div>

<hr>

<h2>Platform Components</h2>
<p>Deep dives into each component of the OpenIndex stack.</p>

<table>
  <thead>
    <tr>
      <th>Component</th>
      <th>Description</th>
      <th>Documentation</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Crawler</strong></td>
      <td>Distributed web crawler built in Go</td>
      <td><a href="/crawler">Crawler docs</a></td>
    </tr>
    <tr>
      <td><strong>Indexer</strong></td>
      <td>Multi-layer indexing pipeline (CDX, Parquet, full-text, vector)</td>
      <td><a href="/indexer">Indexer docs</a></td>
    </tr>
    <tr>
      <td><strong>Knowledge Graph</strong></td>
      <td>Entity extraction, deduplication, and graph construction</td>
      <td><a href="/knowledge-graph">KG docs</a></td>
    </tr>
    <tr>
      <td><strong>Vector Search</strong></td>
      <td>Embedding generation and distributed vector database</td>
      <td><a href="/vector-search">Vector docs</a></td>
    </tr>
    <tr>
      <td><strong>Ontology</strong></td>
      <td>Entity type schema and relationship definitions</td>
      <td><a href="/ontology">Ontology docs</a></td>
    </tr>
    <tr>
      <td><strong>API Server</strong></td>
      <td>REST API, authentication, rate limiting</td>
      <td><a href="/api">API reference</a></td>
    </tr>
  </tbody>
</table>

<hr>

<h2>Tools & SDKs</h2>

<div class="card-grid">
  <div class="card">
    <h3>CLI Tool</h3>
    <p>The <code>openindex</code> command-line tool for search, download, and automation. Available for macOS, Linux, and Docker.</p>
    <span class="card-link"><a href="/get-started">Installation guide &rarr;</a></span>
  </div>
  <div class="card">
    <h3>Python SDK</h3>
    <p>Official Python client library. Supports search, vector queries, knowledge graph lookups, and bulk downloads.</p>
    <span class="card-link"><a href="https://github.com/openindex/python-client">GitHub &rarr;</a></span>
  </div>
  <div class="card">
    <h3>Go SDK</h3>
    <p>Official Go client library. Idiomatic Go with context support, streaming responses, and connection pooling.</p>
    <span class="card-link"><a href="https://github.com/openindex/go-client">GitHub &rarr;</a></span>
  </div>
  <div class="card">
    <h3>JavaScript SDK</h3>
    <p>Official JavaScript/TypeScript client. Works in Node.js, Deno, Bun, and modern browsers.</p>
    <span class="card-link"><a href="https://github.com/openindex/js-client">GitHub &rarr;</a></span>
  </div>
</div>

<hr>

<h2>Community Resources</h2>

<div class="card-grid">
  <div class="card">
    <div class="card-icon" style="background:#f1f5f9;color:#0f172a">&#x1F4AC;</div>
    <h3>Discord</h3>
    <p>Join the community. Ask questions, share projects, and get help from the team and other users.</p>
    <span class="card-link"><a href="https://discord.gg/openindex">Join Discord &rarr;</a></span>
  </div>
  <div class="card">
    <div class="card-icon" style="background:#f1f5f9;color:#0f172a">&#x1F4BB;</div>
    <h3>GitHub</h3>
    <p>Source code, issue tracker, and contribution guidelines. All components are open source under Apache 2.0.</p>
    <span class="card-link"><a href="https://github.com/openindex/openindex">View on GitHub &rarr;</a></span>
  </div>
  <div class="card">
    <div class="card-icon" style="background:#f1f5f9;color:#0f172a">&#x1F4DA;</div>
    <h3>Research Papers</h3>
    <p>Academic publications using OpenIndex data. Citations, BibTeX entries, and research area overviews.</p>
    <span class="card-link"><a href="/research">Browse papers &rarr;</a></span>
  </div>
</div>
`
