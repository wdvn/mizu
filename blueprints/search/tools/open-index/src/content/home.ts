export const homePage = `
<div class="hero">
  <h1>Index the web. Understand it.</h1>
  <p class="hero-sub">OpenIndex is an open-source web intelligence platform. Crawl, index, search, and build knowledge graphs from the open web — with vector search, ontologies, and full-text retrieval built in.</p>
  <div class="hero-actions">
    <a href="/get-started" class="btn-primary">Get Started</a>
    <a href="/overview" class="btn-secondary">How it Works</a>
  </div>
  <div class="stats">
    <div class="stat">
      <div class="stat-value">2.8B</div>
      <div class="stat-label">Pages indexed</div>
    </div>
    <div class="stat">
      <div class="stat-value">180+</div>
      <div class="stat-label">Languages</div>
    </div>
    <div class="stat">
      <div class="stat-value">890M</div>
      <div class="stat-label">Entities extracted</div>
    </div>
    <div class="stat">
      <div class="stat-value">Open</div>
      <div class="stat-label">Source &amp; data</div>
    </div>
  </div>
</div>

<section class="section">
  <div class="container">
    <div class="section-header">
      <h2>A complete web intelligence stack</h2>
      <p>Not just crawl data. A full platform for understanding the web — from raw HTML to semantic knowledge.</p>
    </div>
    <div class="card-grid">
      <a href="/crawler" class="card" style="text-decoration:none;color:inherit">
        <div class="card-icon" style="background:var(--bg-tertiary)">&#x1F577;</div>
        <h3>Open Crawler</h3>
        <p>Distributed, high-throughput web crawler built in Go. Billions of pages monthly with full robots.txt compliance.</p>
        <span class="card-link">Learn more &rarr;</span>
      </a>
      <a href="/indexer" class="card" style="text-decoration:none;color:inherit">
        <div class="card-icon" style="background:var(--bg-tertiary)">&#x1F4D1;</div>
        <h3>Multi-layer Indexer</h3>
        <p>CDX for URL lookup, Parquet for analytics, full-text for search, and vector embeddings for semantic queries.</p>
        <span class="card-link">Learn more &rarr;</span>
      </a>
      <a href="/knowledge-graph" class="card" style="text-decoration:none;color:inherit">
        <div class="card-icon" style="background:var(--bg-tertiary)">&#x1F578;</div>
        <h3>Knowledge Graph</h3>
        <p>Entity extraction, relationship mapping, and graph analytics. Understand the semantic connections in web content.</p>
        <span class="card-link">Learn more &rarr;</span>
      </a>
      <a href="/ontology" class="card" style="text-decoration:none;color:inherit">
        <div class="card-icon" style="background:var(--bg-tertiary)">&#x1F3D7;</div>
        <h3>Open Ontology</h3>
        <p>A community-maintained schema for web entities. Compatible with Schema.org, available in JSON-LD, RDF, and OWL.</p>
        <span class="card-link">Learn more &rarr;</span>
      </a>
      <a href="/vector-search" class="card" style="text-decoration:none;color:inherit">
        <div class="card-icon" style="background:var(--bg-tertiary)">&#x1F50D;</div>
        <h3>Vector Search</h3>
        <p>Find content by meaning, not just keywords. Semantic search powered by dense embeddings across the entire index.</p>
        <span class="card-link">Learn more &rarr;</span>
      </a>
      <a href="/api" class="card" style="text-decoration:none;color:inherit">
        <div class="card-icon" style="background:var(--bg-tertiary)">&#x26A1;</div>
        <h3>Open API</h3>
        <p>RESTful API with generous rate limits. Search, query, browse, and analyze the entire index programmatically.</p>
        <span class="card-link">Learn more &rarr;</span>
      </a>
    </div>
  </div>
</section>

<section class="section section-alt">
  <div class="container">
    <div class="section-header">
      <h2>Beyond raw data</h2>
      <p>Where existing web archives stop at crawl data, OpenIndex adds layers of intelligence.</p>
    </div>
    <table>
      <thead>
        <tr>
          <th>Layer</th>
          <th>Traditional archives</th>
          <th>OpenIndex</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Crawling</strong></td>
          <td>Proprietary crawlers</td>
          <td>Open-source, distributed, auditable</td>
        </tr>
        <tr>
          <td><strong>Storage</strong></td>
          <td>WARC files on cloud</td>
          <td>WARC + structured DB + vector store</td>
        </tr>
        <tr>
          <td><strong>Index</strong></td>
          <td>CDX + Columnar</td>
          <td>CDX + Columnar + Full-text + Vector</td>
        </tr>
        <tr>
          <td><strong>Graph</strong></td>
          <td>Host/domain web graphs</td>
          <td>Web graph + Knowledge graph + Entity graph</td>
        </tr>
        <tr>
          <td><strong>Ontology</strong></td>
          <td>None</td>
          <td>Open, community-maintained schema</td>
        </tr>
        <tr>
          <td><strong>Search</strong></td>
          <td>URL lookup only</td>
          <td>Full-text + semantic + vector</td>
        </tr>
        <tr>
          <td><strong>AI</strong></td>
          <td>Limited</td>
          <td>Embeddings, RAG, clustering</td>
        </tr>
      </tbody>
    </table>
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="section-header">
      <h2>Latest from the blog</h2>
    </div>
    <div class="blog-grid">
      <a href="/blog" class="blog-card">
        <div class="blog-card-img" style="background:linear-gradient(135deg,#171717,#333)">&#x1F680;</div>
        <div class="blog-card-body">
          <span class="blog-card-tag">Release</span>
          <h3>Vector Search is Live</h3>
          <p>Semantic search across the entire index. Query by meaning, find by understanding.</p>
        </div>
      </a>
      <a href="/blog" class="blog-card">
        <div class="blog-card-img" style="background:linear-gradient(135deg,#333,#555)">&#x1F4CA;</div>
        <div class="blog-card-body">
          <span class="blog-card-tag">Analysis</span>
          <h3>890M Entities Extracted</h3>
          <p>Our knowledge graph now maps relationships between 890 million entities from the open web.</p>
        </div>
      </a>
      <a href="/blog" class="blog-card">
        <div class="blog-card-img" style="background:linear-gradient(135deg,#555,#171717)">&#x1F30D;</div>
        <div class="blog-card-body">
          <span class="blog-card-tag">Crawl</span>
          <h3>February 2026 Crawl Available</h3>
          <p>2.8 billion pages across 180+ languages. Download or query via API.</p>
        </div>
      </a>
    </div>
  </div>
</section>

<section class="section section-alt" style="text-align:center">
  <div class="container">
    <h2 style="margin-bottom:0.75rem;font-size:1.5rem">Start building with the open web</h2>
    <p style="color:var(--fg-secondary);margin-bottom:1.5rem">Free API access. No account required for basic queries.</p>
    <div class="hero-actions">
      <a href="/get-started" class="btn-primary">Get Started</a>
      <a href="/api" class="btn-secondary">API Reference</a>
    </div>
  </div>
</section>
`
