#!/usr/bin/env node
/**
 * Generate docs/delivery/SPRINT1_ZOHO_MANIFEST.md from backlog + optional config.json IDs.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { EPICS, STORIES, SPRINT } from './backlog.mjs';

const configPath = new URL('./config.json', import.meta.url);
const config = existsSync(configPath)
  ? JSON.parse(readFileSync(configPath, 'utf8'))
  : { epicIds: {}, itemIds: {}, sprintId: '' };

const lines = [
  '# Sprint 1 — Zoho ↔ GitHub manifest',
  '',
  `Generated: ${new Date().toISOString().slice(0, 10)}`,
  '',
  '## Sprint',
  '',
  `| Field | Value |`,
  `|---|---|`,
  `| Name | ${SPRINT.name} |`,
  `| Zoho sprintId | ${config.sprintId || '_pending_'} |`,
  `| Dates | 24–28 Aug 2026 |`,
  `| Story points | 115 (22 stories) |`,
  '',
  '## Epics',
  '',
  '| Epic | Owner | Stories | Points | Zoho epicId |',
  '|---|---|---|---|---|',
];

for (const epic of EPICS) {
  const stories = STORIES.filter((s) => s.epic === epic.key);
  const pts = stories.reduce((n, s) => n + s.points, 0);
  lines.push(
    `| ${epic.name} | ${epic.owner} | ${stories.length} | ${pts} | ${config.epicIds?.[epic.key] || '_pending_'} |`,
  );
}

lines.push('', '## Stories', '');
lines.push(
  '| Ticket | GitHub | Points | Priority | Owner | Epic | Zoho itemId |',
  '|---|---|---:|---|---|---|---|',
);

for (const s of STORIES) {
  const zohoId = config.itemIds?.[s.id] || '_pending_';
  lines.push(
    `| ${s.id} | [#${s.github}](https://github.com/infinitica-org/smart/issues/${s.github}) | ${s.points} | ${s.priority} | ${s.owner} | ${s.epic} | ${zohoId} |`,
  );
}

lines.push('', '## Import status', '');
lines.push('- Zoho sprint + 5 epics + 22 stories: **done** (one-time import)');
lines.push('- GitHub ↔ Zoho cross-links: **done**');
lines.push('- Ongoing backlog sync: **GitHub Issues only** — `node tools/backlog/sync-github.mjs`');
lines.push('- **Sprint 0 prerequisite:** `docs/delivery/SPRINT0_ZOHO_MANIFEST.md`');
lines.push(
  `- teamId: \`${config.teamId}\` · projectId: \`${config.projectId}\` · sprintId: \`${config.sprintId}\``,
);
if (config.itemTypeStoryId) {
  lines.push(
    `- Story item type: \`${config.itemTypeStoryId}\` (may show as Bug in UI — rename in project settings)`,
  );
}

const out = new URL('../../docs/delivery/SPRINT1_ZOHO_MANIFEST.md', import.meta.url);
writeFileSync(out, lines.join('\n') + '\n', 'utf8');
console.log('Wrote', out.pathname || out.href);
