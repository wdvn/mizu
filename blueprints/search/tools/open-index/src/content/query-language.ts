export const queryLanguagePage = `
<h2>What is OQL?</h2>
<p>OpenIndex Query Language (OQL) is a SQL-like query language designed for searching and analyzing the OpenIndex corpus. It extends familiar SQL syntax with index-specific functions for full-text search, vector similarity, entity lookup, and graph traversal.</p>

<p>OQL queries can be executed via the API, CLI, or any of the official SDKs.</p>

<pre><code># Via API
curl -X POST "https://api.openindex.org/v1/query" \\
  -H "Authorization: Bearer oi_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"oql": "SELECT url, title FROM index WHERE CONTAINS('\\''deep learning'\\'')"}'

# Via CLI
openindex query "SELECT url, title FROM index WHERE CONTAINS('deep learning') LIMIT 10"</code></pre>

<hr>

<h2>Basic Syntax</h2>
<p>OQL follows standard SQL syntax with <code>SELECT</code>, <code>FROM</code>, <code>WHERE</code>, <code>ORDER BY</code>, and <code>LIMIT</code> clauses.</p>

<h3>SELECT</h3>
<p>Choose which columns to return. Use <code>*</code> for all columns.</p>
<pre><code>SELECT url, title, language, content_length
FROM index
LIMIT 10

-- All columns
SELECT *
FROM index
WHERE domain = 'example.com'
LIMIT 5</code></pre>

<h3>Available Columns</h3>
<table>
  <thead>
    <tr>
      <th>Column</th>
      <th>Type</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr><td><code>url</code></td><td>STRING</td><td>Full URL</td></tr>
    <tr><td><code>domain</code></td><td>STRING</td><td>Registered domain</td></tr>
    <tr><td><code>host</code></td><td>STRING</td><td>Full hostname</td></tr>
    <tr><td><code>tld</code></td><td>STRING</td><td>Top-level domain</td></tr>
    <tr><td><code>title</code></td><td>STRING</td><td>Page title</td></tr>
    <tr><td><code>language</code></td><td>STRING</td><td>Detected language (ISO 639-1)</td></tr>
    <tr><td><code>content_type</code></td><td>STRING</td><td>MIME content type</td></tr>
    <tr><td><code>content_length</code></td><td>INT64</td><td>Body size in bytes</td></tr>
    <tr><td><code>status_code</code></td><td>INT32</td><td>HTTP status code</td></tr>
    <tr><td><code>timestamp</code></td><td>TIMESTAMP</td><td>Crawl timestamp (UTC)</td></tr>
    <tr><td><code>digest</code></td><td>STRING</td><td>Content SHA-256 hash</td></tr>
    <tr><td><code>crawl</code></td><td>STRING</td><td>Crawl identifier</td></tr>
  </tbody>
</table>

<h3>FROM</h3>
<p>The <code>FROM</code> clause specifies the data source. Currently supported sources:</p>
<table>
  <thead>
    <tr>
      <th>Source</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr><td><code>index</code></td><td>The main Parquet columnar index (default, latest crawl)</td></tr>
    <tr><td><code>index('OI-2026-02')</code></td><td>A specific crawl's index</td></tr>
    <tr><td><code>fulltext</code></td><td>Full-text search index (Tantivy)</td></tr>
    <tr><td><code>vectors</code></td><td>Vector embedding index (Vald)</td></tr>
    <tr><td><code>graph</code></td><td>Knowledge graph (Neo4j)</td></tr>
  </tbody>
</table>

<h3>WHERE</h3>
<p>Standard comparison operators are supported alongside index-specific functions.</p>
<pre><code>-- Standard comparisons
SELECT url, title FROM index
WHERE language = 'en'
  AND content_length > 10000
  AND status_code = 200
  AND domain != 'example.com'
LIMIT 100

-- Pattern matching
SELECT url, title FROM index
WHERE url LIKE '%/blog/%'
  AND title LIKE '%machine learning%'
LIMIT 50

-- IN operator
SELECT url, title FROM index
WHERE language IN ('en', 'de', 'fr')
  AND tld IN ('org', 'edu')
LIMIT 100</code></pre>

<h3>ORDER BY</h3>
<pre><code>-- Sort by content length descending
SELECT url, title, content_length FROM index
WHERE language = 'en'
ORDER BY content_length DESC
LIMIT 20

-- Sort by timestamp
SELECT url, title, timestamp FROM index
WHERE domain = 'news.ycombinator.com'
ORDER BY timestamp DESC
LIMIT 50</code></pre>

<h3>LIMIT and OFFSET</h3>
<pre><code>-- First 10 results
SELECT url, title FROM index WHERE language = 'ja' LIMIT 10

-- Skip first 20, return next 10
SELECT url, title FROM index WHERE language = 'ja' LIMIT 10 OFFSET 20</code></pre>

<hr>

<h2>Full-Text Search Operators</h2>
<p>The <code>CONTAINS()</code> function provides full-text search with boolean operators, phrase matching, and wildcards.</p>

<h3>Basic Search</h3>
<pre><code>-- Simple keyword search
SELECT url, title FROM index
WHERE CONTAINS('machine learning')
LIMIT 20

-- Phrase matching (exact order)
SELECT url, title FROM index
WHERE CONTAINS('"artificial general intelligence"')
LIMIT 20</code></pre>

<h3>Boolean Operators</h3>
<table>
  <thead>
    <tr>
      <th>Operator</th>
      <th>Syntax</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr><td><strong>AND</strong></td><td><code>CONTAINS('rust AND programming')</code></td><td>Both terms must appear</td></tr>
    <tr><td><strong>OR</strong></td><td><code>CONTAINS('rust OR golang')</code></td><td>Either term must appear</td></tr>
    <tr><td><strong>NOT</strong></td><td><code>CONTAINS('python NOT snake')</code></td><td>First term present, second absent</td></tr>
    <tr><td><strong>Phrase</strong></td><td><code>CONTAINS('"exact phrase"')</code></td><td>Exact phrase match in order</td></tr>
    <tr><td><strong>Wildcard</strong></td><td><code>CONTAINS('program*')</code></td><td>Prefix matching (programming, programmer, etc.)</td></tr>
    <tr><td><strong>Proximity</strong></td><td><code>CONTAINS('"machine learning"~5')</code></td><td>Terms within 5 words of each other</td></tr>
    <tr><td><strong>Boost</strong></td><td><code>CONTAINS('title:rust^2 programming')</code></td><td>Boost title matches by 2x</td></tr>
  </tbody>
</table>

<h3>Field-Specific Search</h3>
<pre><code>-- Search only in page titles
SELECT url, title FROM index
WHERE CONTAINS('title:quantum computing')
LIMIT 20

-- Search in body text only
SELECT url, title FROM index
WHERE CONTAINS('body:"neural network architecture"')
LIMIT 20

-- Combined field search with boosting
SELECT url, title FROM index
WHERE CONTAINS('title:rust^3 body:programming language')
LIMIT 20</code></pre>

<hr>

<h2>Index-Specific Functions</h2>

<h3>CONTAINS() -- Full-Text Search</h3>
<p>Performs full-text search across indexed content. Returns results ranked by relevance score.</p>
<pre><code>SELECT url, title, SCORE() as relevance
FROM fulltext
WHERE CONTAINS('renewable energy policy')
ORDER BY relevance DESC
LIMIT 20</code></pre>

<h3>SIMILAR_TO() -- Vector Similarity Search</h3>
<p>Finds pages semantically similar to a natural language query or a reference URL using vector embeddings.</p>
<pre><code>-- Search by natural language query
SELECT url, title, SIMILARITY() as score
FROM vectors
WHERE SIMILAR_TO('how do large language models work')
  AND language = 'en'
ORDER BY score DESC
LIMIT 10

-- Find pages similar to a reference URL
SELECT url, title, SIMILARITY() as score
FROM vectors
WHERE SIMILAR_TO(URL 'https://example.com/transformers-explained')
ORDER BY score DESC
LIMIT 10

-- Specify similarity threshold
SELECT url, title, SIMILARITY() as score
FROM vectors
WHERE SIMILAR_TO('quantum computing applications', THRESHOLD 0.8)
LIMIT 20</code></pre>

<h3>ENTITY() -- Entity Lookup</h3>
<p>Finds entities in the knowledge graph by name, type, or properties.</p>
<pre><code>-- Find an entity by name
SELECT * FROM graph
WHERE ENTITY(name = 'Albert Einstein')

-- Find entities by type
SELECT name, type, description FROM graph
WHERE ENTITY(type = 'Organization', property.country = 'Germany')
LIMIT 50

-- Find entities mentioned on a specific page
SELECT name, type, confidence FROM graph
WHERE ENTITY(source_url = 'https://example.com/article')
LIMIT 100</code></pre>

<h3>GRAPH_PATH() -- Graph Traversal</h3>
<p>Traverses the knowledge graph following relationships between entities.</p>
<pre><code>-- Find all entities connected to Alan Turing
SELECT target.name, target.type, edge.predicate
FROM graph
WHERE GRAPH_PATH(
  start = ENTITY(name = 'Alan Turing'),
  depth = 1
)

-- Follow specific relationship types
SELECT target.name, edge.predicate
FROM graph
WHERE GRAPH_PATH(
  start = ENTITY(name = 'MIT'),
  predicate = 'alumniOf',
  direction = 'incoming',
  depth = 1
)
LIMIT 100

-- Multi-hop traversal (find connections of connections)
SELECT path, target.name, target.type
FROM graph
WHERE GRAPH_PATH(
  start = ENTITY(name = 'Tim Berners-Lee'),
  depth = 3,
  max_nodes = 200
)</code></pre>

<hr>

<h2>Aggregate Functions</h2>
<p>OQL supports standard SQL aggregate functions for analytics queries over the columnar index.</p>

<pre><code>-- Count pages by language
SELECT language, COUNT(*) as page_count
FROM index
GROUP BY language
ORDER BY page_count DESC
LIMIT 20

-- Average content length by TLD
SELECT tld, COUNT(*) as pages, AVG(content_length) as avg_size
FROM index
WHERE status_code = 200
GROUP BY tld
ORDER BY pages DESC
LIMIT 30

-- Domain size distribution
SELECT domain, COUNT(*) as pages, SUM(content_length) as total_bytes
FROM index
WHERE language = 'en'
GROUP BY domain
HAVING pages > 1000
ORDER BY total_bytes DESC
LIMIT 50</code></pre>

<hr>

<h2>Common Use Cases</h2>

<details>
  <summary>Find all English Wikipedia pages larger than 100 KB</summary>
  <div class="details-body">
<pre><code>SELECT url, title, content_length
FROM index
WHERE domain = 'wikipedia.org'
  AND language = 'en'
  AND content_length > 100000
ORDER BY content_length DESC
LIMIT 100</code></pre>
  </div>
</details>

<details>
  <summary>Semantic search for climate research papers</summary>
  <div class="details-body">
<pre><code>SELECT url, title, SIMILARITY() as score
FROM vectors
WHERE SIMILAR_TO('impact of climate change on marine ecosystems')
  AND language = 'en'
  AND domain LIKE '%.edu'
ORDER BY score DESC
LIMIT 20</code></pre>
  </div>
</details>

<details>
  <summary>Find organizations founded by a specific person</summary>
  <div class="details-body">
<pre><code>SELECT target.name, target.type, target.description
FROM graph
WHERE GRAPH_PATH(
  start = ENTITY(name = 'Elon Musk'),
  predicate = 'foundedBy',
  direction = 'incoming',
  depth = 1
)</code></pre>
  </div>
</details>

<details>
  <summary>Full-text search with domain and language filters</summary>
  <div class="details-body">
<pre><code>SELECT url, title, SCORE() as relevance
FROM fulltext
WHERE CONTAINS('"machine learning" AND (tutorial OR guide)')
  AND language = 'en'
  AND tld IN ('org', 'edu', 'io')
ORDER BY relevance DESC
LIMIT 50</code></pre>
  </div>
</details>

<details>
  <summary>Analyze language distribution for a TLD</summary>
  <div class="details-body">
<pre><code>SELECT language, COUNT(*) as pages,
       ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM index
WHERE tld = 'de'
  AND status_code = 200
GROUP BY language
ORDER BY pages DESC
LIMIT 20</code></pre>
  </div>
</details>

<details>
  <summary>Combined full-text + vector search</summary>
  <div class="details-body">
<pre><code>-- Find pages that match keywords AND are semantically similar
SELECT f.url, f.title, SCORE() as text_score, SIMILARITY() as vec_score
FROM fulltext f
JOIN vectors v ON f.url = v.url
WHERE CONTAINS('transformer architecture attention mechanism')
  AND SIMILAR_TO('how neural network attention works', THRESHOLD 0.7)
ORDER BY (text_score * 0.4 + vec_score * 0.6) DESC
LIMIT 20</code></pre>
  </div>
</details>

<hr>

<h2>Syntax Reference</h2>
<table>
  <thead>
    <tr>
      <th>Element</th>
      <th>Syntax</th>
      <th>Example</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>Select all</td><td><code>SELECT *</code></td><td><code>SELECT * FROM index LIMIT 10</code></td></tr>
    <tr><td>Select columns</td><td><code>SELECT col1, col2</code></td><td><code>SELECT url, title FROM index</code></td></tr>
    <tr><td>Equality</td><td><code>col = value</code></td><td><code>WHERE language = 'en'</code></td></tr>
    <tr><td>Inequality</td><td><code>col != value</code></td><td><code>WHERE status_code != 404</code></td></tr>
    <tr><td>Comparison</td><td><code>&gt; &lt; &gt;= &lt;=</code></td><td><code>WHERE content_length > 10000</code></td></tr>
    <tr><td>Pattern match</td><td><code>LIKE</code></td><td><code>WHERE url LIKE '%/api/%'</code></td></tr>
    <tr><td>Set membership</td><td><code>IN (...)</code></td><td><code>WHERE tld IN ('com', 'org')</code></td></tr>
    <tr><td>Null check</td><td><code>IS NULL / IS NOT NULL</code></td><td><code>WHERE title IS NOT NULL</code></td></tr>
    <tr><td>Logical AND</td><td><code>AND</code></td><td><code>WHERE a = 1 AND b = 2</code></td></tr>
    <tr><td>Logical OR</td><td><code>OR</code></td><td><code>WHERE a = 1 OR b = 2</code></td></tr>
    <tr><td>Full-text</td><td><code>CONTAINS()</code></td><td><code>WHERE CONTAINS('search term')</code></td></tr>
    <tr><td>Vector search</td><td><code>SIMILAR_TO()</code></td><td><code>WHERE SIMILAR_TO('semantic query')</code></td></tr>
    <tr><td>Entity lookup</td><td><code>ENTITY()</code></td><td><code>WHERE ENTITY(name = 'X')</code></td></tr>
    <tr><td>Graph path</td><td><code>GRAPH_PATH()</code></td><td><code>WHERE GRAPH_PATH(start = ..., depth = 2)</code></td></tr>
    <tr><td>Aggregation</td><td><code>COUNT, AVG, SUM, MIN, MAX</code></td><td><code>SELECT COUNT(*) FROM index</code></td></tr>
    <tr><td>Grouping</td><td><code>GROUP BY</code></td><td><code>GROUP BY language</code></td></tr>
    <tr><td>Having</td><td><code>HAVING</code></td><td><code>HAVING COUNT(*) > 100</code></td></tr>
    <tr><td>Sorting</td><td><code>ORDER BY col [ASC|DESC]</code></td><td><code>ORDER BY timestamp DESC</code></td></tr>
    <tr><td>Limit</td><td><code>LIMIT n</code></td><td><code>LIMIT 100</code></td></tr>
    <tr><td>Offset</td><td><code>OFFSET n</code></td><td><code>LIMIT 10 OFFSET 20</code></td></tr>
  </tbody>
</table>
`
