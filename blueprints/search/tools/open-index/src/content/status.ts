export const statusPage = `
<div style="background:#dcfce7;border:2px solid #86efac;border-radius:12px;padding:1.5rem 2rem;margin-bottom:2rem;display:flex;align-items:center;gap:1rem">
  <div style="width:16px;height:16px;background:#16a34a;border-radius:50%;flex-shrink:0"></div>
  <div>
    <div style="font-weight:700;font-size:1.15rem;color:#166534">All Systems Operational</div>
    <div style="color:#15803d;font-size:0.9rem">Last updated: February 23, 2026 at 14:30 UTC</div>
  </div>
</div>

<h2>Component Status</h2>

<div class="status-item">
  <span class="status-name">Distributed Crawler</span>
  <span class="status-badge status-operational">Operational</span>
</div>
<div class="status-item">
  <span class="status-name">CDX Index API</span>
  <span class="status-badge status-operational">Operational</span>
</div>
<div class="status-item">
  <span class="status-name">Full-Text Search API</span>
  <span class="status-badge status-operational">Operational</span>
</div>
<div class="status-item">
  <span class="status-name">Vector Search API</span>
  <span class="status-badge status-operational">Operational</span>
</div>
<div class="status-item">
  <span class="status-name">Knowledge Graph API</span>
  <span class="status-badge status-operational">Operational</span>
</div>
<div class="status-item">
  <span class="status-name">Data CDN (data.openindex.org)</span>
  <span class="status-badge status-operational">Operational</span>
</div>
<div class="status-item">
  <span class="status-name">Bulk Download (S3)</span>
  <span class="status-badge status-operational">Operational</span>
</div>

<hr>

<h2>Uptime Statistics</h2>
<p>Rolling uptime percentages for the past 90 days.</p>

<table>
  <thead>
    <tr>
      <th>Component</th>
      <th>Last 24h</th>
      <th>Last 7 days</th>
      <th>Last 30 days</th>
      <th>Last 90 days</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>CDX Index API</strong></td>
      <td>100.00%</td>
      <td>100.00%</td>
      <td>99.98%</td>
      <td>99.97%</td>
    </tr>
    <tr>
      <td><strong>Full-Text Search API</strong></td>
      <td>100.00%</td>
      <td>100.00%</td>
      <td>99.95%</td>
      <td>99.93%</td>
    </tr>
    <tr>
      <td><strong>Vector Search API</strong></td>
      <td>100.00%</td>
      <td>99.99%</td>
      <td>99.91%</td>
      <td>99.88%</td>
    </tr>
    <tr>
      <td><strong>Knowledge Graph API</strong></td>
      <td>100.00%</td>
      <td>100.00%</td>
      <td>99.97%</td>
      <td>99.95%</td>
    </tr>
    <tr>
      <td><strong>Data CDN</strong></td>
      <td>100.00%</td>
      <td>100.00%</td>
      <td>99.99%</td>
      <td>99.99%</td>
    </tr>
    <tr>
      <td><strong>Bulk Download (S3)</strong></td>
      <td>100.00%</td>
      <td>100.00%</td>
      <td>100.00%</td>
      <td>99.99%</td>
    </tr>
  </tbody>
</table>

<hr>

<h2>Response Time (P99)</h2>

<table>
  <thead>
    <tr>
      <th>Endpoint</th>
      <th>P50</th>
      <th>P95</th>
      <th>P99</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>GET /v1/search</strong></td>
      <td>45 ms</td>
      <td>120 ms</td>
      <td>280 ms</td>
    </tr>
    <tr>
      <td><strong>GET /v1/url</strong></td>
      <td>12 ms</td>
      <td>35 ms</td>
      <td>85 ms</td>
    </tr>
    <tr>
      <td><strong>GET /v1/domain</strong></td>
      <td>30 ms</td>
      <td>95 ms</td>
      <td>210 ms</td>
    </tr>
    <tr>
      <td><strong>POST /v1/vector/search</strong></td>
      <td>65 ms</td>
      <td>150 ms</td>
      <td>320 ms</td>
    </tr>
    <tr>
      <td><strong>GET /v1/graph/entity</strong></td>
      <td>25 ms</td>
      <td>80 ms</td>
      <td>190 ms</td>
    </tr>
    <tr>
      <td><strong>GET /v1/graph/traverse</strong></td>
      <td>85 ms</td>
      <td>250 ms</td>
      <td>580 ms</td>
    </tr>
  </tbody>
</table>

<hr>

<h2>Incident History</h2>

<details>
  <summary>
    <span style="display:flex;align-items:center;gap:0.75rem;flex:1">
      <span style="font-size:0.8rem;color:#64748b;min-width:100px">Feb 12, 2026</span>
      <span>Vector Search API -- Elevated Latency</span>
      <span style="font-size:0.75rem;font-weight:600;padding:0.15rem 0.5rem;border-radius:10px;background:#fef9c3;color:#854d0e;margin-left:auto">Resolved</span>
    </span>
  </summary>
  <div class="details-body">
    <p><strong>Duration:</strong> 2 hours 15 minutes (06:30 - 08:45 UTC)</p>
    <p><strong>Impact:</strong> Vector search requests experienced P99 latency of 2.8 seconds (normal: 320 ms). Approximately 3% of requests timed out. All other services were unaffected.</p>
    <p><strong>Root Cause:</strong> A Vald agent node in the us-east-1 cluster ran out of memory during an index compaction operation, causing queries routed to that node to fall back to slower backup indices.</p>
    <p><strong>Resolution:</strong> The affected node was restarted with increased memory allocation (128 GB to 192 GB). Index compaction is now scheduled during low-traffic windows (02:00-04:00 UTC).</p>
  </div>
</details>

<details>
  <summary>
    <span style="display:flex;align-items:center;gap:0.75rem;flex:1">
      <span style="font-size:0.8rem;color:#64748b;min-width:100px">Jan 28, 2026</span>
      <span>Full-Text Search API -- Partial Outage</span>
      <span style="font-size:0.75rem;font-weight:600;padding:0.15rem 0.5rem;border-radius:10px;background:#fef9c3;color:#854d0e;margin-left:auto">Resolved</span>
    </span>
  </summary>
  <div class="details-body">
    <p><strong>Duration:</strong> 45 minutes (14:10 - 14:55 UTC)</p>
    <p><strong>Impact:</strong> Full-text search returned 503 errors for approximately 15% of requests. Queries routed to the eu-west-1 cluster were unaffected. CDX, vector search, and knowledge graph APIs were not impacted.</p>
    <p><strong>Root Cause:</strong> A misconfigured Tantivy index shard in us-west-2 caused a cascading failure when the index was rotated to include the new OI-2026-01 crawl data. The shard's segment merge exceeded available disk space.</p>
    <p><strong>Resolution:</strong> The affected shard was rebuilt from the replica. Disk space monitoring was added to the pre-rotation checklist, and the index rotation process now includes a dry-run step.</p>
  </div>
</details>

<details>
  <summary>
    <span style="display:flex;align-items:center;gap:0.75rem;flex:1">
      <span style="font-size:0.8rem;color:#64748b;min-width:100px">Jan 15, 2026</span>
      <span>Data CDN -- Degraded Performance</span>
      <span style="font-size:0.75rem;font-weight:600;padding:0.15rem 0.5rem;border-radius:10px;background:#fef9c3;color:#854d0e;margin-left:auto">Resolved</span>
    </span>
  </summary>
  <div class="details-body">
    <p><strong>Duration:</strong> 3 hours 30 minutes (20:00 - 23:30 UTC)</p>
    <p><strong>Impact:</strong> Download speeds from data.openindex.org were reduced by approximately 60% for users in Asia-Pacific and Europe. North America was unaffected. S3 direct access (s3://openindex/) was not impacted.</p>
    <p><strong>Root Cause:</strong> A CDN provider (Cloudflare) experienced a regional routing issue affecting edge nodes in Singapore and Frankfurt. Traffic was rerouted to more distant edge nodes, increasing latency and reducing throughput.</p>
    <p><strong>Resolution:</strong> The CDN provider resolved the routing issue. No action was required on the OpenIndex side. We have since added a secondary CDN endpoint for failover.</p>
  </div>
</details>

<hr>

<h2>Subscribe to Status Updates</h2>
<p>Stay informed about outages, maintenance windows, and incident resolutions.</p>

<div class="card-grid">
  <div class="card">
    <h3>RSS Feed</h3>
    <p>Subscribe to our status RSS feed for real-time updates delivered to your feed reader.</p>
    <p><a href="https://status.openindex.org/feed.xml">https://status.openindex.org/feed.xml</a></p>
  </div>
  <div class="card">
    <h3>Email Notifications</h3>
    <p>Receive email alerts for incidents and scheduled maintenance.</p>
    <div class="form-group" style="margin-top:0.75rem;margin-bottom:0">
      <div style="display:flex;gap:0.5rem">
        <input type="email" class="form-input" placeholder="you@example.com" style="flex:1">
        <button class="btn-primary" style="border:none;cursor:pointer;white-space:nowrap;padding:0.65rem 1.25rem">Subscribe</button>
      </div>
    </div>
  </div>
  <div class="card">
    <h3>Discord</h3>
    <p>Join the #status channel on our Discord server for real-time updates and discussion during incidents.</p>
    <p><a href="https://discord.gg/openindex">Join Discord &rarr;</a></p>
  </div>
</div>

<hr>

<h2>Scheduled Maintenance</h2>
<div class="note">
  <strong>No upcoming maintenance scheduled.</strong> Maintenance windows are typically announced 48 hours in advance and scheduled during low-traffic periods (Tuesday/Wednesday 02:00-06:00 UTC).
</div>
`
