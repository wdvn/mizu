export const faqPage = `
<h2>Frequently Asked Questions</h2>
<p>Find answers to the most common questions about OpenIndex. If your question is not covered here, ask in our <a href="https://discord.gg/openindex">Discord</a> or open an issue on <a href="https://github.com/openindex/openindex">GitHub</a>.</p>

<hr>

<h3>General Questions</h3>

<details>
  <summary>What is OpenIndex?</summary>
  <div class="details-body">
    <p>OpenIndex is an open-source web intelligence platform that crawls, indexes, and analyzes the open web. It provides a comprehensive index of over 250 billion web pages, including full-text search, semantic vector search, a knowledge graph with 10+ billion entities, and structured metadata in multiple formats (WARC, WAT, WET, Parquet).</p>
    <p>Unlike traditional web archives that store only raw crawl data, OpenIndex provides multiple layers of intelligence on top of the raw data, making it useful for researchers, developers, data scientists, and anyone who needs to understand web content at scale.</p>
  </div>
</details>

<details>
  <summary>How is OpenIndex different from Common Crawl?</summary>
  <div class="details-body">
    <p>Common Crawl is an excellent project that provides free access to raw web crawl data. OpenIndex builds on the same philosophy of open data but adds several additional layers:</p>
    <ul>
      <li><strong>Full-text search</strong> -- Search the entire index by content, not just URL lookup.</li>
      <li><strong>Vector search</strong> -- Find pages by semantic meaning using dense embeddings.</li>
      <li><strong>Knowledge graph</strong> -- 10+ billion entities and relationships extracted from the web.</li>
      <li><strong>Open ontology</strong> -- A community-maintained schema for entity types and relationships.</li>
      <li><strong>Open-source stack</strong> -- The entire platform (crawler, indexer, API) is open source.</li>
      <li><strong>Query language (OQL)</strong> -- A SQL-like language for complex queries across all index types.</li>
    </ul>
    <p>OpenIndex complements Common Crawl. Many researchers use both datasets.</p>
  </div>
</details>

<details>
  <summary>What license is OpenIndex data released under?</summary>
  <div class="details-body">
    <p>OpenIndex data is released under the <strong>Creative Commons CC0 1.0 Universal (Public Domain)</strong> license. This means you can use, modify, and redistribute the data for any purpose, including commercial use, without attribution requirements.</p>
    <p>The OpenIndex software (crawler, indexer, API server) is released under the <strong>Apache License 2.0</strong>.</p>
    <p>We do request (but do not require) that academic users cite the OpenIndex paper. See the <a href="/research">Research page</a> for citation details.</p>
  </div>
</details>

<details>
  <summary>Who can use OpenIndex?</summary>
  <div class="details-body">
    <p>Anyone. OpenIndex is designed for:</p>
    <ul>
      <li><strong>Researchers</strong> -- NLP, information retrieval, web science, security research</li>
      <li><strong>Developers</strong> -- Building search applications, data pipelines, content analysis tools</li>
      <li><strong>Data scientists</strong> -- Large-scale web analytics, trend analysis, language modeling</li>
      <li><strong>Journalists</strong> -- Investigating web content, tracking changes, finding sources</li>
      <li><strong>Companies</strong> -- Market research, competitive analysis, content intelligence</li>
      <li><strong>Hobbyists</strong> -- Exploring the web, building personal projects</li>
    </ul>
    <p>Basic API access is available without an account. Higher rate limits require a free API key.</p>
  </div>
</details>

<details>
  <summary>Is OpenIndex free?</summary>
  <div class="details-body">
    <p>Yes. The core data and API access are free:</p>
    <ul>
      <li><strong>All data</strong> is free to download from S3 (<code>s3://openindex/</code>).</li>
      <li><strong>Anonymous API access</strong> provides 100 requests/minute for basic search.</li>
      <li><strong>Free API keys</strong> provide 1,000 requests/minute with access to all features.</li>
    </ul>
    <p>A paid Pro tier (10,000 req/min) is available for high-volume commercial use. Revenue from Pro subscriptions funds the crawling infrastructure.</p>
  </div>
</details>

<hr>

<h3>Technical Questions</h3>

<details>
  <summary>How does the crawler work?</summary>
  <div class="details-body">
    <p>The OpenIndex crawler (OpenIndexBot) is a distributed web crawler written in Go. Key characteristics:</p>
    <ul>
      <li><strong>Throughput</strong> -- Crawls 50,000+ pages per second across distributed workers.</li>
      <li><strong>Politeness</strong> -- Fully respects robots.txt, with adaptive rate limiting per domain.</li>
      <li><strong>Coverage</strong> -- Targets 2.5-3 billion pages per monthly crawl across 180+ languages.</li>
      <li><strong>Deduplication</strong> -- Content-hash based deduplication avoids storing duplicate pages.</li>
      <li><strong>Transparency</strong> -- The crawler is open source and fully auditable.</li>
    </ul>
    <p>The crawler identifies itself as <code>OpenIndexBot/1.0</code> in the User-Agent header. See the <a href="/crawler">Crawler documentation</a> for technical details.</p>
  </div>
</details>

<details>
  <summary>What data formats are available?</summary>
  <div class="details-body">
    <p>OpenIndex provides data in six formats:</p>
    <ul>
      <li><strong>WARC</strong> -- Full HTTP request/response pairs (the primary archive format)</li>
      <li><strong>WAT</strong> -- Extracted metadata as JSON (HTTP headers, HTML metadata, links)</li>
      <li><strong>WET</strong> -- Clean plaintext extraction (boilerplate removed)</li>
      <li><strong>Parquet</strong> -- Columnar index with URL metadata (for analytics queries)</li>
      <li><strong>Vector</strong> -- Dense embeddings (1024-dim float32 vectors)</li>
      <li><strong>JSON-LD</strong> -- Knowledge graph entities and relationships</li>
    </ul>
    <p>See the <a href="/data-formats">Data Formats</a> page for detailed schemas and examples.</p>
  </div>
</details>

<details>
  <summary>What are the API rate limits?</summary>
  <div class="details-body">
    <table>
      <thead>
        <tr>
          <th>Tier</th>
          <th>Rate Limit</th>
          <th>Daily Limit</th>
          <th>Cost</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Anonymous</td>
          <td>100 req/min</td>
          <td>5,000</td>
          <td>Free</td>
        </tr>
        <tr>
          <td>Free (API key)</td>
          <td>1,000 req/min</td>
          <td>100,000</td>
          <td>Free</td>
        </tr>
        <tr>
          <td>Pro</td>
          <td>10,000 req/min</td>
          <td>Unlimited</td>
          <td>$49/month</td>
        </tr>
        <tr>
          <td>Enterprise</td>
          <td>Custom</td>
          <td>Unlimited</td>
          <td>Contact us</td>
        </tr>
      </tbody>
    </table>
    <p>Rate limit headers (<code>X-RateLimit-Limit</code>, <code>X-RateLimit-Remaining</code>, <code>X-RateLimit-Reset</code>) are included in every API response. If you hit the limit, you will receive a <code>429 Too Many Requests</code> response.</p>
  </div>
</details>

<details>
  <summary>How does vector search work?</summary>
  <div class="details-body">
    <p>Vector search uses dense embeddings to find pages by semantic meaning rather than exact keyword matches. The process works as follows:</p>
    <ol>
      <li>Every crawled page is processed through the <code>multilingual-e5-large</code> embedding model, producing a 1024-dimensional vector.</li>
      <li>Vectors are stored in a distributed Vald vector database across 200+ nodes.</li>
      <li>When you submit a search query, it is embedded using the same model.</li>
      <li>The system finds the nearest vectors using approximate nearest neighbor (ANN) search.</li>
      <li>Results are returned ranked by cosine similarity.</li>
    </ol>
    <p>Vector search supports cross-lingual queries -- a query in English can find relevant pages in Japanese, German, or any other supported language. See the <a href="/vector-search">Vector Search</a> documentation for details.</p>
  </div>
</details>

<details>
  <summary>How does the knowledge graph work?</summary>
  <div class="details-body">
    <p>The OpenIndex knowledge graph contains over 10 billion entities and their relationships, extracted from crawled web pages using a multi-stage pipeline:</p>
    <ol>
      <li><strong>Named Entity Recognition (NER)</strong> -- Identifies mentions of people, organizations, places, and other entities in page text.</li>
      <li><strong>Entity Linking</strong> -- Maps mentions to canonical entities, resolving aliases and ambiguity.</li>
      <li><strong>Relationship Extraction</strong> -- Identifies relationships between entities (e.g., "founded by", "located in").</li>
      <li><strong>Entity Resolution</strong> -- Deduplicates entities across millions of source pages.</li>
      <li><strong>Graph Construction</strong> -- Builds the final graph in Neo4j with confidence scores.</li>
    </ol>
    <p>The graph follows the <a href="/ontology">OpenIndex Ontology</a>, a community-maintained schema compatible with Schema.org. See the <a href="/knowledge-graph">Knowledge Graph</a> documentation for details.</p>
  </div>
</details>

<hr>

<h3>Data Questions</h3>

<details>
  <summary>How fresh is the data?</summary>
  <div class="details-body">
    <p>OpenIndex produces a new crawl every month. Each crawl takes approximately 3-4 weeks to complete, followed by 1-2 weeks of indexing, embedding generation, and knowledge graph construction. The data is typically available within 5-6 weeks of the crawl start date.</p>
    <p>The current latest crawl is <strong>OI-2026-02</strong> (February 2026). See the <a href="/latest-build">Latest Build</a> page for details.</p>
  </div>
</details>

<details>
  <summary>What is the geographic and language coverage?</summary>
  <div class="details-body">
    <p>OpenIndex crawls are global. The February 2026 crawl covers:</p>
    <ul>
      <li><strong>180+ languages</strong> detected across all crawled pages</li>
      <li><strong>All TLDs</strong> including country-code TLDs (.de, .jp, .br, etc.)</li>
      <li><strong>200+ countries</strong> based on server geolocation</li>
    </ul>
    <p>Language distribution is skewed towards English (approximately 45% of pages), followed by Chinese, German, Japanese, French, Spanish, and Russian. We actively work to improve coverage of underrepresented languages.</p>
  </div>
</details>

<details>
  <summary>How large is the dataset?</summary>
  <div class="details-body">
    <p>A typical monthly crawl (e.g., OI-2026-02) contains:</p>
    <table>
      <thead>
        <tr>
          <th>Metric</th>
          <th>Value</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>Total pages</td><td>2.8 billion</td></tr>
        <tr><td>WARC files (compressed)</td><td>~420 TiB</td></tr>
        <tr><td>WAT files (compressed)</td><td>~180 TiB</td></tr>
        <tr><td>WET files (compressed)</td><td>~85 TiB</td></tr>
        <tr><td>Parquet index</td><td>~12 TiB</td></tr>
        <tr><td>Vector embeddings</td><td>~45 TiB</td></tr>
        <tr><td>Knowledge graph export</td><td>~8 TiB</td></tr>
      </tbody>
    </table>
    <p>The total corpus across all crawls is in the petabytes.</p>
  </div>
</details>

<details>
  <summary>How do I download the data?</summary>
  <div class="details-body">
    <p>There are several ways to download OpenIndex data:</p>
    <ul>
      <li><strong>AWS CLI</strong> -- <code>aws s3 sync s3://openindex/crawl/OI-2026-02/ ./data/ --no-sign-request</code></li>
      <li><strong>HTTPS</strong> -- Direct file download from <code>https://data.openindex.org/</code></li>
      <li><strong>OpenIndex CLI</strong> -- <code>openindex download --crawl OI-2026-02 --format parquet</code></li>
      <li><strong>Remote query</strong> -- Query Parquet files directly with DuckDB without downloading</li>
    </ul>
    <p>No authentication is required for data downloads. See the <a href="/get-started">Get Started</a> guide for detailed instructions.</p>
  </div>
</details>

<details>
  <summary>Can I use OpenIndex data for commercial purposes?</summary>
  <div class="details-body">
    <p>Yes. OpenIndex data is released under the CC0 1.0 Universal (Public Domain) license. You can use it for any purpose, including commercial applications, without restriction or attribution requirements.</p>
    <p>The software components are Apache 2.0 licensed, which also permits commercial use.</p>
    <p>However, note that the data reflects web content created by third parties. Individual web pages may be subject to their own copyright. OpenIndex provides the data as-is for research and analysis; compliance with applicable laws regarding the underlying content is the user's responsibility.</p>
  </div>
</details>

<details>
  <summary>How do I request the removal of my content?</summary>
  <div class="details-body">
    <p>Website owners can prevent their sites from being crawled by adding the following to their robots.txt file:</p>
<pre><code>User-agent: OpenIndexBot
Disallow: /</code></pre>
    <p>To request removal of content already in the index, contact us at <a href="mailto:removal@openindex.org">removal@openindex.org</a> with the affected URLs. We process removal requests within 5 business days.</p>
    <p>We also honor the <code>X-Robots-Tag: noindex</code> HTTP header and the <code>&lt;meta name="robots" content="noindex"&gt;</code> HTML tag.</p>
  </div>
</details>
`
