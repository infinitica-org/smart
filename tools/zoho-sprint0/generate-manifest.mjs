#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { SPRINT, EPICS, STORIES } from './backlog.mjs';

const config = JSON.parse(readFileSync(new URL('./config.json', import.meta.url), 'utf8'));

const lines = [
  '# Sprint 0 — Zoho ↔ GitHub manifest',
  '',
  'Authority: `docs/delivery/AGILE_PLAN.md` §7 · `tools/zoho-sprint0/backlog.mjs`',
  '',
  '## Sprint',
  '',
  '| Field | Value |',
  '|-------|-------|',
  `| Name | ${SPRINT.name} |`,
  `| sprintId | \`${config.sprintId || 'TBD'}\` |`,
  '',
  '## Epics',
  '',
  '| Epic | Owner | Zoho epicId |',
  '|------|-------|-------------|',
];

for (const e of EPICS) {
  lines.push(`| ${e.name} | ${e.owner} | ${config.epicIds?.[e.key] || 'TBD'} |`);
}

lines.push(
  '',
  '## Stories',
  '',
  '| Ticket | GitHub | Pts | Pri | Owner | Epic | Zoho itemId |',
  '|--------|--------|-----|-----|-------|------|-------------|',
);

for (const s of STORIES) {
  const gh = config.githubIds?.[s.id];
  const zohoId = config.itemIds?.[s.id] || 'TBD';
  const ghLink = gh ? `[#${gh}](https://github.com/infinitica-org/smart/issues/${gh})` : 'TBD';
  lines.push(
    `| ${s.id} | ${ghLink} | ${s.points} | ${s.priority} | ${s.owner} | ${s.epic} | ${zohoId} |`,
  );
}

lines.push('', '## Import status', '');
lines.push('- Zoho sprint + 6 epics + 17 stories: **done** (one-time import)');
lines.push('- GitHub ↔ Zoho cross-links: **done**');
lines.push('- Ongoing backlog sync: **GitHub Issues only** — `node tools/backlog/sync-github.mjs`');
lines.push(
  `- teamId: \`${config.teamId}\` · projectId: \`${config.projectId}\` · sprintId: \`${config.sprintId || 'TBD'}\``,
);
lines.push('- **Prerequisite for Sprint 1** — see `tools/zoho-sprint1/`');

const out = new URL('../../docs/delivery/SPRINT0_ZOHO_MANIFEST.md', import.meta.url);
writeFileSync(out, lines.join('\n') + '\n');
console.log('Wrote', out.pathname || out.href);
