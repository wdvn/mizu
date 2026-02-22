export const contactPage = `
<h2>Contact Us</h2>
<p>Have a question, want to report an issue, or interested in collaborating? We would love to hear from you. Fill out the form below or reach us through any of the channels listed on this page.</p>

<hr>

<h3>Send Us a Message</h3>

<form action="/api/contact" method="POST">
  <div class="form-group">
    <label for="name">Name</label>
    <input type="text" id="name" name="name" class="form-input" placeholder="Your name" required>
  </div>
  <div class="form-group">
    <label for="email">Email</label>
    <input type="email" id="email" name="email" class="form-input" placeholder="you@example.com" required>
  </div>
  <div class="form-group">
    <label for="subject">Subject</label>
    <select id="subject" name="subject" class="form-input">
      <option value="general">General Inquiry</option>
      <option value="partnership">Partnership / Collaboration</option>
      <option value="api">API Support</option>
      <option value="data">Data Access / Downloads</option>
      <option value="removal">Content Removal Request</option>
      <option value="research">Research Collaboration</option>
      <option value="bug">Bug Report</option>
      <option value="other">Other</option>
    </select>
  </div>
  <div class="form-group">
    <label for="message">Message</label>
    <textarea id="message" name="message" class="form-input" placeholder="Tell us how we can help..." rows="6" required></textarea>
  </div>
  <button type="submit" class="btn-primary" style="border:none;cursor:pointer;font-size:0.95rem">Send Message</button>
</form>

<hr>

<h3>Other Ways to Reach Us</h3>

<div class="card-grid">
  <div class="card">
    <h3>Email</h3>
    <p>For general inquiries:</p>
    <p><a href="mailto:hello@openindex.org">hello@openindex.org</a></p>
    <p style="margin-top:0.75rem">For specific topics:</p>
    <ul style="margin-top:0.25rem">
      <li><a href="mailto:research@openindex.org">research@openindex.org</a> -- Research collaborations</li>
      <li><a href="mailto:partners@openindex.org">partners@openindex.org</a> -- Partnerships</li>
      <li><a href="mailto:removal@openindex.org">removal@openindex.org</a> -- Content removal</li>
      <li><a href="mailto:privacy@openindex.org">privacy@openindex.org</a> -- Privacy concerns</li>
      <li><a href="mailto:legal@openindex.org">legal@openindex.org</a> -- Legal matters</li>
    </ul>
  </div>
  <div class="card">
    <h3>Community Support</h3>
    <p>For technical questions, feature requests, and community discussion, use our public channels:</p>
    <ul>
      <li><strong><a href="https://discord.gg/openindex">Discord</a></strong> -- Real-time chat with the team and community. Best for quick questions and discussion.</li>
      <li><strong><a href="https://github.com/openindex/openindex/discussions">GitHub Discussions</a></strong> -- Long-form conversations about features, architecture, and roadmap.</li>
      <li><strong><a href="https://github.com/openindex/openindex/issues">GitHub Issues</a></strong> -- Bug reports and feature requests with tracking.</li>
    </ul>
  </div>
  <div class="card">
    <h3>Mailing Address</h3>
    <p>OpenIndex Foundation<br>
    548 Market Street<br>
    Suite 35435<br>
    San Francisco, CA 94104<br>
    United States</p>
  </div>
</div>

<hr>

<h3>Mailing List</h3>
<p>Subscribe to our mailing list for monthly updates on new crawl releases, platform features, research highlights, and community news. Low volume — typically one email per month.</p>

<div style="display:flex;gap:0.5rem;max-width:480px;margin:1rem 0">
  <input type="email" class="form-input" placeholder="you@example.com" style="flex:1">
  <button class="btn-primary" style="border:none;cursor:pointer;white-space:nowrap;padding:0.65rem 1.25rem">Subscribe</button>
</div>

<p style="font-size:0.85rem;color:#64748b">You can unsubscribe at any time. We will never share your email with third parties. See our <a href="/privacy">Privacy Policy</a>.</p>

<hr>

<h3>Response Times</h3>
<p>We aim to respond to all inquiries promptly:</p>

<table>
  <thead>
    <tr>
      <th>Channel</th>
      <th>Typical Response Time</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Contact form / Email</td>
      <td>1-3 business days</td>
    </tr>
    <tr>
      <td>Content removal requests</td>
      <td>5 business days</td>
    </tr>
    <tr>
      <td>Discord</td>
      <td>Same day (during business hours UTC)</td>
    </tr>
    <tr>
      <td>GitHub Issues</td>
      <td>3-5 business days</td>
    </tr>
    <tr>
      <td>Partnership inquiries</td>
      <td>5 business days</td>
    </tr>
  </tbody>
</table>
`
