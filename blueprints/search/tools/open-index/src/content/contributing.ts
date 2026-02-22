export const contributingPage = `
<h2>Contributing to OpenIndex</h2>
<p>OpenIndex is an open-source project and we welcome contributions from everyone. Whether you are fixing a typo, adding a feature, improving documentation, or building an entirely new component, your work helps make web intelligence accessible to all.</p>

<div class="note">
  <strong>New here?</strong> Start with our <a href="https://github.com/openindex/openindex/labels/good%20first%20issue">Good First Issues</a> on GitHub. These are beginner-friendly tasks that are well-documented and scoped for new contributors.
</div>

<hr>

<h3>How to Contribute</h3>
<ol>
  <li><strong>Find an issue</strong> -- Browse open issues on GitHub or propose a new feature in GitHub Discussions.</li>
  <li><strong>Fork the repository</strong> -- Create a fork of the relevant repository under your GitHub account.</li>
  <li><strong>Create a branch</strong> -- Work on a descriptively named branch (e.g., <code>fix/cdx-pagination</code> or <code>feat/graph-traversal-api</code>).</li>
  <li><strong>Make your changes</strong> -- Write code, tests, and documentation as needed.</li>
  <li><strong>Submit a pull request</strong> -- Open a PR against the <code>main</code> branch with a clear description of your changes.</li>
  <li><strong>Code review</strong> -- A maintainer will review your PR, provide feedback, and merge when ready.</li>
</ol>

<p>We aim to review all pull requests within 3 business days. For large features, we recommend opening a discussion or issue first to align on the approach before writing code.</p>

<hr>

<h3>Development Setup</h3>
<p>Each repository has its own setup requirements, but the general workflow is consistent:</p>

<pre><code># Clone the repository
git clone https://github.com/openindex/crawler.git
cd crawler

# Install dependencies
make deps

# Run tests
make test

# Run linter
make lint

# Build
make build</code></pre>

<h4>Prerequisites</h4>
<ul>
  <li><strong>Go 1.22+</strong> -- Required for the crawler, indexer, API server, and CLI.</li>
  <li><strong>Rust 1.75+</strong> -- Required for the full-text indexer (Tantivy-based).</li>
  <li><strong>Python 3.11+</strong> -- Required for the vector pipeline and knowledge graph tools.</li>
  <li><strong>Docker</strong> -- Required for running integration tests and local development environments.</li>
  <li><strong>DuckDB</strong> -- Used for Parquet index queries and analytics tooling.</li>
</ul>

<p>Each repository's README contains specific setup instructions. If you run into trouble, ask in the <code>#dev</code> channel on <a href="https://discord.gg/openindex">Discord</a>.</p>

<hr>

<h3>Code Style Guide</h3>

<h4>Go</h4>
<ul>
  <li>Follow the standard <a href="https://go.dev/doc/effective_go">Effective Go</a> guidelines.</li>
  <li>Use <code>gofmt</code> and <code>golangci-lint</code> before committing. CI will reject improperly formatted code.</li>
  <li>Error messages should be lowercase and not end with punctuation.</li>
  <li>Exported functions must have doc comments.</li>
  <li>Table-driven tests are preferred.</li>
</ul>

<h4>Rust</h4>
<ul>
  <li>Run <code>cargo fmt</code> and <code>cargo clippy</code> before committing.</li>
  <li>Follow the <a href="https://rust-lang.github.io/api-guidelines/">Rust API Guidelines</a>.</li>
  <li>Use <code>thiserror</code> for library error types and <code>anyhow</code> for application error types.</li>
</ul>

<h4>Python</h4>
<ul>
  <li>Follow PEP 8. Use <code>ruff</code> for linting and formatting.</li>
  <li>Type hints are required for all public functions.</li>
  <li>Use <code>pytest</code> for testing.</li>
</ul>

<h4>General</h4>
<ul>
  <li>Commit messages should be concise and descriptive. Use the imperative mood (e.g., "Add CDX pagination" not "Added CDX pagination").</li>
  <li>Each PR should address a single concern. Avoid mixing unrelated changes.</li>
  <li>Include tests for new features and bug fixes. Aim for high coverage but prioritize meaningful tests over coverage metrics.</li>
</ul>

<hr>

<h3>Architecture Overview for Contributors</h3>
<p>Understanding the high-level architecture will help you navigate the codebase and find the right place to make changes.</p>

<div class="card-grid">
  <div class="card">
    <h3>Crawler</h3>
    <p>Distributed Go application that fetches web pages. Reads seed URLs, respects robots.txt, deduplicates content, and writes WARC files to cloud storage.</p>
  </div>
  <div class="card">
    <h3>Indexer</h3>
    <p>Processes WARC files to produce CDX index, Parquet columnar index, and WAT/WET derivatives. Orchestrated via a job queue.</p>
  </div>
  <div class="card">
    <h3>Vector Pipeline</h3>
    <p>Python service that generates dense embeddings from WET text using multilingual-e5-large. Writes vectors to Vald distributed vector DB.</p>
  </div>
  <div class="card">
    <h3>Knowledge Graph</h3>
    <p>NER, entity linking, relationship extraction, and graph construction pipeline. Outputs to Neo4j and JSON-LD exports.</p>
  </div>
</div>

<hr>

<h3>Key Repositories</h3>

<table>
  <thead>
    <tr>
      <th>Repository</th>
      <th>Language</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong><a href="https://github.com/openindex/crawler">openindex/crawler</a></strong></td>
      <td>Go</td>
      <td>Distributed web crawler with robots.txt compliance and adaptive rate limiting</td>
    </tr>
    <tr>
      <td><strong><a href="https://github.com/openindex/indexer">openindex/indexer</a></strong></td>
      <td>Go / Rust</td>
      <td>WARC processing, CDX generation, Parquet index, full-text index (Tantivy)</td>
    </tr>
    <tr>
      <td><strong><a href="https://github.com/openindex/api">openindex/api</a></strong></td>
      <td>Go</td>
      <td>REST API server for search, URL lookup, graph queries, and vector search</td>
    </tr>
    <tr>
      <td><strong><a href="https://github.com/openindex/vector-pipeline">openindex/vector-pipeline</a></strong></td>
      <td>Python</td>
      <td>Embedding generation pipeline using multilingual-e5-large and Vald</td>
    </tr>
    <tr>
      <td><strong><a href="https://github.com/openindex/knowledge-graph">openindex/knowledge-graph</a></strong></td>
      <td>Python</td>
      <td>NER, entity linking, relationship extraction, Neo4j graph construction</td>
    </tr>
    <tr>
      <td><strong><a href="https://github.com/openindex/ontology">openindex/ontology</a></strong></td>
      <td>OWL / JSON-LD</td>
      <td>Community-maintained entity schema compatible with Schema.org</td>
    </tr>
    <tr>
      <td><strong><a href="https://github.com/openindex/cli">openindex/cli</a></strong></td>
      <td>Go</td>
      <td>Command-line tool for querying, downloading, and managing OpenIndex data</td>
    </tr>
    <tr>
      <td><strong><a href="https://github.com/openindex/docs">openindex/docs</a></strong></td>
      <td>Markdown</td>
      <td>Documentation site source (this website)</td>
    </tr>
  </tbody>
</table>

<hr>

<h3>Good First Issues</h3>
<p>These issues are specifically tagged for new contributors. They are well-scoped, have clear acceptance criteria, and include pointers to relevant code.</p>

<details>
  <summary>Improve CDX API error messages for malformed URLs</summary>
  <div class="details-body">
    <p><strong>Repository:</strong> openindex/api</p>
    <p><strong>Difficulty:</strong> Easy</p>
    <p>The CDX API currently returns a generic 400 error for malformed URLs. Add specific error messages indicating what is wrong (missing scheme, invalid characters, etc.).</p>
  </div>
</details>

<details>
  <summary>Add language filter to the Parquet index CLI command</summary>
  <div class="details-body">
    <p><strong>Repository:</strong> openindex/cli</p>
    <p><strong>Difficulty:</strong> Easy</p>
    <p>The <code>openindex query</code> command does not yet support filtering by detected language. Add a <code>--lang</code> flag that adds a WHERE clause to the DuckDB query.</p>
  </div>
</details>

<details>
  <summary>Write integration tests for the vector search API</summary>
  <div class="details-body">
    <p><strong>Repository:</strong> openindex/api</p>
    <p><strong>Difficulty:</strong> Medium</p>
    <p>The vector search endpoint lacks integration tests. Write tests using a local Vald instance (Docker) that verify search accuracy, pagination, and error handling.</p>
  </div>
</details>

<details>
  <summary>Add Schema.org Event type to the ontology</summary>
  <div class="details-body">
    <p><strong>Repository:</strong> openindex/ontology</p>
    <p><strong>Difficulty:</strong> Easy</p>
    <p>The ontology currently lacks support for events (conferences, concerts, meetups). Add the Event type with appropriate properties and relationships, compatible with Schema.org/Event.</p>
  </div>
</details>

<hr>

<h3>Communication Channels</h3>

<div class="card-grid">
  <div class="card">
    <h3>Discord</h3>
    <p>Join our <a href="https://discord.gg/openindex">Discord server</a> for real-time discussion. Key channels: <code>#dev</code> for development, <code>#help</code> for questions, <code>#showcase</code> for sharing your work.</p>
  </div>
  <div class="card">
    <h3>GitHub Discussions</h3>
    <p>Use <a href="https://github.com/openindex/openindex/discussions">GitHub Discussions</a> for longer-form conversations about features, architecture decisions, and roadmap items.</p>
  </div>
  <div class="card">
    <h3>Monthly Community Call</h3>
    <p>We hold a public video call on the first Thursday of each month at 17:00 UTC. Agenda and recordings are posted in GitHub Discussions.</p>
  </div>
</div>

<hr>

<h3>Code of Conduct</h3>
<p>OpenIndex is committed to providing a welcoming and inclusive environment for everyone. All participants in our community are expected to follow our Code of Conduct:</p>

<ul>
  <li><strong>Be respectful</strong> -- Treat all community members with dignity and respect, regardless of background, identity, or experience level.</li>
  <li><strong>Be constructive</strong> -- Provide helpful, actionable feedback. Critique ideas, not people.</li>
  <li><strong>Be inclusive</strong> -- Use welcoming and inclusive language. Make space for new voices and perspectives.</li>
  <li><strong>Be collaborative</strong> -- Work together toward shared goals. Give credit where it is due.</li>
  <li><strong>No harassment</strong> -- Harassment, discrimination, and hostile behavior of any kind will not be tolerated.</li>
</ul>

<p>Violations can be reported to <a href="mailto:conduct@openindex.org">conduct@openindex.org</a>. All reports are handled confidentially. The full Code of Conduct is available in the <a href="https://github.com/openindex/openindex/blob/main/CODE_OF_CONDUCT.md">CODE_OF_CONDUCT.md</a> file in the repository root.</p>
`
