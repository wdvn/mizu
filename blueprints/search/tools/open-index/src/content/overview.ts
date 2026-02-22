export const overviewPage = `
<h2>What is OpenIndex?</h2>
<p>OpenIndex is an open-source web intelligence platform that maintains a comprehensive, freely accessible index of the open web. Unlike traditional web archives that stop at storing raw crawl data, OpenIndex provides a complete intelligence stack — from distributed crawling to semantic search, knowledge graphs, and AI-ready embeddings.</p>

<p>The platform is built on the principle that understanding the web should not be a privilege reserved for large corporations with massive infrastructure budgets. Every researcher, developer, journalist, and curious individual deserves access to the same quality of web intelligence that powers the world's largest search engines.</p>

<h2>The OpenIndex Corpus</h2>
<p>The OpenIndex corpus contains <strong>petabytes of data</strong>, regularly collected and indexed since 2024. The corpus includes:</p>
<ul>
  <li><strong>Raw web page data</strong> — complete HTTP responses stored in WARC format</li>
  <li><strong>Metadata extracts</strong> — structured metadata in WAT/JSON format</li>
  <li><strong>Text extracts</strong> — clean plaintext in WET format</li>
  <li><strong>Full-text index</strong> — searchable content index across all pages</li>
  <li><strong>Vector embeddings</strong> — dense semantic representations for similarity search</li>
  <li><strong>Knowledge graph</strong> — entity and relationship data extracted from web content</li>
  <li><strong>Web graphs</strong> — host-level and domain-level link graphs</li>
</ul>

<p>Data is stored on cloud infrastructure and available for free download or direct querying via API. Researchers can run analysis jobs in the cloud or download datasets for local processing.</p>

<h2>How It Differs</h2>
<p>OpenIndex was created to address the gap between raw web archives and the intelligence needed to actually understand web content at scale:</p>

<div class="card-grid">
  <div class="card">
    <h3>Beyond URL Lookup</h3>
    <p>Traditional CDX indices let you look up a URL to find its WARC record. OpenIndex adds full-text search, semantic search, and graph queries — find content by what it says, not just where it lives.</p>
  </div>
  <div class="card">
    <h3>Structured Knowledge</h3>
    <p>Raw HTML is useful, but structured knowledge is powerful. OpenIndex extracts entities (people, organizations, places), relationships, and topics from every crawled page.</p>
  </div>
  <div class="card">
    <h3>Open Source, End to End</h3>
    <p>The entire stack is open source — crawler, indexer, graph builder, vector pipeline, API server. You can audit, modify, or run your own instance.</p>
  </div>
  <div class="card">
    <h3>AI-Ready</h3>
    <p>Vector embeddings are generated for every indexed page, enabling semantic search, content clustering, deduplication, and RAG (retrieval-augmented generation) workflows.</p>
  </div>
</div>

<h2>Access the Data</h2>
<p>You can access OpenIndex data in several ways:</p>
<ol>
  <li><strong>API</strong> — Query the index programmatically with our REST API. Free for research and open-source use.</li>
  <li><strong>Bulk Download</strong> — Download WARC files, Parquet indices, or knowledge graph exports directly.</li>
  <li><strong>Cloud Processing</strong> — Run analysis jobs directly against the data in cloud storage.</li>
  <li><strong>CLI Tool</strong> — Use the <code>openindex</code> CLI for scripted access and automation.</li>
</ol>

<p>See the <a href="/get-started">Get Started</a> guide for detailed instructions, or jump straight to the <a href="/api">API Reference</a>.</p>

<h2>Available Crawls</h2>
<p>OpenIndex produces monthly crawls. Each crawl is a self-contained snapshot of billions of web pages, fully indexed and searchable.</p>

<table>
  <thead>
    <tr>
      <th>Crawl</th>
      <th>Date</th>
      <th>Pages</th>
      <th>Size</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>OI-2026-02</strong></td>
      <td>February 2026</td>
      <td>2.8 billion</td>
      <td>420 TiB</td>
    </tr>
    <tr>
      <td><strong>OI-2026-01</strong></td>
      <td>January 2026</td>
      <td>2.6 billion</td>
      <td>398 TiB</td>
    </tr>
    <tr>
      <td><strong>OI-2025-12</strong></td>
      <td>December 2025</td>
      <td>2.5 billion</td>
      <td>385 TiB</td>
    </tr>
    <tr>
      <td><strong>OI-2025-11</strong></td>
      <td>November 2025</td>
      <td>2.4 billion</td>
      <td>372 TiB</td>
    </tr>
    <tr>
      <td><strong>OI-2025-10</strong></td>
      <td>October 2025</td>
      <td>2.3 billion</td>
      <td>358 TiB</td>
    </tr>
  </tbody>
</table>

<p>See the <a href="/latest-build">Latest Build</a> page for current crawl details and download links.</p>
`
