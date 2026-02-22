export const vectorSearchPage = `
<h2>What is Vector Search?</h2>
<p>Vector search enables finding web pages by meaning rather than by exact keyword matches. Instead of looking for pages that contain specific words, vector search finds pages whose content is semantically similar to your query -- even if they use completely different terminology.</p>

<p>Traditional keyword search answers the question "which pages contain these words?" Vector search answers the question "which pages are about this concept?"</p>

<div class="card-grid">
  <div class="card">
    <h3>Keyword Search</h3>
    <p>Query: <code>"automobile safety regulations"</code></p>
    <p>Finds pages containing those exact terms. Misses pages about "car crash standards" or "vehicle protection laws" that use different words for the same concept.</p>
  </div>
  <div class="card">
    <h3>Vector Search</h3>
    <p>Query: <code>"automobile safety regulations"</code></p>
    <p>Finds pages about the concept of vehicle safety rules, regardless of the specific words used. Also returns pages about "car crash standards", "NHTSA requirements", and "EU vehicle safety directives".</p>
  </div>
</div>

<h2>How Embeddings Are Generated</h2>
<p>Every crawled page is processed through an embedding model that converts its text content into a dense numerical vector -- a list of 1024 floating-point numbers that encode the page's semantic meaning.</p>

<h3>Embedding Process</h3>
<ol>
  <li><strong>Text extraction</strong> -- Clean plaintext is extracted from the HTML, removing boilerplate, navigation, and ads.</li>
  <li><strong>Input construction</strong> -- The page title and the first 512 tokens of the body text are concatenated to form the input.</li>
  <li><strong>Encoding</strong> -- The input is passed through the <code>multilingual-e5-large</code> model, producing a 1024-dimensional dense vector.</li>
  <li><strong>Normalization</strong> -- The vector is L2-normalized so that cosine similarity can be computed via dot product.</li>
  <li><strong>Indexing</strong> -- The normalized vector is inserted into the Vald distributed vector database.</li>
</ol>

<h3>Embedding Granularity</h3>
<table>
  <thead>
    <tr>
      <th>Level</th>
      <th>Input</th>
      <th>Status</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Per-page</strong></td>
      <td>Title + first 512 tokens</td>
      <td>Available</td>
      <td>One vector per page. Best for page-level search and dedup.</td>
    </tr>
    <tr>
      <td><strong>Per-paragraph</strong></td>
      <td>Individual paragraphs</td>
      <td>Beta</td>
      <td>Multiple vectors per page. Best for passage retrieval and RAG.</td>
    </tr>
  </tbody>
</table>

<div class="note">
  Per-paragraph embeddings are currently in beta. They are available for the latest crawl only and can be accessed by adding <code>granularity=paragraph</code> to vector search API requests.
</div>

<h2>Vector Database: Vald</h2>
<p><a href="https://vald.vdaas.org/">Vald</a> is a distributed approximate nearest neighbor (ANN) search engine developed by Yahoo Japan. OpenIndex uses Vald for its vector index because of its distributed architecture, high throughput, and support for real-time index updates.</p>

<h3>Architecture</h3>
<table>
  <thead>
    <tr>
      <th>Component</th>
      <th>Role</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Vald Agent</strong></td>
      <td>Stores vector data and runs ANN search using NGT (Neighborhood Graph and Tree)</td>
    </tr>
    <tr>
      <td><strong>Vald LB Gateway</strong></td>
      <td>Load balancer that distributes queries across agent nodes</td>
    </tr>
    <tr>
      <td><strong>Vald Discoverer</strong></td>
      <td>Service discovery for agent nodes in the Kubernetes cluster</td>
    </tr>
    <tr>
      <td><strong>Vald Index Manager</strong></td>
      <td>Coordinates index creation and rebalancing across agents</td>
    </tr>
  </tbody>
</table>

<h3>Key Properties</h3>
<ul>
  <li><strong>Algorithm:</strong> NGT-ANNg (Approximate Nearest Neighbor with Graph)</li>
  <li><strong>Dimensions:</strong> 1024</li>
  <li><strong>Index type:</strong> Graph-based ANN with edge pruning</li>
  <li><strong>Replication:</strong> 3x across agent nodes</li>
  <li><strong>Consistency:</strong> Eventual consistency with read-after-write for single vectors</li>
</ul>

<h2>Similarity Metrics</h2>
<p>Vector search supports two distance metrics for finding similar content:</p>

<table>
  <thead>
    <tr>
      <th>Metric</th>
      <th>Range</th>
      <th>Best For</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Cosine Similarity</strong></td>
      <td>[-1, 1]</td>
      <td>Semantic similarity (default)</td>
      <td>Measures the angle between vectors. 1.0 = identical meaning, 0.0 = unrelated. Invariant to vector magnitude.</td>
    </tr>
    <tr>
      <td><strong>L2 Distance</strong></td>
      <td>[0, inf)</td>
      <td>Exact content matching</td>
      <td>Euclidean distance between vectors. 0.0 = identical. Sensitive to vector magnitude.</td>
    </tr>
  </tbody>
</table>

<p>Since all vectors are L2-normalized, cosine similarity is equivalent to dot product, which is the fastest operation. Use cosine similarity unless you have a specific reason to use L2 distance.</p>

<h2>Vector Search API</h2>

<div class="endpoint">
  <div class="endpoint-header">
    <span class="endpoint-method method-post">POST</span>
    <span class="endpoint-path">/v1/vector/search</span>
  </div>
  <div class="endpoint-body">
    <p>Find pages semantically similar to a query. The query can be a text string (auto-embedded by the server) or a raw vector.</p>
    <h4>Request Body</h4>
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
          <td>Text query to embed and search</td>
        </tr>
        <tr>
          <td><code>vector</code></td>
          <td>float[]</td>
          <td>Yes*</td>
          <td>Pre-computed 1024-dim vector (alternative to <code>query</code>)</td>
        </tr>
        <tr>
          <td><code>k</code></td>
          <td>integer</td>
          <td>No</td>
          <td>Number of results (default: 10, max: 1000)</td>
        </tr>
        <tr>
          <td><code>crawl</code></td>
          <td>string</td>
          <td>No</td>
          <td>Crawl ID (default: latest)</td>
        </tr>
        <tr>
          <td><code>metric</code></td>
          <td>string</td>
          <td>No</td>
          <td><code>cosine</code> (default) or <code>l2</code></td>
        </tr>
        <tr>
          <td><code>granularity</code></td>
          <td>string</td>
          <td>No</td>
          <td><code>page</code> (default) or <code>paragraph</code> (beta)</td>
        </tr>
        <tr>
          <td><code>filter</code></td>
          <td>object</td>
          <td>No</td>
          <td>Metadata filters (language, domain, etc.)</td>
        </tr>
      </tbody>
    </table>
    <p>* Exactly one of <code>query</code> or <code>vector</code> must be provided.</p>
  </div>
</div>

<div class="endpoint">
  <div class="endpoint-header">
    <span class="endpoint-method method-post">POST</span>
    <span class="endpoint-path">/v1/vector/embed</span>
  </div>
  <div class="endpoint-body">
    <p>Generate an embedding vector for a text input without searching. Useful for building your own index or computing similarity offline.</p>
  </div>
</div>

<h3>Code Examples</h3>

<h4>Python</h4>
<pre><code>import requests

# Text query (auto-embedded)
response = requests.post(
    "https://api.openindex.org/v1/vector/search",
    headers={"Authorization": "Bearer YOUR_API_KEY"},
    json={
        "query": "sustainable energy solutions for developing countries",
        "k": 20,
        "filter": {"language": "en"}
    }
)

results = response.json()["results"]
for r in results:
    print(f"{r['similarity']:.3f}  {r['url']}")
    print(f"         {r['title']}")
    print()</code></pre>

<h4>Python with Pre-computed Vectors</h4>
<pre><code>import requests
import numpy as np

# Get embedding for offline use
embed_resp = requests.post(
    "https://api.openindex.org/v1/vector/embed",
    headers={"Authorization": "Bearer YOUR_API_KEY"},
    json={"text": "quantum error correction techniques"}
)

vector = embed_resp.json()["vector"]  # 1024-dim float array

# Search with pre-computed vector
search_resp = requests.post(
    "https://api.openindex.org/v1/vector/search",
    headers={"Authorization": "Bearer YOUR_API_KEY"},
    json={
        "vector": vector,
        "k": 10,
        "metric": "cosine"
    }
)

for r in search_resp.json()["results"]:
    print(f"{r['similarity']:.3f}  {r['title']}")</code></pre>

<h4>curl</h4>
<pre><code># Text query
curl -X POST "https://api.openindex.org/v1/vector/search" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "renewable energy policy in Southeast Asia",
    "k": 10,
    "filter": {"language": "en", "domain": "*.gov"}
  }'

# Generate embedding only
curl -X POST "https://api.openindex.org/v1/vector/embed" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"text": "machine learning for drug discovery"}'</code></pre>

<h3>Response Format</h3>
<pre><code>{
  "query": "sustainable energy solutions for developing countries",
  "crawl": "OI-2026-02",
  "metric": "cosine",
  "k": 10,
  "results": [
    {
      "url": "https://example.org/sustainable-energy-report",
      "title": "Sustainable Energy for All: 2026 Progress Report",
      "similarity": 0.962,
      "language": "en",
      "domain": "example.org",
      "fetch_time": "2026-02-10T09:15:00Z"
    },
    {
      "url": "https://undp.org/clean-energy-developing-nations",
      "title": "Clean Energy Transitions in Developing Nations",
      "similarity": 0.948,
      "language": "en",
      "domain": "undp.org",
      "fetch_time": "2026-02-08T14:22:00Z"
    }
  ]
}</code></pre>

<h2>Use Cases</h2>

<div class="card-grid">
  <div class="card">
    <h3>Semantic Deduplication</h3>
    <p>Find near-duplicate pages that have different URLs but semantically identical content. Useful for cleaning datasets, detecting content farms, and reducing redundancy in training data.</p>
  </div>
  <div class="card">
    <h3>Topic Clustering</h3>
    <p>Group pages by semantic similarity to discover topic clusters across the web. Identify emerging trends, map knowledge domains, and understand content ecosystems.</p>
  </div>
  <div class="card">
    <h3>Content Recommendation</h3>
    <p>Given a page or a set of pages, find semantically related content across the entire web. Build recommendation systems without relying on user behavior data.</p>
  </div>
  <div class="card">
    <h3>Retrieval-Augmented Generation (RAG)</h3>
    <p>Use vector search to retrieve relevant web pages as context for large language models. Build factual, grounded AI systems backed by real web content with per-paragraph granularity.</p>
  </div>
</div>

<h2>Performance Characteristics</h2>

<table>
  <thead>
    <tr>
      <th>Metric</th>
      <th>Value</th>
      <th>Notes</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Query latency (p50)</strong></td>
      <td>12 ms</td>
      <td>Text query including embedding generation</td>
    </tr>
    <tr>
      <td><strong>Query latency (p99)</strong></td>
      <td>45 ms</td>
      <td>Text query including embedding generation</td>
    </tr>
    <tr>
      <td><strong>Vector-only latency (p50)</strong></td>
      <td>3 ms</td>
      <td>Pre-computed vector search only</td>
    </tr>
    <tr>
      <td><strong>Throughput</strong></td>
      <td>5,000 QPS</td>
      <td>Sustained across the cluster</td>
    </tr>
    <tr>
      <td><strong>Recall@10</strong></td>
      <td>0.95</td>
      <td>Approximate vs. exact nearest neighbor</td>
    </tr>
    <tr>
      <td><strong>Index size</strong></td>
      <td>~12 TiB per crawl</td>
      <td>2.8B vectors x 1024 dims x float32</td>
    </tr>
    <tr>
      <td><strong>Embedding generation</strong></td>
      <td>~8 ms per text</td>
      <td>GPU-accelerated, batched</td>
    </tr>
  </tbody>
</table>

<div class="note">
  <strong>Rate limits:</strong> The vector search API is rate-limited to 100 requests per minute for free-tier users and 10,000 requests per minute for authenticated users. See the <a href="/api">API Reference</a> for details on authentication and rate limits.
</div>

<h2>Embedding Model Details</h2>
<table>
  <thead>
    <tr>
      <th>Property</th>
      <th>Value</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Model</td>
      <td>multilingual-e5-large</td>
    </tr>
    <tr>
      <td>Dimensions</td>
      <td>1024</td>
    </tr>
    <tr>
      <td>Max tokens</td>
      <td>512</td>
    </tr>
    <tr>
      <td>Languages</td>
      <td>100+</td>
    </tr>
    <tr>
      <td>Normalization</td>
      <td>L2-normalized (unit vectors)</td>
    </tr>
    <tr>
      <td>Training data</td>
      <td>Multilingual web corpus + NLI + retrieval pairs</td>
    </tr>
    <tr>
      <td>License</td>
      <td>MIT</td>
    </tr>
  </tbody>
</table>

<p>The model is hosted on OpenIndex infrastructure. You do not need to run the model yourself -- the API handles embedding generation for text queries automatically. If you prefer to generate embeddings locally, the model is available on <a href="https://huggingface.co/intfloat/multilingual-e5-large">HuggingFace</a>.</p>
`
