export const apiReferencePage = `
<h2>Base URL</h2>
<pre><code>https://api.openindex.org/v1</code></pre>

<p>All API endpoints are served over HTTPS. HTTP requests are automatically redirected to HTTPS.</p>

<h2>Authentication</h2>
<p>Include your API key in the <code>Authorization</code> header:</p>

<pre><code>Authorization: Bearer oi_your_api_key_here</code></pre>

<p>Basic access (search, URL lookup, domain browse) is available without authentication at reduced rate limits. Vector search, knowledge graph queries, and bulk operations require an API key.</p>

<div class="note">
  Get a free API key at <a href="https://openindex.org/api-key">openindex.org/api-key</a>. No credit card required. Free keys include 10,000 requests per minute.
</div>

<h2>Rate Limits</h2>
<table>
  <thead>
    <tr>
      <th>Tier</th>
      <th>Rate Limit</th>
      <th>Daily Limit</th>
      <th>Vector Search</th>
      <th>Graph Queries</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Anonymous</strong></td>
      <td>100 req/min</td>
      <td>5,000</td>
      <td>No</td>
      <td>No</td>
    </tr>
    <tr>
      <td><strong>Free</strong></td>
      <td>1,000 req/min</td>
      <td>100,000</td>
      <td>Yes</td>
      <td>Yes</td>
    </tr>
    <tr>
      <td><strong>Pro</strong></td>
      <td>10,000 req/min</td>
      <td>Unlimited</td>
      <td>Yes</td>
      <td>Yes</td>
    </tr>
    <tr>
      <td><strong>Enterprise</strong></td>
      <td>Custom</td>
      <td>Unlimited</td>
      <td>Yes</td>
      <td>Yes</td>
    </tr>
  </tbody>
</table>

<p>Rate limit headers are included in every response:</p>
<pre><code>X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 847
X-RateLimit-Reset: 1708934400</code></pre>

<hr>

<h2>Endpoints</h2>

<h3>Search</h3>
<div class="endpoint">
  <div class="endpoint-header">
    <span class="endpoint-method method-get">GET</span>
    <span class="endpoint-path">/v1/search</span>
  </div>
  <div class="endpoint-body">
    <p>Full-text search across the entire index. Returns pages matching the query, ranked by relevance.</p>
    <h4>Parameters</h4>
    <table>
      <thead>
        <tr>
          <th>Parameter</th>
          <th>Type</th>
          <th>Required</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><code>q</code></td>
          <td>string</td>
          <td>Yes</td>
          <td>Search query. Supports boolean operators (AND, OR, NOT) and phrase matching ("exact phrase").</td>
        </tr>
        <tr>
          <td><code>limit</code></td>
          <td>integer</td>
          <td>No</td>
          <td>Number of results to return (default: 10, max: 1000).</td>
        </tr>
        <tr>
          <td><code>offset</code></td>
          <td>integer</td>
          <td>No</td>
          <td>Pagination offset (default: 0).</td>
        </tr>
        <tr>
          <td><code>crawl</code></td>
          <td>string</td>
          <td>No</td>
          <td>Limit to a specific crawl (e.g., OI-2026-02). Default: latest.</td>
        </tr>
        <tr>
          <td><code>language</code></td>
          <td>string</td>
          <td>No</td>
          <td>Filter by language (ISO 639-1 code, e.g., "en", "de", "ja").</td>
        </tr>
        <tr>
          <td><code>domain</code></td>
          <td>string</td>
          <td>No</td>
          <td>Filter to a specific domain.</td>
        </tr>
        <tr>
          <td><code>sort</code></td>
          <td>string</td>
          <td>No</td>
          <td>Sort order: "relevance" (default), "date", "size".</td>
        </tr>
      </tbody>
    </table>
    <h4>Example Request</h4>
<pre><code>curl "https://api.openindex.org/v1/search?q=machine+learning&language=en&limit=5" \\
  -H "Authorization: Bearer oi_your_api_key"</code></pre>
    <h4>Example Response</h4>
<pre><code>{
  "results": [
    {
      "url": "https://example.com/ml-guide",
      "title": "A Practical Guide to Machine Learning",
      "snippet": "Machine learning is a subset of artificial intelligence that...",
      "domain": "example.com",
      "language": "en",
      "content_length": 34521,
      "timestamp": "2026-02-14T12:00:00Z",
      "crawl": "OI-2026-02",
      "score": 0.947
    }
  ],
  "total": 284729,
  "offset": 0,
  "limit": 5,
  "crawl": "OI-2026-02"
}</code></pre>
  </div>
</div>

<h3>URL Lookup</h3>
<div class="endpoint">
  <div class="endpoint-header">
    <span class="endpoint-method method-get">GET</span>
    <span class="endpoint-path">/v1/url</span>
  </div>
  <div class="endpoint-body">
    <p>Look up a specific URL in the index. Returns all available metadata and WARC file location for direct retrieval.</p>
    <h4>Parameters</h4>
    <table>
      <thead>
        <tr>
          <th>Parameter</th>
          <th>Type</th>
          <th>Required</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><code>url</code></td>
          <td>string</td>
          <td>Yes</td>
          <td>The URL to look up.</td>
        </tr>
        <tr>
          <td><code>crawl</code></td>
          <td>string</td>
          <td>No</td>
          <td>Specific crawl to query. Default: latest.</td>
        </tr>
        <tr>
          <td><code>all</code></td>
          <td>boolean</td>
          <td>No</td>
          <td>Return results from all crawls (default: false).</td>
        </tr>
      </tbody>
    </table>
    <h4>Example Request</h4>
<pre><code>curl "https://api.openindex.org/v1/url?url=https://example.com/article" \\
  -H "Authorization: Bearer oi_your_api_key"</code></pre>
    <h4>Example Response</h4>
<pre><code>{
  "url": "https://example.com/article",
  "title": "Example Article",
  "status_code": 200,
  "content_type": "text/html; charset=utf-8",
  "content_length": 45230,
  "language": "en",
  "charset": "utf-8",
  "timestamp": "2026-02-15T08:30:00Z",
  "crawl": "OI-2026-02",
  "digest": "sha256:e3b0c44298fc1c149afbf4c8996fb924...",
  "warc": {
    "file": "OI-2026-02-00142.warc.gz",
    "offset": 53847234,
    "length": 45247
  }
}</code></pre>
  </div>
</div>

<h3>Domain Browse</h3>
<div class="endpoint">
  <div class="endpoint-header">
    <span class="endpoint-method method-get">GET</span>
    <span class="endpoint-path">/v1/domain</span>
  </div>
  <div class="endpoint-body">
    <p>List all crawled URLs for a given domain, with optional filtering and pagination.</p>
    <h4>Parameters</h4>
    <table>
      <thead>
        <tr>
          <th>Parameter</th>
          <th>Type</th>
          <th>Required</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><code>domain</code></td>
          <td>string</td>
          <td>Yes</td>
          <td>The domain to browse (e.g., "wikipedia.org").</td>
        </tr>
        <tr>
          <td><code>prefix</code></td>
          <td>string</td>
          <td>No</td>
          <td>URL path prefix filter (e.g., "/wiki/").</td>
        </tr>
        <tr>
          <td><code>limit</code></td>
          <td>integer</td>
          <td>No</td>
          <td>Number of results (default: 100, max: 10000).</td>
        </tr>
        <tr>
          <td><code>offset</code></td>
          <td>integer</td>
          <td>No</td>
          <td>Pagination offset.</td>
        </tr>
        <tr>
          <td><code>crawl</code></td>
          <td>string</td>
          <td>No</td>
          <td>Specific crawl to query.</td>
        </tr>
      </tbody>
    </table>
    <h4>Example Request</h4>
<pre><code>curl "https://api.openindex.org/v1/domain?domain=wikipedia.org&prefix=/wiki/&limit=5" \\
  -H "Authorization: Bearer oi_your_api_key"</code></pre>
    <h4>Example Response</h4>
<pre><code>{
  "domain": "wikipedia.org",
  "total": 89472013,
  "results": [
    {
      "url": "https://en.wikipedia.org/wiki/Machine_learning",
      "title": "Machine learning - Wikipedia",
      "content_length": 287431,
      "language": "en",
      "timestamp": "2026-02-14T06:15:00Z"
    }
  ],
  "offset": 0,
  "limit": 5
}</code></pre>
  </div>
</div>

<h3>Vector Search</h3>
<div class="endpoint">
  <div class="endpoint-header">
    <span class="endpoint-method method-post">POST</span>
    <span class="endpoint-path">/v1/vector/search</span>
  </div>
  <div class="endpoint-body">
    <p>Semantic search using dense vector embeddings. Find pages by meaning rather than exact keywords. Requires authentication.</p>
    <h4>Request Body (JSON)</h4>
    <table>
      <thead>
        <tr>
          <th>Field</th>
          <th>Type</th>
          <th>Required</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><code>query</code></td>
          <td>string</td>
          <td>Yes*</td>
          <td>Natural language query (will be embedded automatically).</td>
        </tr>
        <tr>
          <td><code>vector</code></td>
          <td>float[]</td>
          <td>Yes*</td>
          <td>Pre-computed embedding vector (1024 dimensions). Use instead of query.</td>
        </tr>
        <tr>
          <td><code>limit</code></td>
          <td>integer</td>
          <td>No</td>
          <td>Number of results (default: 10, max: 100).</td>
        </tr>
        <tr>
          <td><code>threshold</code></td>
          <td>float</td>
          <td>No</td>
          <td>Minimum similarity score (0.0 to 1.0, default: 0.5).</td>
        </tr>
        <tr>
          <td><code>language</code></td>
          <td>string</td>
          <td>No</td>
          <td>Filter by language.</td>
        </tr>
        <tr>
          <td><code>domain</code></td>
          <td>string</td>
          <td>No</td>
          <td>Filter to a specific domain.</td>
        </tr>
        <tr>
          <td><code>granularity</code></td>
          <td>string</td>
          <td>No</td>
          <td>"page" (default) or "paragraph" (beta).</td>
        </tr>
      </tbody>
    </table>
    <p><em>* Provide either <code>query</code> or <code>vector</code>, not both.</em></p>
    <h4>Example Request</h4>
<pre><code>curl -X POST "https://api.openindex.org/v1/vector/search" \\
  -H "Authorization: Bearer oi_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "how do transformers work in deep learning",
    "limit": 5,
    "language": "en"
  }'</code></pre>
    <h4>Example Response</h4>
<pre><code>{
  "results": [
    {
      "url": "https://example.com/transformer-architecture",
      "title": "The Transformer Architecture Explained",
      "snippet": "The transformer model relies entirely on self-attention...",
      "similarity": 0.934,
      "language": "en",
      "crawl": "OI-2026-02"
    },
    {
      "url": "https://example.com/attention-mechanism",
      "title": "Understanding Attention in Neural Networks",
      "snippet": "Attention mechanisms allow models to focus on...",
      "similarity": 0.891,
      "language": "en",
      "crawl": "OI-2026-02"
    }
  ],
  "model": "multilingual-e5-large",
  "dimensions": 1024
}</code></pre>
  </div>
</div>

<h3>Knowledge Graph: Entity Lookup</h3>
<div class="endpoint">
  <div class="endpoint-header">
    <span class="endpoint-method method-get">GET</span>
    <span class="endpoint-path">/v1/graph/entity</span>
  </div>
  <div class="endpoint-body">
    <p>Look up an entity in the knowledge graph by name or ID. Returns entity properties and relationships. Requires authentication.</p>
    <h4>Parameters</h4>
    <table>
      <thead>
        <tr>
          <th>Parameter</th>
          <th>Type</th>
          <th>Required</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><code>name</code></td>
          <td>string</td>
          <td>Yes*</td>
          <td>Entity name to search for.</td>
        </tr>
        <tr>
          <td><code>id</code></td>
          <td>string</td>
          <td>Yes*</td>
          <td>Entity ID (e.g., "oi:entity:q42").</td>
        </tr>
        <tr>
          <td><code>type</code></td>
          <td>string</td>
          <td>No</td>
          <td>Filter by entity type (Person, Organization, Place, etc.).</td>
        </tr>
        <tr>
          <td><code>include_relationships</code></td>
          <td>boolean</td>
          <td>No</td>
          <td>Include relationships in response (default: true).</td>
        </tr>
      </tbody>
    </table>
    <p><em>* Provide either <code>name</code> or <code>id</code>.</em></p>
    <h4>Example Request</h4>
<pre><code>curl "https://api.openindex.org/v1/graph/entity?name=Alan+Turing&type=Person" \\
  -H "Authorization: Bearer oi_your_api_key"</code></pre>
    <h4>Example Response</h4>
<pre><code>{
  "entity": {
    "id": "oi:entity:alan-turing",
    "name": "Alan Turing",
    "type": "Person",
    "description": "British mathematician and computer scientist",
    "properties": {
      "birthDate": "1912-06-23",
      "deathDate": "1954-06-07",
      "nationality": "British",
      "field": ["Mathematics", "Computer Science", "Cryptanalysis"]
    },
    "relationships": [
      {"predicate": "workedAt", "object": "oi:entity:bletchley-park", "objectName": "Bletchley Park"},
      {"predicate": "inventorOf", "object": "oi:entity:turing-machine", "objectName": "Turing Machine"},
      {"predicate": "alumniOf", "object": "oi:entity:cambridge", "objectName": "University of Cambridge"}
    ],
    "source_count": 47823,
    "confidence": 0.99
  }
}</code></pre>
  </div>
</div>

<h3>Knowledge Graph: Traverse</h3>
<div class="endpoint">
  <div class="endpoint-header">
    <span class="endpoint-method method-get">GET</span>
    <span class="endpoint-path">/v1/graph/traverse</span>
  </div>
  <div class="endpoint-body">
    <p>Traverse the knowledge graph starting from an entity. Follow relationships to discover connected entities. Requires authentication.</p>
    <h4>Parameters</h4>
    <table>
      <thead>
        <tr>
          <th>Parameter</th>
          <th>Type</th>
          <th>Required</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><code>id</code></td>
          <td>string</td>
          <td>Yes</td>
          <td>Starting entity ID.</td>
        </tr>
        <tr>
          <td><code>predicate</code></td>
          <td>string</td>
          <td>No</td>
          <td>Filter by relationship type (e.g., "workedAt", "authorOf").</td>
        </tr>
        <tr>
          <td><code>direction</code></td>
          <td>string</td>
          <td>No</td>
          <td>"outgoing" (default), "incoming", or "both".</td>
        </tr>
        <tr>
          <td><code>depth</code></td>
          <td>integer</td>
          <td>No</td>
          <td>Traversal depth (default: 1, max: 5).</td>
        </tr>
        <tr>
          <td><code>limit</code></td>
          <td>integer</td>
          <td>No</td>
          <td>Maximum nodes to return (default: 50, max: 500).</td>
        </tr>
      </tbody>
    </table>
    <h4>Example Request</h4>
<pre><code>curl "https://api.openindex.org/v1/graph/traverse?id=oi:entity:alan-turing&depth=2&limit=20" \\
  -H "Authorization: Bearer oi_your_api_key"</code></pre>
    <h4>Example Response</h4>
<pre><code>{
  "root": "oi:entity:alan-turing",
  "nodes": [
    {"id": "oi:entity:alan-turing", "name": "Alan Turing", "type": "Person", "depth": 0},
    {"id": "oi:entity:bletchley-park", "name": "Bletchley Park", "type": "Organization", "depth": 1},
    {"id": "oi:entity:enigma", "name": "Enigma Machine", "type": "Artifact", "depth": 2}
  ],
  "edges": [
    {"source": "oi:entity:alan-turing", "target": "oi:entity:bletchley-park", "predicate": "workedAt"},
    {"source": "oi:entity:bletchley-park", "target": "oi:entity:enigma", "predicate": "usedBy"}
  ]
}</code></pre>
  </div>
</div>

<hr>

<h2>Error Codes</h2>
<table>
  <thead>
    <tr>
      <th>Status</th>
      <th>Code</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>400</td>
      <td><code>bad_request</code></td>
      <td>Invalid parameters or malformed request.</td>
    </tr>
    <tr>
      <td>401</td>
      <td><code>unauthorized</code></td>
      <td>Missing or invalid API key.</td>
    </tr>
    <tr>
      <td>403</td>
      <td><code>forbidden</code></td>
      <td>API key does not have access to this endpoint.</td>
    </tr>
    <tr>
      <td>404</td>
      <td><code>not_found</code></td>
      <td>The requested resource was not found.</td>
    </tr>
    <tr>
      <td>429</td>
      <td><code>rate_limited</code></td>
      <td>Rate limit exceeded. Check X-RateLimit-Reset header.</td>
    </tr>
    <tr>
      <td>500</td>
      <td><code>internal_error</code></td>
      <td>Server error. Retry with exponential backoff.</td>
    </tr>
    <tr>
      <td>503</td>
      <td><code>service_unavailable</code></td>
      <td>Service temporarily unavailable. Check <a href="/status">status page</a>.</td>
    </tr>
  </tbody>
</table>

<p>Error responses follow a consistent format:</p>
<pre><code>{
  "error": {
    "code": "rate_limited",
    "message": "Rate limit exceeded. Please retry after 1708934400.",
    "retry_after": 60
  }
}</code></pre>

<hr>

<h2>Pagination</h2>
<p>List endpoints support offset-based pagination using the <code>offset</code> and <code>limit</code> parameters. The response includes a <code>total</code> field indicating the total number of matching results.</p>

<pre><code># First page
curl "https://api.openindex.org/v1/search?q=rust+programming&limit=10&offset=0"

# Second page
curl "https://api.openindex.org/v1/search?q=rust+programming&limit=10&offset=10"

# Third page
curl "https://api.openindex.org/v1/search?q=rust+programming&limit=10&offset=20"</code></pre>

<div class="note note-warn">
  For deep pagination (offset > 10,000), use the <code>scroll</code> parameter instead. Deep offset-based pagination is inefficient and may time out.
</div>

<h3>Scroll Pagination</h3>
<pre><code># First request returns a scroll_id
curl "https://api.openindex.org/v1/search?q=rust+programming&limit=100&scroll=true"

# Subsequent requests use the scroll_id
curl "https://api.openindex.org/v1/search?scroll_id=dXNlcjpzY3JvbGxfaWQ..."</code></pre>

<hr>

<h2>SDKs</h2>
<p>Official client libraries are available for Python, Go, and JavaScript.</p>

<div class="card-grid">
  <div class="card">
    <h3>Python</h3>
<pre><code>pip install openindex

from openindex import Client

client = Client("oi_your_api_key")
results = client.search("climate change", limit=10)
for r in results:
    print(r.title, r.url)</code></pre>
  </div>
  <div class="card">
    <h3>Go</h3>
<pre><code>go get github.com/openindex/go-client

client := openindex.NewClient("oi_your_api_key")
results, err := client.Search(ctx, openindex.SearchParams{
    Query: "climate change",
    Limit: 10,
})
for _, r := range results {
    fmt.Println(r.Title, r.URL)
}</code></pre>
  </div>
  <div class="card">
    <h3>JavaScript / TypeScript</h3>
<pre><code>npm install @openindex/client

import { OpenIndex } from '@openindex/client';

const client = new OpenIndex('oi_your_api_key');
const results = await client.search('climate change', { limit: 10 });
results.forEach(r => console.log(r.title, r.url));</code></pre>
  </div>
</div>
`
