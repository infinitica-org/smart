import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RENDERERS } from './layouts.mjs';
import { CONTENT, TEMPLATE_LABELS } from './content.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const THEMES = ['classic', 'minimal', 'genz'];

const CATEGORIES = [
  { key: 'onboarding', label: 'Onboarding', templates: ['institution-admin-invite', 'student-invite', 'invite-reminder'] },
  { key: 'opportunities', label: 'Opportunities', templates: ['opportunity-shortlisted', 'application-stage-changed'] },
  { key: 'verification', label: 'Verification', templates: ['verification-passed', 'verification-failed', 'verification-locked'] },
];

const DATA = {};
for (const templateName of Object.keys(CONTENT)) {
  const themes = {};
  for (const theme of THEMES) {
    const opts = CONTENT[templateName][theme];
    themes[theme] = { subject: opts.subject, html: RENDERERS[theme](opts) };
  }
  DATA[templateName] = { label: TEMPLATE_LABELS[templateName], themes };
}

const dataJson = JSON.stringify({ categories: CATEGORIES, templates: DATA }).replace(/<\/script/gi, '<\\/script');

const html = `<!doctype html>
<title>SMART Email Templates</title>
<style>
:root{
  --ink:#1c1c1e; --paper:#faf9f7; --card:#ffffff; --border:#e4e2dd; --border-soft:#f1efec;
  --muted:#726f6a; --teal:#2fbfae; --teal-deep:#0f5c63; --teal-soft:#eefaf7;
  --shadow:0 2px 10px rgb(28 28 30 / 0.06), 0 1px 2px rgb(28 28 30 / 0.05);
  --frame-shadow:0 16px 40px rgb(15 92 99 / 0.14), 0 2px 8px rgb(28 28 30 / 0.08);
  color-scheme:light;
}
@media (prefers-color-scheme:dark){
  :root:not([data-theme="light"]){
    --ink:#faf9f7; --paper:#17181a; --card:#1f2022; --border:rgb(250 249 247/0.1); --border-soft:#232426;
    --muted:rgb(250 249 247/0.55); --teal:#2fbfae; --teal-deep:#7fe0d2; --teal-soft:rgb(47 191 174/0.14);
    --shadow:0 2px 10px rgb(0 0 0/0.35), 0 1px 2px rgb(0 0 0/0.3);
    --frame-shadow:0 16px 40px rgb(0 0 0/0.5), 0 2px 8px rgb(0 0 0/0.4);
    color-scheme:dark;
  }
}
:root[data-theme="dark"]{
  --ink:#faf9f7; --paper:#17181a; --card:#1f2022; --border:rgb(250 249 247/0.1); --border-soft:#232426;
  --muted:rgb(250 249 247/0.55); --teal:#2fbfae; --teal-deep:#7fe0d2; --teal-soft:rgb(47 191 174/0.14);
  --shadow:0 2px 10px rgb(0 0 0/0.35), 0 1px 2px rgb(0 0 0/0.3);
  --frame-shadow:0 16px 40px rgb(0 0 0/0.5), 0 2px 8px rgb(0 0 0/0.4);
  color-scheme:dark;
}
*{box-sizing:border-box;}
html,body{margin:0;}
body{
  background:var(--paper); color:var(--ink);
  font-family:'IBM Plex Sans', -apple-system, Segoe UI, Helvetica, Arial, sans-serif;
  min-height:100%;
}
h1,h2,h3,.font-display{
  font-family:'Manrope', -apple-system, Segoe UI, Helvetica, Arial, sans-serif;
  letter-spacing:-0.01em;
}
.mono{font-family:'IBM Plex Mono', ui-monospace, SFMono-Regular, monospace;}
a{color:inherit;}
:focus-visible{outline:2px solid var(--teal); outline-offset:2px;}

.topbar{
  position:sticky; top:0; z-index:20; background:var(--paper);
  border-bottom:1px solid var(--border);
  padding:20px 28px; display:flex; align-items:baseline; justify-content:space-between; gap:24px; flex-wrap:wrap;
}
.topbar h1{margin:0; font-size:19px; font-weight:800;}
.topbar .eyebrow{
  display:block; font-family:'IBM Plex Mono',monospace; font-size:11px; font-weight:500;
  letter-spacing:0.09em; text-transform:uppercase; color:var(--teal-deep); margin-bottom:4px;
}
.topbar .meta{font-size:12.5px; color:var(--muted); text-align:right; max-width:420px; line-height:1.5;}

.layout{display:grid; grid-template-columns:272px 1fr; min-height:calc(100vh - 73px);}
@media (max-width:860px){ .layout{grid-template-columns:1fr;} .sidebar{border-right:none; border-bottom:1px solid var(--border);} }

.sidebar{
  border-right:1px solid var(--border); padding:22px 14px 40px; align-self:start;
  position:sticky; top:73px; max-height:calc(100vh - 73px); overflow-y:auto;
}
.cat-label{
  font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase;
  color:var(--muted); margin:18px 14px 8px;
}
.cat-label:first-child{margin-top:4px;}
.nav-item{
  display:flex; flex-direction:column; gap:2px; width:100%; text-align:left;
  background:none; border:none; border-radius:12px; padding:10px 14px; margin:0 0 2px;
  cursor:pointer; color:var(--ink); font-size:13.5px; font-weight:600; font-family:inherit;
}
.nav-item .subj{font-size:11.5px; font-weight:400; color:var(--muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;}
.nav-item:hover{background:var(--border-soft);}
.nav-item[aria-current="true"]{background:var(--teal-soft); color:var(--teal-deep);}
.nav-item[aria-current="true"] .subj{color:var(--teal-deep); opacity:0.75;}

.main{padding:32px 32px 60px; min-width:0;}
.main-head{display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap; margin-bottom:20px;}
.main-head h2{margin:0; font-size:22px; font-weight:800;}

.switcher{display:inline-flex; background:var(--border-soft); border-radius:999px; padding:3px; gap:2px;}
.switcher button{
  border:none; background:none; font:inherit; font-family:'Manrope',sans-serif; font-weight:700; font-size:12.5px;
  padding:8px 16px; border-radius:999px; cursor:pointer; color:var(--muted);
}
.switcher button[aria-selected="true"]{background:var(--card); color:var(--ink); box-shadow:var(--shadow);}

.theme-blurb{font-size:12.5px; color:var(--muted); line-height:1.6; max-width:64ch; margin:0 0 22px;}

.inbox-bar{
  max-width:640px; background:var(--card); border:1px solid var(--border); border-radius:14px 14px 0 0;
  padding:14px 20px; display:flex; flex-direction:column; gap:3px; box-shadow:var(--shadow);
}
.inbox-bar .subject{font-size:14px; font-weight:700;}
.inbox-bar .from{font-size:12px; color:var(--muted);}
.frame-wrap{
  max-width:640px; border-radius:0 0 20px 20px; overflow:hidden; box-shadow:var(--frame-shadow);
  border:1px solid var(--border); border-top:none; background:#fff;
}
iframe{display:block; width:100%; border:none; background:#fff;}

.source-toggle{margin-top:22px; max-width:640px;}
.source-toggle summary{
  cursor:pointer; font-size:12.5px; font-weight:600; color:var(--muted); list-style:none;
  display:inline-flex; align-items:center; gap:6px; padding:6px 0;
}
.source-toggle summary::-webkit-details-marker{display:none;}
.source-toggle summary::before{content:'▸'; font-size:10px; transition:transform .15s;}
.source-toggle[open] summary::before{transform:rotate(90deg);}
.source-toggle pre{
  margin:10px 0 0; padding:16px; background:var(--border-soft); border-radius:12px; overflow:auto;
  font-size:11.5px; line-height:1.55; max-height:340px; white-space:pre-wrap; word-break:break-word;
}

@media (prefers-reduced-motion:no-preference){
  iframe{transition:opacity .12s ease;}
}
</style>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500&family=IBM+Plex+Sans:wght@400;500;600&family=Manrope:wght@700;800&display=swap" rel="stylesheet">

<div class="topbar">
  <div>
    <span class="eyebrow">SMART · Transactional Email Review</span>
    <h1>8 templates &times; 3 themes = 24 variants</h1>
  </div>
  <div class="meta">Static design-review build — same sample data per email, rendered three ways. Not yet wired into the live mailer.</div>
</div>

<div class="layout">
  <nav class="sidebar" id="sidebar" aria-label="Email templates"></nav>
  <main class="main">
    <div class="main-head">
      <h2 id="main-title">&nbsp;</h2>
      <div class="switcher" id="switcher" role="tablist" aria-label="Theme"></div>
    </div>
    <p class="theme-blurb" id="theme-blurb"></p>
    <div class="inbox-bar">
      <div class="subject" id="inbox-subject"></div>
      <div class="from">SMART Platform &lt;support@smart.infinitica.com&gt;</div>
    </div>
    <div class="frame-wrap"><iframe id="frame" title="Email preview" scrolling="no"></iframe></div>
    <details class="source-toggle">
      <summary>View HTML source</summary>
      <pre class="mono" id="source"></pre>
    </details>
  </main>
</div>

<script>
const DATA = ${dataJson};
const THEME_BLURB = {
  classic: 'Formal letterhead layout: sharp corners, a bordered detail table, uppercase CTA — reads as an official institutional notice.',
  minimal: "Mirrors SMART's own product theme: warm paper canvas, single teal accent, generous whitespace, rounded card, pill button.",
  genz: 'Bold rounded card with a gradient hero in the brand mark\\'s own teal gradient, pill CTA, casual-but-professional tone.',
};
const THEME_LABEL = { classic: 'Classic', minimal: 'Minimal', genz: 'Genz' };

let currentTemplate = DATA.categories[0].templates[0];
let currentTheme = 'classic';

function buildSidebar(){
  const nav = document.getElementById('sidebar');
  nav.innerHTML = '';
  for (const cat of DATA.categories){
    const h = document.createElement('div');
    h.className = 'cat-label';
    h.textContent = cat.label;
    nav.appendChild(h);
    for (const key of cat.templates){
      const t = DATA.templates[key];
      const btn = document.createElement('button');
      btn.className = 'nav-item';
      btn.type = 'button';
      btn.innerHTML = '<span>' + t.label + '</span><span class="subj">' + t.themes[currentTheme].subject + '</span>';
      btn.addEventListener('click', () => selectTemplate(key));
      btn.dataset.key = key;
      nav.appendChild(btn);
    }
  }
  syncSidebarState();
}

function syncSidebarState(){
  document.querySelectorAll('.nav-item').forEach(el => {
    const active = el.dataset.key === currentTemplate;
    el.setAttribute('aria-current', String(active));
    const t = DATA.templates[el.dataset.key];
    el.querySelector('.subj').textContent = t.themes[currentTheme].subject;
  });
}

function buildSwitcher(){
  const sw = document.getElementById('switcher');
  sw.innerHTML = '';
  for (const theme of ['classic','minimal','genz']){
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.role = 'tab';
    btn.textContent = THEME_LABEL[theme];
    btn.setAttribute('aria-selected', String(theme === currentTheme));
    btn.addEventListener('click', () => selectTheme(theme));
    btn.dataset.theme = theme;
    sw.appendChild(btn);
  }
}

function render(){
  const t = DATA.templates[currentTemplate];
  const variant = t.themes[currentTheme];
  document.getElementById('main-title').textContent = t.label;
  document.getElementById('theme-blurb').textContent = THEME_BLURB[currentTheme];
  document.getElementById('inbox-subject').textContent = variant.subject;
  document.getElementById('source').textContent = variant.html;
  document.querySelectorAll('.switcher button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.theme === currentTheme)));
  syncSidebarState();

  const frame = document.getElementById('frame');
  frame.srcdoc = variant.html;
  frame.onload = () => {
    const measure = () => {
      try {
        const doc = frame.contentDocument;
        const h = Math.max(doc.body.scrollHeight, doc.documentElement.scrollHeight);
        frame.style.height = h + 'px';
      } catch (e) { frame.style.height = '820px'; }
    };
    // Nested email tables can take an extra layout pass to settle — measure
    // after paint, then once more shortly after to catch any late reflow.
    requestAnimationFrame(() => requestAnimationFrame(measure));
    setTimeout(measure, 120);
  };
}

function selectTemplate(key){ currentTemplate = key; render(); }
function selectTheme(theme){ currentTheme = theme; render(); }

buildSidebar();
buildSwitcher();
render();
</script>
`;

writeFileSync(path.join(__dirname, 'gallery.html'), html, 'utf8');
console.log('Wrote gallery.html');
