import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RENDERERS } from './layouts.mjs';
import { CONTENT, TEMPLATE_LABELS } from './content.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, 'preview');
const THEMES = ['classic', 'minimal', 'genz'];

function toText(opts) {
  const lines = [opts.heading, '', opts.salutation, ...opts.paragraphs.map(stripTags)];
  if (opts.infoRows) {
    lines.push('');
    for (const [label, value] of opts.infoRows) lines.push(`${label}: ${stripTags(value)}`);
  }
  if (opts.cta) lines.push('', `${opts.cta.label}: ${opts.cta.url}`);
  if (opts.footerNote) lines.push('', stripTags(opts.footerNote));
  return lines.join('\n');
}

function stripTags(html) {
  return html.replace(/<[^>]+>/g, '');
}

const manifest = [];

for (const templateName of Object.keys(CONTENT)) {
  for (const theme of THEMES) {
    const opts = CONTENT[templateName][theme];
    const html = RENDERERS[theme](opts);
    const text = toText(opts);
    const fileName = `${templateName}.html`;
    mkdirSync(path.join(OUT_DIR, theme), { recursive: true });
    writeFileSync(path.join(OUT_DIR, theme, fileName), html, 'utf8');
    manifest.push({
      templateName,
      templateLabel: TEMPLATE_LABELS[templateName],
      theme,
      subject: opts.subject,
      file: `preview/${theme}/${fileName}`,
    });
    void text;
  }
}

writeFileSync(path.join(__dirname, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

console.log(`Generated ${manifest.length} email variants (${Object.keys(CONTENT).length} templates x ${THEMES.length} themes) into ${OUT_DIR}`);
