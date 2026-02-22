export const css = /* css */`
/* ===== CSS Variables (Geist-inspired) ===== */
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #fafafa;
  --bg-tertiary: #f2f2f2;
  --bg-hover: #ebebeb;
  --fg-primary: #171717;
  --fg-secondary: #666666;
  --fg-tertiary: #8f8f8f;
  --fg-muted: #a8a8a8;
  --border-default: rgba(0,0,0,0.08);
  --border-hover: rgba(0,0,0,0.15);
  --border-active: rgba(0,0,0,0.21);
  --blue-50: #f0f7ff;
  --blue-100: #e0efff;
  --blue-500: #0070f3;
  --blue-600: #0060d1;
  --blue-700: #004fa3;
  --green-50: #e6f9ed;
  --green-600: #45a557;
  --green-700: #2e7d42;
  --red-50: #fef0f0;
  --red-600: #e5484d;
  --amber-50: #fef9e8;
  --amber-600: #d4820c;
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.03);
  --shadow-md: 0 2px 8px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04);
  --shadow-lg: 0 4px 12px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.06);
  --shadow-xl: 0 8px 24px rgba(0,0,0,0.06), 0 16px 48px rgba(0,0,0,0.08);
  --transition: 200ms ease;
  --max-width: 1200px;
  --max-text: 720px;
  --font-sans: 'Geist', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'Geist Mono', 'JetBrains Mono', 'Fira Code', monospace;
}

/* ===== Reset ===== */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html {
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: var(--fg-primary);
  background: var(--bg-primary);
  font-size: 16px;
  line-height: 1.6;
  scroll-behavior: smooth;
}

body { min-height: 100vh; display: flex; flex-direction: column; }

a { color: var(--blue-500); text-decoration: none; transition: color var(--transition); }
a:hover { color: var(--blue-600); }

img { max-width: 100%; height: auto; display: block; }

/* ===== Typography ===== */
h1, h2, h3, h4 { color: var(--fg-primary); line-height: 1.25; letter-spacing: -0.02em; font-weight: 600; }
h1 { font-size: 2.5rem; letter-spacing: -0.03em; margin-bottom: 0.75rem; }
h2 { font-size: 1.5rem; margin: 2.5rem 0 0.75rem; }
h3 { font-size: 1.125rem; margin: 2rem 0 0.5rem; }
h4 { font-size: 1rem; margin: 1.5rem 0 0.5rem; }
p { margin-bottom: 1rem; color: var(--fg-secondary); line-height: 1.65; }
ul, ol { margin: 0.5rem 0 1.25rem 1.25rem; color: var(--fg-secondary); }
li { margin-bottom: 0.3rem; line-height: 1.6; }
strong { color: var(--fg-primary); font-weight: 600; }

hr { border: none; border-top: 1px solid var(--border-default); margin: 2rem 0; }

/* ===== Code ===== */
code {
  font-family: var(--font-mono);
  font-size: 0.875em;
  background: var(--bg-tertiary);
  padding: 0.125em 0.375em;
  border-radius: 4px;
  color: var(--fg-primary);
}

pre {
  font-family: var(--font-mono);
  font-size: 0.875rem;
  background: #111111;
  color: #ededed;
  padding: 1rem 1.25rem;
  border-radius: var(--radius-md);
  overflow-x: auto;
  line-height: 1.6;
  margin: 1.25rem 0;
  border: 1px solid rgba(255,255,255,0.06);
}

pre code { background: none; padding: 0; color: inherit; font-size: inherit; }

/* ===== Tables ===== */
table { width: 100%; border-collapse: collapse; margin: 1.25rem 0; font-size: 0.875rem; }
th, td { padding: 0.625rem 0.875rem; text-align: left; border-bottom: 1px solid var(--border-default); }
th { font-weight: 500; color: var(--fg-secondary); font-size: 0.8125rem; letter-spacing: 0.01em; }
td { color: var(--fg-primary); }
tr:last-child td { border-bottom: none; }

blockquote {
  border-left: 2px solid var(--border-active);
  padding: 0.75rem 1.25rem;
  margin: 1.25rem 0;
  color: var(--fg-secondary);
}
blockquote p { margin: 0; }

/* ===== Scrollbar ===== */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--bg-hover); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--fg-muted); }

/* ===== Header ===== */
.header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(255,255,255,0.8);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  border-bottom: 1px solid var(--border-default);
}

.header-inner {
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 0 1.5rem;
  display: flex;
  align-items: center;
  height: 64px;
  gap: 2rem;
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  color: var(--fg-primary);
  text-decoration: none;
  letter-spacing: -0.01em;
  flex-shrink: 0;
}

.logo:hover { color: var(--fg-primary); }

.logo-icon {
  width: 26px;
  height: 26px;
  background: var(--fg-primary);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-size: 0.6875rem;
  letter-spacing: -0.02em;
}

.nav { display: flex; align-items: center; gap: 0; flex: 1; }

.nav-group { position: relative; }

.nav-group-btn {
  background: none;
  border: none;
  font-family: inherit;
  color: var(--fg-secondary);
  font-size: 0.875rem;
  font-weight: 400;
  padding: 0.375rem 0.625rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: color var(--transition);
  display: flex;
  align-items: center;
  gap: 0.125rem;
  white-space: nowrap;
}

.nav-group-btn:hover { color: var(--fg-primary); }

.nav-group-btn svg {
  width: 12px;
  height: 12px;
  opacity: 0.5;
  transition: transform var(--transition);
}

.nav-group:hover .nav-group-btn svg { transform: rotate(180deg); }

.nav-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  left: -8px;
  background: var(--bg-primary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  padding: 0.375rem;
  min-width: 200px;
  box-shadow: var(--shadow-xl);
  opacity: 0;
  visibility: hidden;
  transform: translateY(-4px);
  transition: all var(--transition);
}

.nav-group:hover .nav-dropdown {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}

.nav-dropdown a {
  display: block;
  padding: 0.5rem 0.75rem;
  color: var(--fg-secondary);
  font-size: 0.875rem;
  border-radius: var(--radius-sm);
  transition: all var(--transition);
}

.nav-dropdown a:hover {
  background: var(--bg-secondary);
  color: var(--fg-primary);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
  margin-left: auto;
}

.github-link {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  color: var(--fg-secondary);
  font-size: 0.875rem;
  padding: 0.375rem 0.75rem;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-sm);
  transition: all var(--transition);
}

.github-link:hover { background: var(--bg-secondary); color: var(--fg-primary); border-color: var(--border-hover); }

.mobile-toggle {
  display: none;
  background: none;
  border: none;
  padding: 0.375rem;
  cursor: pointer;
  color: var(--fg-secondary);
}

@media (max-width: 1024px) {
  .nav { display: none; }
  .mobile-toggle { display: block; }
}

/* ===== Hero ===== */
.hero {
  padding: 6rem 1.5rem 5rem;
  text-align: center;
  background: var(--bg-primary);
}

.hero h1 {
  font-size: 4rem;
  line-height: 1.1;
  letter-spacing: -0.04em;
  font-weight: 700;
  max-width: 740px;
  margin: 0 auto 1rem;
  color: var(--fg-primary);
}

.hero-sub {
  font-size: 1.125rem;
  color: var(--fg-secondary);
  max-width: 560px;
  margin: 0 auto 2.5rem;
  line-height: 1.6;
}

.hero-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  flex-wrap: wrap;
}

@media (max-width: 640px) {
  .hero { padding: 3.5rem 1.5rem 3rem; }
  .hero h1 { font-size: 2.5rem; }
  .hero-sub { font-size: 1rem; }
}

/* ===== Buttons ===== */
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  background: var(--fg-primary);
  color: var(--bg-primary);
  padding: 0.625rem 1.25rem;
  border-radius: var(--radius-md);
  font-weight: 500;
  font-size: 0.875rem;
  transition: all var(--transition);
  text-decoration: none;
  border: 1px solid var(--fg-primary);
}

.btn-primary:hover { background: #333; color: white; }

.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  background: var(--bg-primary);
  color: var(--fg-primary);
  padding: 0.625rem 1.25rem;
  border-radius: var(--radius-md);
  font-weight: 500;
  font-size: 0.875rem;
  border: 1px solid var(--border-default);
  transition: all var(--transition);
  text-decoration: none;
}

.btn-secondary:hover { background: var(--bg-secondary); border-color: var(--border-hover); color: var(--fg-primary); }

/* ===== Stats ===== */
.stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0;
  max-width: 800px;
  margin: 4rem auto 0;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.stat {
  text-align: center;
  padding: 1.75rem 1rem;
  border-right: 1px solid var(--border-default);
}

.stat:last-child { border-right: none; }

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--fg-primary);
  line-height: 1.2;
  letter-spacing: -0.03em;
}

.stat-label {
  font-size: 0.8125rem;
  color: var(--fg-tertiary);
  margin-top: 0.25rem;
}

@media (max-width: 640px) {
  .stats { grid-template-columns: repeat(2, 1fr); }
  .stat:nth-child(2) { border-right: none; }
  .stat:nth-child(1), .stat:nth-child(2) { border-bottom: 1px solid var(--border-default); }
}

/* ===== Container / Content ===== */
.container { max-width: var(--max-width); margin: 0 auto; padding: 0 1.5rem; }

.content {
  max-width: var(--max-text);
  margin: 0 auto;
  padding: 3rem 1.5rem 5rem;
}

.content-wide { max-width: 1000px; margin: 0 auto; padding: 3rem 1.5rem 5rem; }

/* ===== Page Header ===== */
.page-header {
  padding: 4rem 1.5rem 3rem;
  border-bottom: 1px solid var(--border-default);
}

.page-header-inner {
  max-width: var(--max-text);
  margin: 0 auto;
}

.page-header h1 { margin-bottom: 0.5rem; font-size: 2rem; }

.page-header p { font-size: 1.0625rem; color: var(--fg-secondary); margin: 0; }

.breadcrumb {
  font-size: 0.8125rem;
  color: var(--fg-tertiary);
  margin-bottom: 0.5rem;
}

.breadcrumb a { color: var(--fg-secondary); }
.breadcrumb a:hover { color: var(--fg-primary); }

/* ===== Cards ===== */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
  margin: 1.5rem 0;
}

.card {
  background: var(--bg-primary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  transition: border-color var(--transition), box-shadow var(--transition);
}

.card:hover {
  border-color: var(--border-hover);
  box-shadow: var(--shadow-md);
}

.card-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  margin-bottom: 0.875rem;
}

.card h3 { margin: 0 0 0.375rem; font-size: 0.9375rem; }

.card p { color: var(--fg-secondary); font-size: 0.875rem; margin: 0; line-height: 1.55; }

.card-link {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  margin-top: 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--blue-500);
}

.card-link:hover { gap: 0.375rem; }

/* ===== Sections ===== */
.section { padding: 5rem 1.5rem; }
.section-alt { background: var(--bg-secondary); }

.section-header {
  text-align: center;
  max-width: 560px;
  margin: 0 auto 2.5rem;
}

.section-header h2 { margin: 0 0 0.5rem; font-size: 1.75rem; letter-spacing: -0.03em; }
.section-header p { color: var(--fg-secondary); font-size: 1rem; }

/* ===== Blog ===== */
.blog-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin: 1.5rem 0; }
@media (max-width: 768px) { .blog-grid { grid-template-columns: 1fr; } }

.blog-card {
  background: var(--bg-primary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: border-color var(--transition), box-shadow var(--transition);
  text-decoration: none;
  color: inherit;
  display: block;
}

.blog-card:hover { border-color: var(--border-hover); box-shadow: var(--shadow-md); color: inherit; }

.blog-card-img {
  width: 100%;
  height: 160px;
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  border-bottom: 1px solid var(--border-default);
}

.blog-card-body { padding: 1.25rem; }

.blog-card-tag {
  display: inline-block;
  font-size: 0.6875rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--fg-secondary);
  background: var(--bg-tertiary);
  padding: 0.125rem 0.5rem;
  border-radius: 999px;
  margin-bottom: 0.5rem;
}

.blog-card-body h3 { font-size: 0.9375rem; margin: 0 0 0.375rem; line-height: 1.4; }
.blog-card-body p { font-size: 0.8125rem; color: var(--fg-secondary); margin: 0; line-height: 1.5; }

/* ===== Collaborators ===== */
.collab-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 0.75rem;
  margin: 1.5rem 0;
}

.collab-card {
  background: var(--bg-primary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  padding: 1.25rem 0.75rem;
  text-align: center;
  transition: border-color var(--transition);
}

.collab-card:hover { border-color: var(--border-hover); }
.collab-card-name { font-weight: 500; font-size: 0.8125rem; color: var(--fg-primary); }

/* ===== Team ===== */
.team-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.5rem;
  margin: 1rem 0 2.5rem;
}

.team-card { text-align: center; padding: 1.5rem 1rem; }

.team-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--bg-tertiary);
  margin: 0 auto 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  font-weight: 600;
  color: var(--fg-secondary);
}

.team-card h4 { margin: 0 0 0.125rem; font-size: 0.875rem; }
.team-card p { font-size: 0.8125rem; color: var(--fg-tertiary); margin: 0; }

/* ===== Status ===== */
.status-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  margin-bottom: 0.5rem;
}

.status-name { font-weight: 500; font-size: 0.875rem; }

.status-badge {
  font-size: 0.75rem;
  font-weight: 500;
  padding: 0.125rem 0.625rem;
  border-radius: 999px;
}

.status-operational { background: var(--green-50); color: var(--green-700); }

/* ===== Accordion ===== */
details {
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  margin-bottom: 0.5rem;
}

summary {
  padding: 0.75rem 1rem;
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  user-select: none;
  list-style: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: background var(--transition);
}

summary:hover { background: var(--bg-secondary); }
summary::-webkit-details-marker { display: none; }

summary::after {
  content: '+';
  font-size: 1.125rem;
  color: var(--fg-tertiary);
  font-weight: 300;
  line-height: 1;
}

details[open] summary::after { content: '\\2212'; }
details[open] summary { border-bottom: 1px solid var(--border-default); }

.details-body { padding: 1rem; }
.details-body p:last-child { margin-bottom: 0; }

/* ===== Footer ===== */
.footer {
  background: var(--bg-primary);
  border-top: 1px solid var(--border-default);
  padding: 3.5rem 1.5rem 2rem;
  margin-top: auto;
}

.footer-inner { max-width: var(--max-width); margin: 0 auto; }

.footer-grid {
  display: grid;
  grid-template-columns: 1.5fr repeat(5, 1fr);
  gap: 2rem;
  margin-bottom: 2.5rem;
}

@media (max-width: 768px) {
  .footer-grid { grid-template-columns: 1fr 1fr; gap: 1.5rem; }
}

.footer-brand h3 { color: var(--fg-primary); font-size: 0.9375rem; margin-bottom: 0.5rem; font-weight: 600; }
.footer-brand p { font-size: 0.8125rem; color: var(--fg-tertiary); line-height: 1.5; }

.footer-col h4 {
  color: var(--fg-tertiary);
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.75rem;
}

.footer-col a {
  display: block;
  color: var(--fg-secondary);
  font-size: 0.8125rem;
  padding: 0.2rem 0;
  transition: color var(--transition);
}

.footer-col a:hover { color: var(--fg-primary); }

.footer-bottom {
  border-top: 1px solid var(--border-default);
  padding-top: 1.25rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8125rem;
  color: var(--fg-tertiary);
  flex-wrap: wrap;
  gap: 0.75rem;
}

.footer-bottom a { color: var(--fg-tertiary); }
.footer-bottom a:hover { color: var(--fg-primary); }
.footer-social { display: flex; gap: 1rem; }

/* ===== Timeline/Roadmap ===== */
.timeline { position: relative; padding-left: 1.75rem; }
.timeline::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.25rem;
  bottom: 0.25rem;
  width: 1px;
  background: var(--border-default);
}

.timeline-item { position: relative; padding-bottom: 1.75rem; }
.timeline-item::before {
  content: '';
  position: absolute;
  left: -1.75rem;
  top: 0.375rem;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--blue-500);
  transform: translateX(-3.5px);
}

.timeline-item.completed::before { background: var(--green-600); }
.timeline-item.upcoming::before { background: var(--bg-hover); }

.timeline-date { font-size: 0.8125rem; font-weight: 500; color: var(--fg-tertiary); margin-bottom: 0.125rem; }
.timeline-item h3 { margin: 0 0 0.25rem; font-size: 0.9375rem; }
.timeline-item p { margin: 0; font-size: 0.875rem; color: var(--fg-secondary); }

/* ===== Notes ===== */
.note {
  background: var(--blue-50);
  border: 1px solid var(--blue-100);
  border-radius: var(--radius-md);
  padding: 0.75rem 1rem;
  margin: 1.25rem 0;
  font-size: 0.875rem;
  color: var(--blue-700);
}

.note-warn {
  background: var(--amber-50);
  border-color: #fde68a;
  color: var(--amber-600);
}

/* ===== API Endpoints ===== */
.endpoint {
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  margin-bottom: 1.25rem;
  overflow: hidden;
}

.endpoint-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-default);
}

.endpoint-method {
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  text-transform: uppercase;
}

.method-get { background: var(--green-50); color: var(--green-700); }
.method-post { background: var(--blue-50); color: var(--blue-700); }

.endpoint-path { font-family: var(--font-mono); font-size: 0.8125rem; color: var(--fg-primary); }
.endpoint-body { padding: 1rem; }

/* ===== Forms ===== */
.form-group { margin-bottom: 1rem; }
.form-group label {
  display: block;
  font-weight: 500;
  font-size: 0.875rem;
  margin-bottom: 0.25rem;
  color: var(--fg-primary);
}

.form-input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-sm);
  font: inherit;
  font-size: 0.875rem;
  transition: border-color var(--transition), box-shadow var(--transition);
  background: var(--bg-primary);
}

.form-input:focus {
  outline: none;
  border-color: var(--blue-500);
  box-shadow: 0 0 0 3px rgba(0,112,243,0.1);
}

textarea.form-input { min-height: 100px; resize: vertical; }
`
