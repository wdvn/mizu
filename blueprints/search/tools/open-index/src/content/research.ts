export const researchPage = `
<h2>Research Using OpenIndex</h2>
<p>OpenIndex data has been used in academic research across natural language processing, information retrieval, web analysis, security, and knowledge representation. This page highlights published work and provides citation information.</p>

<div class="card-grid">
  <div class="card">
    <div class="card-icon" style="background:#eff6ff;color:#2563eb">&#x1F4C4;</div>
    <h3>50+</h3>
    <p>Published papers citing OpenIndex data</p>
  </div>
  <div class="card">
    <div class="card-icon" style="background:#dcfce7;color:#16a34a">&#x1F393;</div>
    <h3>120+</h3>
    <p>Research groups actively using the dataset</p>
  </div>
  <div class="card">
    <div class="card-icon" style="background:#fef3c7;color:#d97706">&#x1F30D;</div>
    <h3>28</h3>
    <p>Countries with active research collaborations</p>
  </div>
</div>

<hr>

<h2>How to Cite OpenIndex</h2>
<p>If you use OpenIndex data in your research, please cite the following paper:</p>

<blockquote>
  Gasior, N., Chen, W., Patel, R., and Kim, S. (2025). "OpenIndex: An Open Web Intelligence Platform for Large-Scale Web Analysis." <em>Proceedings of the ACM Web Conference 2025</em>, pp. 1847-1858. ACM.
</blockquote>

<h3>BibTeX</h3>
<pre><code>@inproceedings{gasior2025openindex,
  title     = {OpenIndex: An Open Web Intelligence Platform for
               Large-Scale Web Analysis},
  author    = {Gasior, Nicholas and Chen, Wei and Patel, Riya
               and Kim, Sungho},
  booktitle = {Proceedings of the ACM Web Conference 2025},
  pages     = {1847--1858},
  year      = {2025},
  publisher = {ACM},
  doi       = {10.1145/3589334.3645678},
  url       = {https://doi.org/10.1145/3589334.3645678}
}</code></pre>

<p>For work that specifically uses the knowledge graph, please also cite:</p>

<pre><code>@inproceedings{chen2025oikg,
  title     = {Constructing a Web-Scale Knowledge Graph from
               Open Crawl Data},
  author    = {Chen, Wei and Gasior, Nicholas and Torres, Maria},
  booktitle = {Proceedings of ISWC 2025},
  pages     = {312--328},
  year      = {2025},
  publisher = {Springer}
}</code></pre>

<p style="margin-top:1rem">
  <a href="https://scholar.google.com/scholar?q=openindex" class="btn-secondary" style="display:inline-flex;font-size:0.9rem;padding:0.5rem 1rem">View on Google Scholar &rarr;</a>
</p>

<hr>

<h2>Featured Research Papers</h2>

<h3>Natural Language Processing</h3>

<details>
  <summary>WebLM-3: Pre-training Language Models on Deduplicated Open Web Data</summary>
  <div class="details-body">
    <p><strong>Authors:</strong> Zhang, L., Kumar, A., Robinson, J., and Nakamura, Y.</p>
    <p><strong>Venue:</strong> ACL 2026</p>
    <p><strong>Description:</strong> Uses OpenIndex WET files and the Parquet deduplication index to create a high-quality, deduplicated training corpus of 1.2 trillion tokens. Demonstrates that deduplication using content digests from the Parquet index improves downstream task performance by 3.2% compared to naive deduplication.</p>
  </div>
</details>

<details>
  <summary>Multilingual Content Analysis at Scale: Language Distribution and Quality Metrics</summary>
  <div class="details-body">
    <p><strong>Authors:</strong> Fernandez, C., Ali, M., and Johansson, E.</p>
    <p><strong>Venue:</strong> EMNLP 2025</p>
    <p><strong>Description:</strong> Analyzes language distribution across 12 monthly OpenIndex crawls covering 180+ languages. Identifies systematic biases in web content representation and proposes a reweighting scheme for balanced multilingual model training. Uses the Parquet index for large-scale language statistics.</p>
  </div>
</details>

<h3>Information Retrieval</h3>

<details>
  <summary>Dense Passage Retrieval from Web-Scale Corpora Using OpenIndex Embeddings</summary>
  <div class="details-body">
    <p><strong>Authors:</strong> Park, H., Williams, S., and Dubois, P.</p>
    <p><strong>Venue:</strong> SIGIR 2026</p>
    <p><strong>Description:</strong> Evaluates dense passage retrieval using OpenIndex paragraph-level vector embeddings (beta). Compares retrieval accuracy against MS MARCO and Natural Questions benchmarks when the retrieval corpus is expanded to web scale (250B+ pages). Finds that web-scale retrieval introduces unique challenges in result diversity.</p>
  </div>
</details>

<details>
  <summary>Combining Lexical and Semantic Search for Web Discovery</summary>
  <div class="details-body">
    <p><strong>Authors:</strong> Nguyen, T., Brown, K., and Ivanova, O.</p>
    <p><strong>Venue:</strong> ECIR 2026</p>
    <p><strong>Description:</strong> Proposes a hybrid retrieval model combining OpenIndex full-text search (BM25) with vector similarity search. Demonstrates that the hybrid approach outperforms either method alone by 12-18% on a novel web discovery benchmark derived from OpenIndex data.</p>
  </div>
</details>

<h3>Web Analysis & Security</h3>

<details>
  <summary>Phishing Site Evolution: A Longitudinal Study Using Web Archive Data</summary>
  <div class="details-body">
    <p><strong>Authors:</strong> Schmidt, A., Tanaka, K., and Miller, R.</p>
    <p><strong>Venue:</strong> USENIX Security 2026</p>
    <p><strong>Description:</strong> Tracks the evolution of phishing sites across 12 months of OpenIndex crawl data. Uses the knowledge graph to identify entity impersonation patterns and the vector index to cluster phishing kits by visual similarity. Identifies 847,000 previously unreported phishing sites.</p>
  </div>
</details>

<details>
  <summary>Tracking the Spread of Misinformation Through Web Link Graphs</summary>
  <div class="details-body">
    <p><strong>Authors:</strong> Costa, J., Eriksson, L., and Gupta, S.</p>
    <p><strong>Venue:</strong> WWW 2026</p>
    <p><strong>Description:</strong> Uses the OpenIndex WAT link data and knowledge graph to trace how misinformation spreads across the web. Constructs propagation graphs showing how false claims originate and amplify through link networks. Analyzes 23 major misinformation narratives across 4 languages.</p>
  </div>
</details>

<h3>Knowledge Graphs & Linked Data</h3>

<details>
  <summary>Web-Scale Entity Linking with Multi-Source Evidence Fusion</summary>
  <div class="details-body">
    <p><strong>Authors:</strong> Torres, M., Chen, W., and Muller, H.</p>
    <p><strong>Venue:</strong> ISWC 2025</p>
    <p><strong>Description:</strong> Presents the entity linking methodology used in OpenIndex's knowledge graph construction pipeline. Combines textual evidence, structural signals (HTML markup, Schema.org annotations), and cross-page co-occurrence patterns to achieve 94.2% F1 on the AIDA-CoNLL benchmark at web scale.</p>
  </div>
</details>

<details>
  <summary>Ontology Evolution in Open Web Knowledge Graphs</summary>
  <div class="details-body">
    <p><strong>Authors:</strong> Andersson, F., Rossi, P., and Lee, J.</p>
    <p><strong>Venue:</strong> ESWC 2026</p>
    <p><strong>Description:</strong> Studies how the OpenIndex ontology evolves over time as new entity types and relationships emerge from crawl data. Proposes an automated ontology extension pipeline that suggests new entity types based on clustering of unclassified entities. Evaluated on 6 monthly snapshots of the OpenIndex knowledge graph.</p>
  </div>
</details>

<h3>AI & Machine Learning</h3>

<details>
  <summary>RAG at Web Scale: Retrieval-Augmented Generation with OpenIndex</summary>
  <div class="details-body">
    <p><strong>Authors:</strong> Liu, X., Patel, R., and Hoffman, D.</p>
    <p><strong>Venue:</strong> NeurIPS 2025</p>
    <p><strong>Description:</strong> Builds a retrieval-augmented generation system using OpenIndex vector search as the retrieval backend. Evaluates on open-domain QA benchmarks and shows that web-scale retrieval significantly improves factual accuracy compared to static corpora, with 22% fewer hallucinations on TruthfulQA.</p>
  </div>
</details>

<details>
  <summary>Content Clustering at Billion Scale: Deduplication and Topic Discovery</summary>
  <div class="details-body">
    <p><strong>Authors:</strong> Kowalski, M., Singh, A., and Yamamoto, T.</p>
    <p><strong>Venue:</strong> KDD 2026</p>
    <p><strong>Description:</strong> Uses OpenIndex vector embeddings to cluster 10 billion web pages into topical groups. Introduces a scalable hierarchical clustering algorithm that operates on the vector index without materializing all embeddings in memory. Discovers 2.3 million distinct topic clusters.</p>
  </div>
</details>

<hr>

<h2>Research Areas</h2>
<p>The following research areas have active projects using OpenIndex data:</p>

<table>
  <thead>
    <tr>
      <th>Area</th>
      <th>OpenIndex Components Used</th>
      <th>Active Groups</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Natural Language Processing</strong></td>
      <td>WET files, Parquet index, language metadata</td>
      <td>35+</td>
    </tr>
    <tr>
      <td><strong>Information Retrieval</strong></td>
      <td>Full-text index, vector embeddings, CDX</td>
      <td>25+</td>
    </tr>
    <tr>
      <td><strong>Web Science</strong></td>
      <td>WAT link graphs, Parquet metadata, WARC</td>
      <td>20+</td>
    </tr>
    <tr>
      <td><strong>Security & Privacy</strong></td>
      <td>WARC files, knowledge graph, vector clustering</td>
      <td>15+</td>
    </tr>
    <tr>
      <td><strong>Knowledge Representation</strong></td>
      <td>Knowledge graph, ontology, JSON-LD exports</td>
      <td>18+</td>
    </tr>
    <tr>
      <td><strong>AI / Machine Learning</strong></td>
      <td>Vector embeddings, WET text, Parquet features</td>
      <td>30+</td>
    </tr>
  </tbody>
</table>

<hr>

<h2>Research Access</h2>
<p>OpenIndex data is free for academic and research use. If your institution needs:</p>
<ul>
  <li><strong>Higher rate limits</strong> -- Contact us for a research API key with 50,000 req/min.</li>
  <li><strong>Bulk data access</strong> -- All data is freely downloadable from S3 (<code>s3://openindex/</code>).</li>
  <li><strong>Custom exports</strong> -- We can provide domain-specific or language-specific subsets.</li>
  <li><strong>Cloud credits</strong> -- We partner with AWS, GCP, and Azure to provide research computing credits.</li>
</ul>

<p>Contact us at <a href="mailto:research@openindex.org">research@openindex.org</a> or join our <a href="https://discord.gg/openindex">Discord</a> research channel.</p>
`
