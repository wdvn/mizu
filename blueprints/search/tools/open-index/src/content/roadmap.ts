export const roadmapPage = `
<h2>Public Roadmap</h2>
<p>This is the OpenIndex public roadmap. It shows what we have shipped, what we are currently building, and what we plan to build next. Dates are approximate and may shift based on community feedback and resource availability.</p>

<div class="note">
  <strong>Have feedback on priorities?</strong> Join the discussion on <a href="https://github.com/openindex/openindex/discussions">GitHub Discussions</a> or the <code>#roadmap</code> channel on <a href="https://discord.gg/openindex">Discord</a>. Community input directly shapes what we build next.
</div>

<hr>

<h3>Completed</h3>

<div class="timeline">
  <div class="timeline-item completed">
    <div class="timeline-date">Q1 2024</div>
    <h3>Initial Crawler</h3>
    <p>Launched the distributed Go-based web crawler with robots.txt compliance, adaptive rate limiting, and deduplication. First crawl of 500 million pages.</p>
  </div>
  <div class="timeline-item completed">
    <div class="timeline-date">Q2 2024</div>
    <h3>CDX Index</h3>
    <p>Built the CDX index for URL-to-WARC record lookup, enabling fast retrieval of any crawled page by URL. Compatible with the standard CDX API format used by web archives.</p>
  </div>
  <div class="timeline-item completed">
    <div class="timeline-date">Q3 2024</div>
    <h3>Parquet Columnar Index</h3>
    <p>Released the Parquet columnar index containing URL metadata, content hashes, language detection, and server headers. Queryable with DuckDB, Spark, and other columnar engines.</p>
  </div>
  <div class="timeline-item completed">
    <div class="timeline-date">Q4 2024</div>
    <h3>REST API v1</h3>
    <p>Launched the public REST API with endpoints for search, URL lookup, domain browsing, and data access. Free tier with 100 req/min for anonymous users and 1,000 req/min with API key.</p>
  </div>
  <div class="timeline-item completed">
    <div class="timeline-date">Q1 2025</div>
    <h3>Full-Text Search Index</h3>
    <p>Deployed the Tantivy-based full-text search index across the entire corpus. BM25 ranking with language-aware tokenization for 180+ languages.</p>
  </div>
  <div class="timeline-item completed">
    <div class="timeline-date">Q2 2025</div>
    <h3>WAT/WET Derivatives</h3>
    <p>Released WAT (metadata extract) and WET (plaintext extract) files for every crawl, matching the format conventions used by Common Crawl for compatibility.</p>
  </div>
  <div class="timeline-item completed">
    <div class="timeline-date">Q3 2025</div>
    <h3>Monthly Crawl Cadence</h3>
    <p>Reached operational maturity with consistent monthly crawls of 2+ billion pages. Automated pipeline from crawl to index to API availability within 5-6 weeks.</p>
  </div>
</div>

<hr>

<h3>In Progress</h3>

<div class="timeline">
  <div class="timeline-item">
    <div class="timeline-date">Q4 2025 -- Q1 2026</div>
    <h3>Vector Search</h3>
    <p>Generating dense embeddings (multilingual-e5-large, 1024-dim) for every indexed page. Semantic search via Vald distributed vector database. Currently in public beta with full corpus coverage.</p>
  </div>
  <div class="timeline-item">
    <div class="timeline-date">Q1 2026</div>
    <h3>Knowledge Graph v1</h3>
    <p>Entity extraction (NER), entity linking, and relationship mapping pipeline producing a graph of 10+ billion entities in Neo4j. Queryable via the graph API. Currently in beta.</p>
  </div>
  <div class="timeline-item">
    <div class="timeline-date">Q1 2026</div>
    <h3>Open Ontology v0.1</h3>
    <p>Community-maintained entity type schema compatible with Schema.org. Initial release covers Person, Organization, Place, Event, and CreativeWork types with their properties and relationships.</p>
  </div>
</div>

<hr>

<h3>Upcoming</h3>

<div class="timeline">
  <div class="timeline-item upcoming">
    <div class="timeline-date">Q2 2026</div>
    <h3>OpenIndex Query Language (OQL)</h3>
    <p>A SQL-like query language for complex queries that span multiple index types. Combine full-text search, vector similarity, graph traversals, and metadata filters in a single query.</p>
  </div>
  <div class="timeline-item upcoming">
    <div class="timeline-date">Q2 2026</div>
    <h3>Graph Queries API</h3>
    <p>Public API endpoints for traversing the knowledge graph: entity lookup, relationship queries, path finding, and subgraph extraction. Support for Cypher-like query syntax.</p>
  </div>
  <div class="timeline-item upcoming">
    <div class="timeline-date">Q3 2026</div>
    <h3>Entity Resolution v2</h3>
    <p>Improved entity resolution pipeline with cross-lingual linking, temporal awareness (tracking entity changes over time), and confidence calibration. Target: 96%+ F1 on standard benchmarks.</p>
  </div>
  <div class="timeline-item upcoming">
    <div class="timeline-date">Q3 2026</div>
    <h3>Multi-Modal Embeddings</h3>
    <p>Extend the vector pipeline to include image embeddings (CLIP-based) for pages with visual content. Enable cross-modal search: find images by text description, or find text by image similarity.</p>
  </div>
  <div class="timeline-item upcoming">
    <div class="timeline-date">Q4 2026</div>
    <h3>Streaming Crawl Updates</h3>
    <p>Real-time feed of crawl updates via WebSocket and Kafka. Subscribe to changes for specific domains, URL patterns, or entity types. Enable near-real-time monitoring applications.</p>
  </div>
  <div class="timeline-item upcoming">
    <div class="timeline-date">Q4 2026</div>
    <h3>Self-Hosted Distribution</h3>
    <p>Helm charts and Docker Compose configurations for running the complete OpenIndex stack (crawler, indexer, API, vector DB, graph DB) on your own infrastructure or cloud account.</p>
  </div>
  <div class="timeline-item upcoming">
    <div class="timeline-date">2027</div>
    <h3>Federated Index</h3>
    <p>Protocol for connecting multiple OpenIndex instances into a federated network. Organizations can run their own crawlers and indices while participating in a shared global search layer.</p>
  </div>
</div>

<hr>

<h3>Vision</h3>
<p>Our long-term vision is a world where web intelligence is as accessible as web data. Today, anyone can download a web page. Tomorrow, anyone should be able to search, analyze, and understand the entire web — its content, its structure, its entities, and its evolution over time.</p>

<p>We are building toward a platform where:</p>
<ul>
  <li>A researcher can answer complex questions about the web in minutes, not months.</li>
  <li>A developer can build a search application on top of an open, auditable index.</li>
  <li>A journalist can trace the spread of a narrative across languages and borders in real time.</li>
  <li>A student can explore the same web intelligence that powers the world's largest search engines.</li>
  <li>Organizations can run their own instances and participate in a federated open web index.</li>
</ul>

<p>This is an ambitious goal, and we cannot achieve it alone. If you share this vision, <a href="/contributing">contribute</a>, <a href="/collaborators">collaborate</a>, or simply <a href="/get-started">start using OpenIndex</a> and tell us how to make it better.</p>
`
