export const impactPage = `
<h2>Impact</h2>
<p>OpenIndex is used by researchers, developers, journalists, educators, and organizations around the world. By making web intelligence openly accessible, we enable work that would otherwise require massive proprietary infrastructure.</p>

<hr>

<h3>By the Numbers</h3>

<div class="card-grid">
  <div class="card">
    <div class="card-icon" style="background:#eff6ff;color:#2563eb">&#x1F4C4;</div>
    <h3>50+</h3>
    <p>Published research papers citing OpenIndex data across NLP, IR, security, and knowledge representation.</p>
  </div>
  <div class="card">
    <div class="card-icon" style="background:#dcfce7;color:#16a34a">&#x1F393;</div>
    <h3>120+</h3>
    <p>Research groups across 28 countries actively using the dataset for academic work.</p>
  </div>
  <div class="card">
    <div class="card-icon" style="background:#fef3c7;color:#d97706">&#x1F310;</div>
    <h3>1M+</h3>
    <p>API queries served per day to developers, researchers, and applications worldwide.</p>
  </div>
  <div class="card">
    <div class="card-icon" style="background:#ede9fe;color:#7c3aed">&#x1F4BE;</div>
    <h3>15 PB</h3>
    <p>Total data served through bulk downloads and API access since launch.</p>
  </div>
  <div class="card">
    <div class="card-icon" style="background:#fce7f3;color:#db2777">&#x1F465;</div>
    <h3>3,200+</h3>
    <p>Registered API users across academic, nonprofit, and commercial tiers.</p>
  </div>
  <div class="card">
    <div class="card-icon" style="background:#e0f2fe;color:#0284c7">&#x1F4BB;</div>
    <h3>850+</h3>
    <p>Open source contributors who have submitted code, documentation, or ontology improvements.</p>
  </div>
</div>

<hr>

<h3>Research Impact</h3>
<p>OpenIndex data has been used in peer-reviewed publications at top-tier venues including ACL, EMNLP, SIGIR, NeurIPS, WWW, USENIX Security, ISWC, and KDD. Research areas include:</p>

<ul>
  <li><strong>Language model pre-training</strong> -- High-quality, deduplicated training corpora built from OpenIndex WET files and Parquet deduplication indices.</li>
  <li><strong>Information retrieval</strong> -- Web-scale dense passage retrieval and hybrid search benchmarks using OpenIndex embeddings and full-text index.</li>
  <li><strong>Misinformation detection</strong> -- Tracking the spread of false narratives across the web using link graphs and knowledge graph entity analysis.</li>
  <li><strong>Entity linking at scale</strong> -- Multi-source evidence fusion for entity linking evaluated against web-scale corpora.</li>
  <li><strong>Multilingual NLP</strong> -- Language distribution analysis and reweighting schemes for balanced multilingual model training.</li>
</ul>

<p>See the <a href="/research">Research page</a> for a full list of publications and citation information.</p>

<hr>

<h3>Industry Applications</h3>
<p>Organizations across industries use OpenIndex data to build products, conduct analysis, and inform decisions:</p>

<div class="card-grid">
  <div class="card">
    <h3>Search & Discovery</h3>
    <p>Startups and established companies use OpenIndex as a foundation for building vertical search engines, content recommendation systems, and discovery tools.</p>
  </div>
  <div class="card">
    <h3>Market Intelligence</h3>
    <p>Analysts use the knowledge graph and full-text search to track competitors, monitor brand mentions, and identify market trends across the open web.</p>
  </div>
  <div class="card">
    <h3>Security & Compliance</h3>
    <p>Security teams use crawl data to detect phishing sites, track malware distribution, monitor brand impersonation, and conduct threat intelligence research.</p>
  </div>
  <div class="card">
    <h3>AI & Machine Learning</h3>
    <p>ML teams use OpenIndex embeddings for retrieval-augmented generation (RAG), content clustering, training data curation, and semantic similarity pipelines.</p>
  </div>
</div>

<hr>

<h3>Education</h3>
<p>OpenIndex data is used in university courses around the world for teaching information retrieval, web science, NLP, and data engineering:</p>

<ul>
  <li><strong>Stanford CS276</strong> (Information Retrieval) -- Students build search systems using OpenIndex Parquet and full-text indices.</li>
  <li><strong>ETH Zurich</strong> (Web Mining) -- Lab assignments use OpenIndex WAT link graphs for web graph analysis.</li>
  <li><strong>University of Waterloo</strong> (Data Systems) -- Students query OpenIndex Parquet files with DuckDB as part of a large-scale data processing course.</li>
  <li><strong>KAIST</strong> (Knowledge Graphs) -- Research projects use the OpenIndex knowledge graph and ontology for entity resolution experiments.</li>
</ul>

<p>We provide free research API keys with elevated rate limits for educational use. Contact <a href="mailto:education@openindex.org">education@openindex.org</a> to set up access for your class.</p>

<hr>

<h3>Societal Benefits</h3>
<p>Beyond research and industry, OpenIndex supports work that directly benefits society:</p>

<details>
  <summary>Misinformation Monitoring</summary>
  <div class="details-body">
    <p>Journalists and fact-checking organizations use OpenIndex to track how false claims originate and propagate across the web. The knowledge graph makes it possible to identify coordinated networks of sites amplifying the same narratives, while longitudinal crawl data reveals how misinformation evolves over time.</p>
  </div>
</details>

<details>
  <summary>Public Health Surveillance</summary>
  <div class="details-body">
    <p>Researchers monitor web content for early signals of disease outbreaks, vaccine misinformation, and public health trends. OpenIndex's multilingual coverage and semantic search make it possible to track health-related content across 180+ languages, providing early warning signals that may not appear in English-language sources.</p>
  </div>
</details>

<details>
  <summary>Disaster Response</summary>
  <div class="details-body">
    <p>During natural disasters and humanitarian crises, organizations use OpenIndex to rapidly identify relevant web content — government advisories, NGO resources, news reports, and community information. The real-time API enables building monitoring dashboards that aggregate information from across the web during emergencies.</p>
  </div>
</details>

<details>
  <summary>Digital Preservation</summary>
  <div class="details-body">
    <p>Cultural heritage organizations and libraries use OpenIndex crawl data to preserve web content that may otherwise disappear. The regular monthly crawl schedule provides a consistent longitudinal record of the web's evolution, complementing the preservation work of the Internet Archive and national libraries.</p>
  </div>
</details>

<details>
  <summary>Government Transparency</summary>
  <div class="details-body">
    <p>Civic technology organizations use OpenIndex to monitor government websites for changes in published data, policy documents, and public notices. The CDX index and WARC archive make it possible to detect and document changes to government web content over time.</p>
  </div>
</details>

<hr>

<h3>What People Are Saying</h3>

<blockquote>
  "OpenIndex has transformed how we approach web-scale NLP research. Having access to both raw text and pre-computed embeddings means we can iterate on experiments in hours instead of weeks."
  <br><br>
  <strong>-- Dr. Lin Zhang, ACL 2026 Best Paper co-author</strong>
</blockquote>

<blockquote>
  "For our misinformation tracking work, the knowledge graph is invaluable. We can trace entity relationships across millions of pages in ways that simply were not possible before with raw crawl data alone."
  <br><br>
  <strong>-- Dr. Julia Costa, WWW 2026 researcher</strong>
</blockquote>

<blockquote>
  "As a professor, I appreciate that OpenIndex gives my students access to real-world, web-scale data. They can work with the same kind of infrastructure that powers major search engines, without needing corporate sponsorship."
  <br><br>
  <strong>-- Prof. Sarah Williams, University of Waterloo</strong>
</blockquote>

<blockquote>
  "We built our entire competitive intelligence product on top of the OpenIndex API. The combination of full-text search and knowledge graph queries gives us capabilities that would have cost millions to build internally."
  <br><br>
  <strong>-- Marcus Eriksson, CTO of WebScope Analytics</strong>
</blockquote>

<hr>

<h3>Support Our Impact</h3>
<p>OpenIndex is a nonprofit, community-funded project. Every dollar goes directly to crawling infrastructure, compute resources, and engineering time. If OpenIndex has been valuable to your work, consider supporting us:</p>
<ul>
  <li><strong>Donate</strong> -- Financial contributions at any level make a difference. Contact <a href="mailto:donate@openindex.org">donate@openindex.org</a>.</li>
  <li><strong>Sponsor compute</strong> -- Cloud providers can contribute computing resources. See <a href="/collaborators">Collaborators</a>.</li>
  <li><strong>Cite us</strong> -- If you use OpenIndex data in published work, please cite the OpenIndex paper. See <a href="/research">Research</a> for citation details.</li>
  <li><strong>Spread the word</strong> -- Tell your colleagues, students, and community about OpenIndex.</li>
</ul>
`
