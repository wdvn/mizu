export const blogPage = `
<h2>Blog</h2>
<p>Updates, release notes, research highlights, and engineering deep dives from the OpenIndex team.</p>

<div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin:1.5rem 0 2rem">
  <button class="btn-primary" style="padding:0.5rem 1rem;font-size:0.85rem;border:none;cursor:pointer">All</button>
  <button class="btn-secondary" style="padding:0.5rem 1rem;font-size:0.85rem;cursor:pointer">Release</button>
  <button class="btn-secondary" style="padding:0.5rem 1rem;font-size:0.85rem;cursor:pointer">Analysis</button>
  <button class="btn-secondary" style="padding:0.5rem 1rem;font-size:0.85rem;cursor:pointer">Knowledge Graph</button>
  <button class="btn-secondary" style="padding:0.5rem 1rem;font-size:0.85rem;cursor:pointer">Vector Search</button>
  <button class="btn-secondary" style="padding:0.5rem 1rem;font-size:0.85rem;cursor:pointer">Engineering</button>
</div>

<div class="blog-grid">
  <a href="/blog" class="blog-card">
    <div class="blog-card-img" style="background:linear-gradient(135deg,#2563eb,#06b6d4)">&#x1F680;</div>
    <div class="blog-card-body">
      <span class="blog-card-tag">Release</span>
      <h3>OpenIndex v0.9: Vector Search Goes Live</h3>
      <p style="font-size:0.8rem;color:#94a3b8;margin-bottom:0.5rem">February 20, 2026</p>
      <p>Semantic search is now available across the entire index. Query by meaning, find by understanding. We cover the architecture decisions and benchmark results.</p>
    </div>
  </a>
  <a href="/blog" class="blog-card">
    <div class="blog-card-img" style="background:linear-gradient(135deg,#7c3aed,#db2777)">&#x1F4CA;</div>
    <div class="blog-card-body">
      <span class="blog-card-tag">Analysis</span>
      <h3>Mapping the Knowledge Graph: 10 Billion Entities</h3>
      <p style="font-size:0.8rem;color:#94a3b8;margin-bottom:0.5rem">February 15, 2026</p>
      <p>Our knowledge graph now contains over 10 billion entity relationships extracted from the open web. Here is what we learned about the structure of human knowledge.</p>
    </div>
  </a>
  <a href="/blog" class="blog-card">
    <div class="blog-card-img" style="background:linear-gradient(135deg,#16a34a,#2563eb)">&#x1F30D;</div>
    <div class="blog-card-body">
      <span class="blog-card-tag">Release</span>
      <h3>February 2026 Crawl Now Available</h3>
      <p style="font-size:0.8rem;color:#94a3b8;margin-bottom:0.5rem">February 10, 2026</p>
      <p>Our latest crawl covers 2.8 billion pages across 180+ languages. Download or query via API. Includes improved language detection and expanded CJK coverage.</p>
    </div>
  </a>
  <a href="/blog" class="blog-card">
    <div class="blog-card-img" style="background:linear-gradient(135deg,#ea580c,#fbbf24)">&#x1F9E0;</div>
    <div class="blog-card-body">
      <span class="blog-card-tag">Vector Search</span>
      <h3>Multilingual Embeddings: One Model for 100+ Languages</h3>
      <p style="font-size:0.8rem;color:#94a3b8;margin-bottom:0.5rem">February 5, 2026</p>
      <p>How we use multilingual-e5-large to generate embeddings that work across language boundaries. Cross-lingual search is now a reality at web scale.</p>
    </div>
  </a>
  <a href="/blog" class="blog-card">
    <div class="blog-card-img" style="background:linear-gradient(135deg,#0891b2,#7c3aed)">&#x1F578;</div>
    <div class="blog-card-body">
      <span class="blog-card-tag">Knowledge Graph</span>
      <h3>Entity Resolution at Scale: Deduplicating the Web's Knowledge</h3>
      <p style="font-size:0.8rem;color:#94a3b8;margin-bottom:0.5rem">January 28, 2026</p>
      <p>The same entity appears on millions of web pages under different names. We describe our multi-stage entity resolution pipeline that merges them into a single graph node.</p>
    </div>
  </a>
  <a href="/blog" class="blog-card">
    <div class="blog-card-img" style="background:linear-gradient(135deg,#dc2626,#ea580c)">&#x2699;&#xFE0F;</div>
    <div class="blog-card-body">
      <span class="blog-card-tag">Engineering</span>
      <h3>Crawling at 50,000 Pages per Second</h3>
      <p style="font-size:0.8rem;color:#94a3b8;margin-bottom:0.5rem">January 20, 2026</p>
      <p>A deep dive into the engineering of our distributed crawler. Connection pooling, DNS caching, adaptive rate limiting, and how we handle the long tail of slow servers.</p>
    </div>
  </a>
  <a href="/blog" class="blog-card">
    <div class="blog-card-img" style="background:linear-gradient(135deg,#059669,#16a34a)">&#x1F4D6;</div>
    <div class="blog-card-body">
      <span class="blog-card-tag">Release</span>
      <h3>Introducing OQL: A Query Language for the Open Web</h3>
      <p style="font-size:0.8rem;color:#94a3b8;margin-bottom:0.5rem">January 12, 2026</p>
      <p>We are releasing OpenIndex Query Language (OQL), a SQL-like language for searching the index. Combine full-text search, vector similarity, and graph traversal in a single query.</p>
    </div>
  </a>
  <a href="/blog" class="blog-card">
    <div class="blog-card-img" style="background:linear-gradient(135deg,#7c3aed,#2563eb)">&#x1F52C;</div>
    <div class="blog-card-body">
      <span class="blog-card-tag">Analysis</span>
      <h3>The State of the Web: 2025 in Review</h3>
      <p style="font-size:0.8rem;color:#94a3b8;margin-bottom:0.5rem">January 5, 2026</p>
      <p>Analysis of a year of crawl data. HTTPS adoption reaches 94%, median page weight grows to 2.8 MB, and we see the rise of AI-generated content across multiple TLDs.</p>
    </div>
  </a>
  <a href="/blog" class="blog-card">
    <div class="blog-card-img" style="background:linear-gradient(135deg,#0284c7,#06b6d4)">&#x1F6E0;&#xFE0F;</div>
    <div class="blog-card-body">
      <span class="blog-card-tag">Engineering</span>
      <h3>Building a Distributed Vector Database for Web Scale</h3>
      <p style="font-size:0.8rem;color:#94a3b8;margin-bottom:0.5rem">December 20, 2025</p>
      <p>How we deployed Vald across 200+ nodes to serve vector similarity queries over 250 billion embeddings with sub-100ms P99 latency.</p>
    </div>
  </a>
</div>
`
