export const knowledgeGraphPage = `
<h2>What is the OpenIndex Knowledge Graph?</h2>
<p>The OpenIndex Knowledge Graph is a structured representation of entities, relationships, and facts extracted from the open web. It goes beyond traditional web graphs (which only capture hyperlinks between pages) to model the semantic meaning of web content -- the people, organizations, places, topics, and events described across billions of pages.</p>

<p>The knowledge graph has two major components:</p>
<ul>
  <li><strong>Web Graph</strong> -- Host-level and domain-level link graphs derived from hyperlink analysis, similar to Common Crawl's web graph datasets.</li>
  <li><strong>Entity Graph</strong> -- Semantic relationships between named entities (people, organizations, places, etc.) extracted from page content using NER, Schema.org parsing, and link analysis.</li>
</ul>

<h2>Entity Types</h2>
<p>The knowledge graph recognizes the following core entity types, aligned with the <a href="/ontology">OpenIndex Ontology</a>:</p>

<table>
  <thead>
    <tr>
      <th>Entity Type</th>
      <th>Description</th>
      <th>Example</th>
      <th>Count (OI-2026-02)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Person</strong></td>
      <td>Named individuals</td>
      <td>Ada Lovelace, Linus Torvalds</td>
      <td>1.8 billion</td>
    </tr>
    <tr>
      <td><strong>Organization</strong></td>
      <td>Companies, institutions, agencies, NGOs</td>
      <td>Mozilla Foundation, CERN</td>
      <td>920 million</td>
    </tr>
    <tr>
      <td><strong>Location</strong></td>
      <td>Geographic places, addresses, regions</td>
      <td>Geneva, Switzerland</td>
      <td>640 million</td>
    </tr>
    <tr>
      <td><strong>Topic</strong></td>
      <td>Subjects, fields of study, themes</td>
      <td>Machine Learning, Climate Science</td>
      <td>380 million</td>
    </tr>
    <tr>
      <td><strong>Event</strong></td>
      <td>Conferences, incidents, historical events</td>
      <td>NeurIPS 2025, World Cup 2026</td>
      <td>210 million</td>
    </tr>
    <tr>
      <td><strong>Product</strong></td>
      <td>Software, hardware, commercial products</td>
      <td>PostgreSQL, iPhone 17</td>
      <td>450 million</td>
    </tr>
  </tbody>
</table>

<h2>Relationship Types</h2>
<p>Entities are connected by typed, directed relationships. Each relationship has a source entity, a target entity, a type, a confidence score, and provenance (the page URL where the relationship was extracted).</p>

<table>
  <thead>
    <tr>
      <th>Relationship</th>
      <th>Source Type</th>
      <th>Target Type</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>mentions</code></td>
      <td>WebPage</td>
      <td>Any Entity</td>
      <td>A page mentions an entity</td>
    </tr>
    <tr>
      <td><code>affiliatedWith</code></td>
      <td>Person</td>
      <td>Organization</td>
      <td>Person is affiliated with an organization</td>
    </tr>
    <tr>
      <td><code>locatedIn</code></td>
      <td>Organization / Event</td>
      <td>Location</td>
      <td>Entity is located in or takes place at a location</td>
    </tr>
    <tr>
      <td><code>relatedTo</code></td>
      <td>Any Entity</td>
      <td>Any Entity</td>
      <td>General semantic relationship</td>
    </tr>
    <tr>
      <td><code>worksOn</code></td>
      <td>Person</td>
      <td>Topic / Product</td>
      <td>Person works on a topic or product</td>
    </tr>
    <tr>
      <td><code>partOf</code></td>
      <td>Organization</td>
      <td>Organization</td>
      <td>Subsidiary or division relationship</td>
    </tr>
    <tr>
      <td><code>createdBy</code></td>
      <td>Product / CreativeWork</td>
      <td>Person / Organization</td>
      <td>Creator or author relationship</td>
    </tr>
    <tr>
      <td><code>occuredAt</code></td>
      <td>Event</td>
      <td>Location</td>
      <td>Event took place at a location</td>
    </tr>
    <tr>
      <td><code>participatedIn</code></td>
      <td>Person / Organization</td>
      <td>Event</td>
      <td>Participation in an event</td>
    </tr>
    <tr>
      <td><code>linksTo</code></td>
      <td>WebPage</td>
      <td>WebPage</td>
      <td>Hyperlink relationship (web graph)</td>
    </tr>
    <tr>
      <td><code>sameAs</code></td>
      <td>Any Entity</td>
      <td>Any Entity</td>
      <td>Entity resolution (same real-world entity)</td>
    </tr>
  </tbody>
</table>

<h2>Web Graph</h2>
<p>The web graph component captures the hyperlink structure of the web at two granularity levels:</p>

<div class="card-grid">
  <div class="card">
    <h3>Host-Level Graph</h3>
    <p>Nodes represent individual hosts (e.g., <code>www.example.com</code>, <code>blog.example.com</code>). Edges represent the existence of at least one hyperlink from a page on the source host to a page on the target host. Edge weights indicate the number of linking pages.</p>
  </div>
  <div class="card">
    <h3>Domain-Level Graph</h3>
    <p>Nodes represent registered domains (e.g., <code>example.com</code>). Edges aggregate all host-level links between the source and target domains. This is a more compact representation useful for domain authority analysis.</p>
  </div>
</div>

<h3>Web Graph Schema</h3>
<pre><code># Host-level graph (TSV format)
# source_host    target_host    link_count    page_count
www.example.com    docs.python.org    342    89
blog.example.com    github.com    1205    412

# Domain-level graph (TSV format)
# source_domain    target_domain    host_pairs    total_links
example.com    python.org    3    1580
example.com    github.com    2    2847</code></pre>

<h3>Web Graph Statistics (OI-2026-02)</h3>
<table>
  <thead>
    <tr>
      <th>Metric</th>
      <th>Host-Level</th>
      <th>Domain-Level</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Nodes</td>
      <td>185 million</td>
      <td>42 million</td>
    </tr>
    <tr>
      <td>Edges</td>
      <td>12.4 billion</td>
      <td>2.1 billion</td>
    </tr>
    <tr>
      <td>Avg out-degree</td>
      <td>67</td>
      <td>50</td>
    </tr>
    <tr>
      <td>File size (compressed)</td>
      <td>48 GB</td>
      <td>8.5 GB</td>
    </tr>
  </tbody>
</table>

<h2>Entity Graph</h2>
<p>The entity graph captures semantic relationships between named entities extracted from web content. Unlike the web graph, which models page-to-page links, the entity graph models real-world relationships between people, organizations, places, and concepts.</p>

<h3>Entity Graph Statistics (OI-2026-02)</h3>
<table>
  <thead>
    <tr>
      <th>Metric</th>
      <th>Value</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Total entities</td>
      <td>4.4 billion</td>
    </tr>
    <tr>
      <td>Unique entities (after dedup)</td>
      <td>890 million</td>
    </tr>
    <tr>
      <td>Relationships</td>
      <td>10.2 billion</td>
    </tr>
    <tr>
      <td>Avg relationships per entity</td>
      <td>11.5</td>
    </tr>
    <tr>
      <td>Entity types</td>
      <td>6</td>
    </tr>
    <tr>
      <td>Relationship types</td>
      <td>11</td>
    </tr>
  </tbody>
</table>

<h2>Entity Extraction Pipeline</h2>
<p>Entities and relationships are extracted using a multi-stage pipeline:</p>

<details>
  <summary>Named Entity Recognition (NER)</summary>
  <div class="details-body">
    <p>A multilingual NER model identifies entity mentions in page text. The model recognizes Person, Organization, Location, and miscellaneous entity types across 100+ languages. Entity mentions are linked to canonical entity IDs through entity resolution.</p>
  </div>
</details>

<details>
  <summary>Schema.org Parsing</summary>
  <div class="details-body">
    <p>Pages containing structured data markup (JSON-LD, Microdata, RDFa) are parsed to extract typed entities. Schema.org types map directly to OpenIndex entity types (e.g., <code>schema:Person</code> to Person, <code>schema:Organization</code> to Organization). This provides high-confidence entity data with explicit properties.</p>
  </div>
</details>

<details>
  <summary>Link Analysis</summary>
  <div class="details-body">
    <p>Anchor text analysis extracts relationships from hyperlinks. For example, a link with anchor text "Mozilla Foundation" pointing to <code>mozilla.org</code> creates an Organization entity linked to that domain. Outgoing links from entity pages (e.g., Wikipedia articles) are used to discover relationships between entities.</p>
  </div>
</details>

<details>
  <summary>Relationship Extraction</summary>
  <div class="details-body">
    <p>A relation extraction model identifies relationships between co-occurring entities within the same sentence or paragraph. For example, "Ada Lovelace worked at the University of London" produces a <code>(Person: Ada Lovelace) -[affiliatedWith]-> (Organization: University of London)</code> relationship.</p>
  </div>
</details>

<details>
  <summary>Entity Resolution</summary>
  <div class="details-body">
    <p>Multiple mentions of the same real-world entity are merged using string similarity, context matching, and link-based signals. For example, "Google", "Google LLC", and "Alphabet's Google" are resolved to a single entity. The <code>sameAs</code> relationship links resolved entities to external identifiers (Wikidata QIDs, DBpedia URIs).</p>
  </div>
</details>

<h2>Query API</h2>
<p>The knowledge graph can be queried through a REST API that supports entity lookup, relationship traversal, and graph pattern matching.</p>

<div class="endpoint">
  <div class="endpoint-header">
    <span class="endpoint-method method-get">GET</span>
    <span class="endpoint-path">/v1/graph/entity/{entity_id}</span>
  </div>
  <div class="endpoint-body">
    <p>Look up an entity by its canonical ID. Returns the entity's properties and immediate relationships.</p>
  </div>
</div>

<pre><code>curl "https://api.openindex.org/v1/graph/entity/org:mozilla_foundation"

{
  "id": "org:mozilla_foundation",
  "type": "Organization",
  "name": "Mozilla Foundation",
  "aliases": ["Mozilla", "Mozilla Corp"],
  "properties": {
    "url": "https://mozilla.org",
    "founded": "2003",
    "location": "San Francisco, CA"
  },
  "relationships": [
    {"type": "locatedIn", "target": "loc:san_francisco", "confidence": 0.98},
    {"type": "createdBy", "source": "product:firefox", "confidence": 0.99},
    {"type": "partOf", "target": "org:mozilla_corporation", "confidence": 0.95}
  ],
  "mentions": 284930,
  "sources": 12847
}</code></pre>

<div class="endpoint">
  <div class="endpoint-header">
    <span class="endpoint-method method-get">GET</span>
    <span class="endpoint-path">/v1/graph/search?q={query}&type={entity_type}</span>
  </div>
  <div class="endpoint-body">
    <p>Search for entities by name or properties. Filter by entity type.</p>
  </div>
</div>

<pre><code>curl "https://api.openindex.org/v1/graph/search?q=mozilla&type=Organization"

{
  "results": [
    {"id": "org:mozilla_foundation", "name": "Mozilla Foundation", "type": "Organization", "mentions": 284930},
    {"id": "org:mozilla_corporation", "name": "Mozilla Corporation", "type": "Organization", "mentions": 142580}
  ]
}</code></pre>

<div class="endpoint">
  <div class="endpoint-header">
    <span class="endpoint-method method-post">POST</span>
    <span class="endpoint-path">/v1/graph/traverse</span>
  </div>
  <div class="endpoint-body">
    <p>Traverse the graph from a starting entity, following specified relationship types up to a given depth.</p>
  </div>
</div>

<pre><code>curl -X POST "https://api.openindex.org/v1/graph/traverse" \\
  -H "Content-Type: application/json" \\
  -d '{
    "start": "person:linus_torvalds",
    "relationships": ["affiliatedWith", "worksOn", "createdBy"],
    "direction": "both",
    "depth": 2,
    "limit": 50
  }'

{
  "nodes": [
    {"id": "person:linus_torvalds", "type": "Person", "name": "Linus Torvalds"},
    {"id": "product:linux", "type": "Product", "name": "Linux"},
    {"id": "product:git", "type": "Product", "name": "Git"},
    {"id": "org:linux_foundation", "type": "Organization", "name": "Linux Foundation"}
  ],
  "edges": [
    {"source": "product:linux", "target": "person:linus_torvalds", "type": "createdBy"},
    {"source": "product:git", "target": "person:linus_torvalds", "type": "createdBy"},
    {"source": "person:linus_torvalds", "target": "org:linux_foundation", "type": "affiliatedWith"}
  ]
}</code></pre>

<h2>Export Formats</h2>
<p>The knowledge graph can be exported in multiple standard formats for use in external tools and systems:</p>

<table>
  <thead>
    <tr>
      <th>Format</th>
      <th>Extension</th>
      <th>Use Case</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>JSON-LD</strong></td>
      <td><code>.jsonld</code></td>
      <td>Web-native linked data, Schema.org compatible</td>
    </tr>
    <tr>
      <td><strong>RDF/Turtle</strong></td>
      <td><code>.ttl</code></td>
      <td>Compact RDF serialization for triple stores</td>
    </tr>
    <tr>
      <td><strong>N-Triples</strong></td>
      <td><code>.nt</code></td>
      <td>Line-based RDF for streaming and bulk import</td>
    </tr>
    <tr>
      <td><strong>GraphML</strong></td>
      <td><code>.graphml</code></td>
      <td>XML-based graph format for Gephi, NetworkX, etc.</td>
    </tr>
    <tr>
      <td><strong>JSONL</strong></td>
      <td><code>.jsonl.gz</code></td>
      <td>Line-delimited JSON for simple processing</td>
    </tr>
    <tr>
      <td><strong>TSV</strong></td>
      <td><code>.tsv.gz</code></td>
      <td>Tab-separated values for web graph data</td>
    </tr>
  </tbody>
</table>

<h3>Download</h3>
<pre><code># Download entity graph (JSON-LD, 82 GB compressed)
wget https://data.openindex.org/OI-2026-02/graph/entities.jsonld.gz

# Download web graph - host level (TSV, 48 GB compressed)
wget https://data.openindex.org/OI-2026-02/graph/webgraph-host.tsv.gz

# Download web graph - domain level (TSV, 8.5 GB compressed)
wget https://data.openindex.org/OI-2026-02/graph/webgraph-domain.tsv.gz

# Download relationships (N-Triples, 120 GB compressed)
wget https://data.openindex.org/OI-2026-02/graph/relationships.nt.gz</code></pre>

<h2>Use Cases</h2>
<div class="card-grid">
  <div class="card">
    <h3>Link Analysis</h3>
    <p>Compute PageRank, HITS, or custom authority metrics on the web graph. Identify influential domains, detect link farms, and analyze the structure of the web.</p>
  </div>
  <div class="card">
    <h3>Entity Resolution</h3>
    <p>Match and merge entity mentions across millions of pages. Build comprehensive profiles of people, organizations, and products from diverse web sources.</p>
  </div>
  <div class="card">
    <h3>Knowledge Base Construction</h3>
    <p>Use the entity graph as a foundation for building domain-specific knowledge bases. Combine with your own data for enrichment.</p>
  </div>
  <div class="card">
    <h3>Research and Analysis</h3>
    <p>Study information diffusion, track how topics spread across the web, analyze organizational networks, and conduct web-scale social research.</p>
  </div>
</div>
`
