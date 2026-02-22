export const privacyPage = `
<h2>Privacy Policy</h2>
<p><strong>Last updated:</strong> February 1, 2026</p>

<p>The OpenIndex Foundation ("OpenIndex", "we", "us", "our") is committed to protecting your privacy. This Privacy Policy explains what information we collect, how we use it, and your rights regarding that information.</p>

<p>This policy applies to the OpenIndex website (openindex.org), the OpenIndex API (api.openindex.org), and related services.</p>

<hr>

<h3>1. Information We Collect</h3>

<h4>Information You Provide</h4>
<ul>
  <li><strong>Contact form submissions</strong> -- When you contact us through the website, we collect your name, email address, and message content.</li>
  <li><strong>API key registration</strong> -- When you register for an API key, we collect your name, email address, and optionally your organization and intended use case.</li>
  <li><strong>Mailing list</strong> -- If you subscribe to our mailing list, we collect your email address.</li>
  <li><strong>Community accounts</strong> -- If you participate in our Discord or GitHub communities, your profile information is governed by those platforms' privacy policies.</li>
</ul>

<h4>Information Collected Automatically</h4>
<ul>
  <li><strong>API usage logs</strong> -- We log API requests including IP address, user agent, API key (if provided), endpoint, query parameters, response status, and response time. Logs are retained for 90 days for operational purposes.</li>
  <li><strong>Website analytics</strong> -- We use privacy-respecting analytics (no cookies, no personal data) to understand aggregate traffic patterns. We do not use Google Analytics or any third-party tracking service that profiles individual users.</li>
  <li><strong>Server logs</strong> -- Standard web server logs including IP address, user agent, and requested URL. Retained for 30 days.</li>
</ul>

<hr>

<h3>2. How We Use Your Information</h3>
<p>We use collected information for the following purposes:</p>
<ul>
  <li><strong>Service operation</strong> -- To provide, maintain, and improve the OpenIndex platform and API.</li>
  <li><strong>Communication</strong> -- To respond to your inquiries and send service-related notifications.</li>
  <li><strong>Abuse prevention</strong> -- To detect and prevent misuse of the API, including rate limit enforcement and bot detection.</li>
  <li><strong>Aggregate analytics</strong> -- To understand usage patterns and inform infrastructure capacity planning. All analytics are aggregated and anonymized.</li>
</ul>

<p>We do not sell, rent, or share your personal information with third parties for marketing purposes. We do not use your information for advertising or profiling.</p>

<hr>

<h3>3. Web Crawl Data</h3>
<p>OpenIndex crawls the public web and stores the content it finds. This data may include personal information that appears on publicly accessible web pages. Important details about how we handle crawl data:</p>

<ul>
  <li><strong>Public data only</strong> -- We only crawl publicly accessible web pages. We do not crawl pages behind logins, paywalls, or authentication.</li>
  <li><strong>Robots.txt compliance</strong> -- We fully respect robots.txt directives. Website owners can block our crawler (<code>OpenIndexBot</code>) at any time.</li>
  <li><strong>Content removal</strong> -- Website owners and individuals can request removal of specific content from the index. See the "Content Removal" section below.</li>
  <li><strong>No enrichment</strong> -- We do not combine crawl data with other data sources to build profiles of individuals.</li>
</ul>

<hr>

<h3>4. Cookies</h3>
<p>The OpenIndex website uses only essential cookies required for basic functionality:</p>

<table>
  <thead>
    <tr>
      <th>Cookie</th>
      <th>Purpose</th>
      <th>Duration</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>session</code></td>
      <td>Session management for authenticated areas</td>
      <td>Session (expires on browser close)</td>
    </tr>
    <tr>
      <td><code>csrf_token</code></td>
      <td>Cross-site request forgery protection for forms</td>
      <td>Session</td>
    </tr>
  </tbody>
</table>

<p>We do not use tracking cookies, advertising cookies, or third-party cookies. We do not use fingerprinting or any other non-cookie tracking technology.</p>

<hr>

<h3>5. Data Retention</h3>

<table>
  <thead>
    <tr>
      <th>Data Type</th>
      <th>Retention Period</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Contact form submissions</td>
      <td>1 year, then deleted</td>
    </tr>
    <tr>
      <td>API key registration data</td>
      <td>Duration of account, plus 30 days after deletion</td>
    </tr>
    <tr>
      <td>API usage logs</td>
      <td>90 days</td>
    </tr>
    <tr>
      <td>Server logs</td>
      <td>30 days</td>
    </tr>
    <tr>
      <td>Mailing list subscriptions</td>
      <td>Until you unsubscribe</td>
    </tr>
    <tr>
      <td>Web crawl data</td>
      <td>Indefinitely (public archive)</td>
    </tr>
  </tbody>
</table>

<hr>

<h3>6. Data Security</h3>
<p>We implement appropriate technical and organizational measures to protect your personal information:</p>
<ul>
  <li>All data in transit is encrypted via TLS 1.3.</li>
  <li>Data at rest is encrypted using AES-256.</li>
  <li>Access to personal data is restricted to authorized personnel on a need-to-know basis.</li>
  <li>We conduct regular security reviews and maintain an incident response plan.</li>
</ul>

<hr>

<h3>7. GDPR Compliance</h3>
<p>If you are located in the European Economic Area (EEA), you have the following rights under the General Data Protection Regulation (GDPR):</p>

<ul>
  <li><strong>Right of access</strong> -- You can request a copy of the personal data we hold about you.</li>
  <li><strong>Right to rectification</strong> -- You can request correction of inaccurate personal data.</li>
  <li><strong>Right to erasure</strong> -- You can request deletion of your personal data ("right to be forgotten").</li>
  <li><strong>Right to restriction</strong> -- You can request that we restrict processing of your personal data.</li>
  <li><strong>Right to data portability</strong> -- You can request your data in a structured, machine-readable format.</li>
  <li><strong>Right to object</strong> -- You can object to processing of your personal data for specific purposes.</li>
</ul>

<p>To exercise any of these rights, contact us at <a href="mailto:privacy@openindex.org">privacy@openindex.org</a>. We will respond within 30 days.</p>

<p>Our legal basis for processing personal data is:</p>
<ul>
  <li><strong>Legitimate interest</strong> -- For API usage logs and abuse prevention.</li>
  <li><strong>Consent</strong> -- For mailing list subscriptions and contact form submissions.</li>
  <li><strong>Contract performance</strong> -- For API key registration and service delivery.</li>
</ul>

<hr>

<h3>8. Content Removal</h3>
<p>If you are a website owner or an individual whose personal information appears in the OpenIndex crawl data, you can request removal:</p>

<ul>
  <li><strong>Website owners:</strong> Add <code>User-agent: OpenIndexBot</code> / <code>Disallow: /</code> to your robots.txt to prevent future crawling. To remove existing data, email <a href="mailto:removal@openindex.org">removal@openindex.org</a> with the affected URLs.</li>
  <li><strong>Individuals:</strong> If your personal information appears on a crawled page and you want it removed from the index, email <a href="mailto:removal@openindex.org">removal@openindex.org</a> with details.</li>
</ul>

<p>We process removal requests within 5 business days.</p>

<hr>

<h3>9. International Data Transfers</h3>
<p>OpenIndex infrastructure is distributed globally. Your data may be processed in the United States, European Union, and other jurisdictions where our servers are located. We ensure appropriate safeguards are in place for international data transfers, including Standard Contractual Clauses where required by GDPR.</p>

<hr>

<h3>10. Children's Privacy</h3>
<p>OpenIndex services are not directed at children under the age of 13. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us at <a href="mailto:privacy@openindex.org">privacy@openindex.org</a>.</p>

<hr>

<h3>11. Changes to This Policy</h3>
<p>We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated "Last updated" date. For significant changes, we will provide notice via the website or email (for registered users). Your continued use of OpenIndex services after changes constitutes acceptance of the updated policy.</p>

<hr>

<h3>12. Contact Us</h3>
<p>For any questions or concerns about this Privacy Policy or our data practices, contact us at:</p>
<ul>
  <li><strong>Email:</strong> <a href="mailto:privacy@openindex.org">privacy@openindex.org</a></li>
  <li><strong>Mail:</strong> OpenIndex Foundation, 548 Market Street, Suite 35435, San Francisco, CA 94104, USA</li>
</ul>
`
