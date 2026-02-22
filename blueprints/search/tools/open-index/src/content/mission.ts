export const missionPage = `
<h2>Our Mission</h2>
<p>OpenIndex exists to democratize web intelligence. We believe that the ability to search, analyze, and understand the open web should not be a privilege reserved for a handful of large technology companies. It should be a public good, available to every researcher, developer, journalist, educator, and citizen.</p>

<p>We are building an open, transparent, and community-governed platform that provides not just raw crawl data, but a complete intelligence stack: full-text search, semantic search, knowledge graphs, structured ontologies, and AI-ready embeddings. All of it open source. All of it free to use.</p>

<hr>

<h3>Why Open Web Intelligence Matters</h3>
<p>The web is humanity's largest shared knowledge resource. It contains the collective output of billions of people — news, research, government records, cultural artifacts, scientific data, and everyday human expression. Yet the tools to truly understand this resource at scale are controlled by a small number of corporations.</p>

<p>Consider what it takes today to answer questions like:</p>
<ul>
  <li>How is a particular narrative spreading across language boundaries?</li>
  <li>What entities and relationships connect a set of web pages on a specific topic?</li>
  <li>How has the web's coverage of a public health issue changed over the past year?</li>
  <li>Which pages are semantically similar to a given document, regardless of language?</li>
</ul>

<p>To answer these questions, you currently need access to a proprietary search engine's infrastructure, or the resources to build your own. OpenIndex changes that. We provide the crawl data, the indices, the knowledge graph, and the APIs — all openly — so that anyone can ask these questions and get answers.</p>

<hr>

<h3>Core Principles</h3>

<div class="card-grid">
  <div class="card">
    <h3>Openness</h3>
    <p>Every component of the OpenIndex platform is open source. The data is public domain. The APIs are free. The algorithms are published. There are no black boxes. Anyone can inspect, audit, reproduce, or extend any part of the system.</p>
  </div>
  <div class="card">
    <h3>Transparency</h3>
    <p>We publish our crawl methodology, our indexing pipeline, our quality metrics, and our operational decisions. When we make trade-offs — coverage vs. freshness, precision vs. recall — we document why. Our roadmap is public and our governance is open.</p>
  </div>
  <div class="card">
    <h3>Accessibility</h3>
    <p>Data without access is just storage. We provide multiple ways to use the data: REST APIs, bulk downloads, remote queries, CLI tools, and cloud-native integrations. Free tiers are generous enough for meaningful research and development work.</p>
  </div>
  <div class="card">
    <h3>Community</h3>
    <p>OpenIndex is built by and for a community. Contributors shape the roadmap. Researchers inform priorities. Users report issues and suggest improvements. We are not a company selling a product — we are a collective building a public resource.</p>
  </div>
</div>

<hr>

<h3>What We Believe</h3>

<blockquote>
  Every person should have access to the same quality of web intelligence that powers the world's largest search engines. The ability to understand the web at scale should not depend on your employer's infrastructure budget.
</blockquote>

<p>We believe that:</p>
<ul>
  <li><strong>Web data is a public resource.</strong> The open web was built by everyone. The tools to understand it should be available to everyone.</li>
  <li><strong>Intelligence requires more than raw data.</strong> Petabytes of WARC files are necessary but not sufficient. Researchers need search, structure, and semantics — not just archives.</li>
  <li><strong>Open source is the right model.</strong> Infrastructure this important should be auditable, reproducible, and governed by its community, not by a corporate board.</li>
  <li><strong>Access should be equitable.</strong> A graduate student in Nairobi should have the same access to web intelligence as an engineer at a San Francisco tech company.</li>
  <li><strong>Transparency builds trust.</strong> When people can see how data is collected, processed, and indexed, they can make informed decisions about how to use it.</li>
</ul>

<hr>

<h3>How We Are Different</h3>
<p>Several organizations work with web data. Here is how OpenIndex fits into the landscape:</p>

<table>
  <thead>
    <tr>
      <th></th>
      <th>Commercial Search Engines</th>
      <th>Web Archives</th>
      <th>OpenIndex</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Primary goal</strong></td>
      <td>Ad revenue / product ecosystem</td>
      <td>Preservation of web history</td>
      <td>Open web intelligence for all</td>
    </tr>
    <tr>
      <td><strong>Data access</strong></td>
      <td>Closed / proprietary</td>
      <td>Open (raw crawl data)</td>
      <td>Open (raw + indexed + semantic)</td>
    </tr>
    <tr>
      <td><strong>Search capability</strong></td>
      <td>Full-text + semantic (proprietary)</td>
      <td>URL lookup (CDX)</td>
      <td>Full-text + semantic + graph (open)</td>
    </tr>
    <tr>
      <td><strong>Knowledge graph</strong></td>
      <td>Proprietary (e.g., Google KG)</td>
      <td>None</td>
      <td>Open, community-maintained</td>
    </tr>
    <tr>
      <td><strong>Source code</strong></td>
      <td>Closed</td>
      <td>Partially open</td>
      <td>Fully open (Apache 2.0)</td>
    </tr>
    <tr>
      <td><strong>Governance</strong></td>
      <td>Corporate</td>
      <td>Nonprofit</td>
      <td>Community-governed nonprofit</td>
    </tr>
    <tr>
      <td><strong>AI/ML ready</strong></td>
      <td>Internal use only</td>
      <td>Raw data (BYO pipeline)</td>
      <td>Embeddings, RAG-ready, structured</td>
    </tr>
  </tbody>
</table>

<p>OpenIndex is not a replacement for search engines or web archives. It is a complement — providing the open intelligence layer that neither commercial search nor traditional archives offer.</p>

<hr>

<h3>Join the Mission</h3>
<p>OpenIndex is only as strong as its community. There are many ways to get involved:</p>
<ul>
  <li><strong>Use the data</strong> -- Build something with OpenIndex and tell us about it.</li>
  <li><strong>Contribute code</strong> -- See our <a href="/contributing">Contributing Guide</a> to get started.</li>
  <li><strong>Collaborate</strong> -- Partner with us on data, compute, or research. See <a href="/collaborators">Collaborators</a>.</li>
  <li><strong>Spread the word</strong> -- Tell colleagues, students, and peers about OpenIndex.</li>
  <li><strong>Donate</strong> -- Financial contributions fund crawling infrastructure and engineering time.</li>
</ul>

<p>Questions? Reach out at <a href="mailto:hello@openindex.org">hello@openindex.org</a> or join our <a href="https://discord.gg/openindex">Discord</a>.</p>
`
