export const termsPage = `
<h2>Terms of Use</h2>
<p><strong>Last updated:</strong> February 1, 2026</p>

<p>These Terms of Use ("Terms") govern your access to and use of the OpenIndex platform, including the website (openindex.org), API (api.openindex.org), data downloads, and related services (collectively, the "Services") provided by the OpenIndex Foundation ("OpenIndex", "we", "us", "our").</p>

<p>By using the Services, you agree to these Terms. If you do not agree, do not use the Services.</p>

<hr>

<h3>1. License for Data Use</h3>

<h4>Crawl Data</h4>
<p>OpenIndex crawl data (WARC, WAT, WET, Parquet, vector embeddings, knowledge graph exports) is released under the <strong>Creative Commons CC0 1.0 Universal (Public Domain Dedication)</strong>. You may use, modify, and redistribute this data for any purpose, including commercial use, without restriction or attribution requirements.</p>

<div class="note">
  While the OpenIndex data itself is public domain, the underlying web content was created by third parties and may be subject to their own copyright. OpenIndex provides the data as-is for research and analysis. Compliance with applicable copyright law regarding the underlying content is your responsibility.
</div>

<h4>Software</h4>
<p>All OpenIndex software (crawler, indexer, API server, CLI, vector pipeline, knowledge graph tools) is released under the <strong>Apache License 2.0</strong>. You may use, modify, and redistribute the software under the terms of that license. A copy of the Apache 2.0 license is included in each repository.</p>

<h4>Documentation & Website Content</h4>
<p>The content of the OpenIndex website and documentation is released under the <strong>Creative Commons Attribution 4.0 International (CC-BY 4.0)</strong> license. You may share and adapt this content with appropriate attribution.</p>

<hr>

<h3>2. Acceptable Use</h3>
<p>You agree to use the Services responsibly and in compliance with all applicable laws. You may not:</p>

<ul>
  <li><strong>Abuse the API</strong> -- Do not exceed your rate limits, circumvent rate limiting mechanisms, or use automated tools to generate excessive load on the API.</li>
  <li><strong>Disrupt the service</strong> -- Do not attempt to interfere with, disrupt, or degrade the performance of any OpenIndex service or infrastructure.</li>
  <li><strong>Reverse engineer security</strong> -- Do not probe, scan, or test the vulnerability of our systems or attempt to bypass authentication or security measures.</li>
  <li><strong>Misrepresent identity</strong> -- Do not impersonate OpenIndex, its staff, or other users.</li>
  <li><strong>Illegal purposes</strong> -- Do not use the Services for any activity that violates applicable law.</li>
</ul>

<p>We reserve the right to suspend or terminate access for users who violate these terms. Suspension decisions are reviewed by a human and are not automated.</p>

<hr>

<h3>3. API Terms</h3>

<h4>Rate Limits</h4>
<p>API access is subject to rate limits based on your tier:</p>

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

<h4>API Keys</h4>
<ul>
  <li>API keys are personal and non-transferable. Do not share your API key or embed it in publicly accessible code.</li>
  <li>You are responsible for all activity associated with your API key.</li>
  <li>We may revoke API keys that are compromised, abused, or associated with Terms violations.</li>
</ul>

<h4>API Availability</h4>
<p>We strive to maintain high availability but do not guarantee uninterrupted access. The API is provided "as is" and we may perform maintenance, updates, or modifications that temporarily affect availability. We will provide advance notice of planned maintenance where possible.</p>

<hr>

<h3>4. Intellectual Property</h3>
<p>The OpenIndex name, logo, and brand assets are trademarks of the OpenIndex Foundation. You may not use these trademarks in a way that suggests endorsement by or affiliation with OpenIndex without our prior written consent.</p>

<p>Subject to the licenses described in Section 1, all other intellectual property rights in the Services remain with OpenIndex or their respective owners.</p>

<hr>

<h3>5. Disclaimer of Warranties</h3>
<p>THE SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, ACCURACY, AND NON-INFRINGEMENT.</p>

<p>OpenIndex does not warrant that:</p>
<ul>
  <li>The Services will be uninterrupted, timely, secure, or error-free.</li>
  <li>The data provided is accurate, complete, or current.</li>
  <li>The results obtained from using the Services will be correct or reliable.</li>
  <li>Any defects in the Services will be corrected.</li>
</ul>

<hr>

<h3>6. Limitation of Liability</h3>
<p>TO THE MAXIMUM EXTENT PERMITTED BY LAW, OPENINDEX AND ITS DIRECTORS, OFFICERS, EMPLOYEES, AND CONTRIBUTORS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, USE, OR GOODWILL, ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICES, WHETHER BASED ON WARRANTY, CONTRACT, TORT (INCLUDING NEGLIGENCE), OR ANY OTHER LEGAL THEORY.</p>

<p>IN NO EVENT SHALL OPENINDEX'S TOTAL LIABILITY EXCEED THE AMOUNT YOU PAID TO OPENINDEX IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM, OR ONE HUNDRED US DOLLARS ($100), WHICHEVER IS GREATER.</p>

<hr>

<h3>7. Indemnification</h3>
<p>You agree to indemnify, defend, and hold harmless OpenIndex and its directors, officers, employees, and contributors from and against any claims, liabilities, damages, losses, and expenses (including reasonable legal fees) arising out of or related to your use of the Services or your violation of these Terms.</p>

<hr>

<h3>8. Governing Law</h3>
<p>These Terms are governed by and construed in accordance with the laws of the State of California, United States, without regard to its conflict of law provisions. Any disputes arising from these Terms shall be resolved in the state or federal courts located in San Francisco County, California.</p>

<hr>

<h3>9. Changes to Terms</h3>
<p>We may update these Terms from time to time. Changes will be posted on this page with an updated "Last updated" date. For material changes, we will provide at least 30 days' notice via the website or email (for registered users). Your continued use of the Services after changes take effect constitutes acceptance of the updated Terms.</p>

<p>If you disagree with the updated Terms, you must stop using the Services. You may request deletion of your account and data by contacting <a href="mailto:privacy@openindex.org">privacy@openindex.org</a>.</p>

<hr>

<h3>10. Severability</h3>
<p>If any provision of these Terms is found to be unenforceable or invalid, that provision shall be limited or eliminated to the minimum extent necessary, and the remaining provisions shall remain in full force and effect.</p>

<hr>

<h3>11. Entire Agreement</h3>
<p>These Terms, together with the <a href="/privacy">Privacy Policy</a>, constitute the entire agreement between you and OpenIndex regarding the use of the Services and supersede all prior agreements and understandings.</p>

<hr>

<h3>12. Contact</h3>
<p>For questions about these Terms of Use, contact us at:</p>
<ul>
  <li><strong>Email:</strong> <a href="mailto:legal@openindex.org">legal@openindex.org</a></li>
  <li><strong>Mail:</strong> OpenIndex Foundation, 548 Market Street, Suite 35435, San Francisco, CA 94104, USA</li>
</ul>
`
