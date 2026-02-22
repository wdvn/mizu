export const errataPage = `
<h2>Known Issues</h2>
<p>This page documents known issues, data quality problems, and bugs in OpenIndex crawls and services. Issues are listed in reverse chronological order. We aim to document all significant problems transparently so that users can account for them in their analysis.</p>

<div class="note">
  If you discover an issue not listed here, please report it on <a href="https://github.com/openindex/openindex/issues">GitHub</a> or in our <a href="https://discord.gg/openindex">Discord</a>.
</div>

<hr>

<table>
  <thead>
    <tr>
      <th>Date</th>
      <th>Affected Build</th>
      <th>Issue</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>2026-02-18</td>
      <td>OI-2026-02</td>
      <td>Missing language classification for ~2.1M pages</td>
      <td><span style="color:#dc2626;font-weight:600">Open</span></td>
    </tr>
    <tr>
      <td>2026-02-10</td>
      <td>OI-2026-02</td>
      <td>Vector embeddings not generated for pages with title &gt; 512 characters</td>
      <td><span style="color:#dc2626;font-weight:600">Open</span></td>
    </tr>
    <tr>
      <td>2026-01-22</td>
      <td>OI-2026-01</td>
      <td>Truncated WARC records for responses &gt; 10 MB</td>
      <td><span style="color:#16a34a;font-weight:600">Fixed in OI-2026-02</span></td>
    </tr>
    <tr>
      <td>2026-01-15</td>
      <td>OI-2026-01</td>
      <td>Knowledge graph entity deduplication failure for CJK names</td>
      <td><span style="color:#16a34a;font-weight:600">Fixed in OI-2026-02</span></td>
    </tr>
    <tr>
      <td>2025-12-28</td>
      <td>OI-2025-12</td>
      <td>Incorrect charset detection for Windows-1251 encoded pages</td>
      <td><span style="color:#16a34a;font-weight:600">Fixed in OI-2026-01</span></td>
    </tr>
    <tr>
      <td>2025-12-14</td>
      <td>OI-2025-12</td>
      <td>CDX index missing entries for URLs with fragment identifiers</td>
      <td><span style="color:#16a34a;font-weight:600">Fixed in OI-2026-01</span></td>
    </tr>
    <tr>
      <td>2025-11-30</td>
      <td>OI-2025-11</td>
      <td>WAT metadata extraction fails silently on malformed HTML meta tags</td>
      <td><span style="color:#16a34a;font-weight:600">Fixed in OI-2025-12</span></td>
    </tr>
    <tr>
      <td>2025-11-08</td>
      <td>OI-2025-11</td>
      <td>Parquet index: <code>content_length</code> reports compressed size instead of uncompressed for ~0.3% of records</td>
      <td><span style="color:#d97706;font-weight:600">Partial fix in OI-2025-12</span></td>
    </tr>
    <tr>
      <td>2025-10-25</td>
      <td>OI-2025-10</td>
      <td>Duplicate WARC records for redirected URLs (both redirect and final URL stored)</td>
      <td><span style="color:#16a34a;font-weight:600">Fixed in OI-2025-11</span></td>
    </tr>
    <tr>
      <td>2025-10-12</td>
      <td>OI-2025-10</td>
      <td>Vector search returns stale results for domains recrawled mid-cycle</td>
      <td><span style="color:#16a34a;font-weight:600">Fixed in OI-2025-11</span></td>
    </tr>
  </tbody>
</table>

<hr>

<h2>Detailed Descriptions</h2>

<details>
  <summary>2026-02-18: Missing language classification (~2.1M pages)</summary>
  <div class="details-body">
    <p><strong>Affected Build:</strong> OI-2026-02</p>
    <p><strong>Status:</strong> Open</p>
    <p><strong>Description:</strong> Approximately 2.1 million pages in the OI-2026-02 crawl have a <code>null</code> language field in the Parquet index. This affects pages where the language detection model returned a confidence score below 0.3 and the HTML <code>lang</code> attribute was missing or set to an invalid value.</p>
    <p><strong>Impact:</strong> Queries filtering by language (e.g., <code>WHERE language = 'en'</code>) will exclude these pages. This represents approximately 0.075% of the total crawl.</p>
    <p><strong>Workaround:</strong> Include <code>OR language IS NULL</code> in your queries if completeness is important. Alternatively, use the WET files and run your own language detection.</p>
  </div>
</details>

<details>
  <summary>2026-02-10: Missing vector embeddings for long titles</summary>
  <div class="details-body">
    <p><strong>Affected Build:</strong> OI-2026-02</p>
    <p><strong>Status:</strong> Open</p>
    <p><strong>Description:</strong> Pages with titles exceeding 512 characters caused a tokenization overflow in the embedding pipeline. These pages were skipped during vector generation, resulting in approximately 840,000 pages without embeddings.</p>
    <p><strong>Impact:</strong> These pages will not appear in vector similarity search results. They remain fully searchable via full-text search and the columnar index.</p>
    <p><strong>Workaround:</strong> No workaround available. A fix is planned for the next crawl that truncates titles at the tokenizer level rather than skipping the page entirely.</p>
  </div>
</details>

<details>
  <summary>2026-01-22: Truncated WARC records for large responses</summary>
  <div class="details-body">
    <p><strong>Affected Build:</strong> OI-2026-01</p>
    <p><strong>Status:</strong> Fixed in OI-2026-02</p>
    <p><strong>Description:</strong> HTTP responses larger than 10 MB were truncated in the WARC files due to a buffer size limit in the crawler's response writer. The WARC record's <code>Content-Length</code> header reported the full size, but the actual stored content was cut off at 10,485,760 bytes.</p>
    <p><strong>Impact:</strong> Approximately 1.2 million WARC records contain truncated content. The <code>WARC-Truncated</code> header was not set on these records (this was part of the bug). The Parquet index <code>content_length</code> field reflects the truncated size.</p>
    <p><strong>Fix:</strong> The response writer buffer limit was increased to 100 MB, and the <code>WARC-Truncated</code> header is now properly set when truncation occurs.</p>
  </div>
</details>

<details>
  <summary>2026-01-15: Knowledge graph deduplication failure for CJK names</summary>
  <div class="details-body">
    <p><strong>Affected Build:</strong> OI-2026-01</p>
    <p><strong>Status:</strong> Fixed in OI-2026-02</p>
    <p><strong>Description:</strong> The entity deduplication pipeline used Unicode NFKC normalization for name matching, which incorrectly collapsed certain CJK (Chinese, Japanese, Korean) characters. This resulted in approximately 340,000 duplicate entity records where distinct entities with similar-looking but semantically different names were merged.</p>
    <p><strong>Impact:</strong> Knowledge graph queries for CJK entities may return incorrect or merged results in the OI-2026-01 graph export. The fix uses language-aware normalization that preserves CJK character distinctions.</p>
  </div>
</details>

<details>
  <summary>2025-12-28: Incorrect charset detection for Windows-1251</summary>
  <div class="details-body">
    <p><strong>Affected Build:</strong> OI-2025-12</p>
    <p><strong>Status:</strong> Fixed in OI-2026-01</p>
    <p><strong>Description:</strong> Pages encoded in Windows-1251 (commonly used for Russian and other Cyrillic-script languages) were incorrectly detected as ISO-8859-1 when the HTTP Content-Type header did not specify a charset. This caused garbled text in approximately 4.7 million WET records.</p>
    <p><strong>Impact:</strong> WET files for affected pages contain mojibake (garbled text). The WARC files contain the original bytes and are unaffected. Full-text search indexing was also affected, causing poor search results for Russian-language queries in this crawl.</p>
  </div>
</details>

<details>
  <summary>2025-12-14: CDX index missing fragment URLs</summary>
  <div class="details-body">
    <p><strong>Affected Build:</strong> OI-2025-12</p>
    <p><strong>Status:</strong> Fixed in OI-2026-01</p>
    <p><strong>Description:</strong> URLs containing fragment identifiers (e.g., <code>https://example.com/page#section</code>) were incorrectly stripped during CDX index generation. While the WARC files contain the full URLs, the CDX index stored them without fragments, causing lookup failures for fragment-bearing URLs.</p>
    <p><strong>Impact:</strong> URL lookups via the API for URLs with fragment identifiers returned 404 in OI-2025-12. The WARC files are complete and unaffected. Fixed by preserving fragments in the CDX key.</p>
  </div>
</details>

<details>
  <summary>2025-11-30: Silent WAT metadata extraction failures</summary>
  <div class="details-body">
    <p><strong>Affected Build:</strong> OI-2025-11</p>
    <p><strong>Status:</strong> Fixed in OI-2025-12</p>
    <p><strong>Description:</strong> The WAT extraction pipeline silently skipped HTML meta tags that contained unescaped special characters (e.g., quotes, angle brackets in the <code>content</code> attribute). Approximately 12 million pages had incomplete metadata in their WAT records.</p>
    <p><strong>Impact:</strong> WAT records for affected pages may be missing Open Graph tags, description meta tags, or other metadata fields. The WARC files and Parquet index are unaffected.</p>
  </div>
</details>

<details>
  <summary>2025-11-08: Parquet content_length reports compressed size</summary>
  <div class="details-body">
    <p><strong>Affected Build:</strong> OI-2025-11</p>
    <p><strong>Status:</strong> Partial fix in OI-2025-12</p>
    <p><strong>Description:</strong> For approximately 0.3% of records in the Parquet index, the <code>content_length</code> column reports the compressed (gzip) transfer size rather than the uncompressed content size. This occurs when the server sent a <code>Content-Encoding: gzip</code> response and the crawler recorded the compressed <code>Content-Length</code> header.</p>
    <p><strong>Impact:</strong> Size-based filtering and analytics may be slightly skewed. The affected records typically show a content_length 3-5x smaller than actual. A partial fix in OI-2025-12 catches most cases, but edge cases involving chunked transfer encoding remain.</p>
  </div>
</details>

<details>
  <summary>2025-10-25: Duplicate WARC records for redirects</summary>
  <div class="details-body">
    <p><strong>Affected Build:</strong> OI-2025-10</p>
    <p><strong>Status:</strong> Fixed in OI-2025-11</p>
    <p><strong>Description:</strong> When the crawler followed HTTP redirects (301, 302, 307), both the redirect response and the final response were stored as separate <code>response</code> records in the WARC file. This doubled storage for approximately 18% of crawled URLs and caused the Parquet index to contain duplicate entries.</p>
    <p><strong>Impact:</strong> Row counts in the Parquet index are inflated by approximately 18%. Deduplication queries using <code>GROUP BY url</code> or <code>DISTINCT url</code> can work around this. Fixed by storing redirects as <code>revisit</code> records.</p>
  </div>
</details>

<details>
  <summary>2025-10-12: Stale vector search results during mid-cycle recrawl</summary>
  <div class="details-body">
    <p><strong>Affected Build:</strong> OI-2025-10</p>
    <p><strong>Status:</strong> Fixed in OI-2025-11</p>
    <p><strong>Description:</strong> When domains were recrawled during the middle of a crawl cycle (due to high priority or rapid content change), the vector index retained the old embeddings alongside the new ones. This caused duplicate results in vector search, with both old and new versions appearing.</p>
    <p><strong>Impact:</strong> Vector search results for domains recrawled mid-cycle could contain duplicate entries with different similarity scores. Fixed by implementing upsert semantics in the vector index that replace old embeddings on URL match.</p>
  </div>
</details>
`
