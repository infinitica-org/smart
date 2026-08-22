#!/usr/bin/env node
/**
 * Push backlog.mjs → GitHub issue bodies (Sprint 0 + Sprint 1).
 * This is the only ongoing backlog sync agents should run.
 *
 * Usage: node tools/backlog/sync-github.mjs [sprint0|sprint1|all]
 */
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { formatStoryDescription } from './format.mjs';
import { STORIES as S0_STORIES } from '../zoho-sprint0/backlog.mjs';
import { STORIES as S1_STORIES } from '../zoho-sprint1/backlog.mjs';

const REPO = 'infinitica-org/smart';
const target = process.argv[2] || 'all';

function loadConfig(path) {
  return JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
}

function zohoUrl(config, itemId) {
  if (!config.sprintId || !itemId) return undefined;
  const { teamId, projectId, sprintId } = config;
  return `https://sprints.zoho.in/teamview/${teamId}#projdetails/${projectId}/sprintview/${sprintId}/itemdetail/${itemId}`;
}

function storiesForSprint0() {
  const config = loadConfig('../zoho-sprint0/config.json');
  return S0_STORIES.map((s) => ({
    ...s,
    github: config.githubIds[s.id],
    zohoUrl: zohoUrl(config, config.itemIds[s.id]),
  })).filter((s) => s.github);
}

function storiesForSprint1() {
  const config = loadConfig('../zoho-sprint1/config.json');
  return S1_STORIES.map((s) => ({
    ...s,
    zohoUrl: zohoUrl(config, config.itemIds[s.id]),
  }));
}

function syncStory(story) {
  const body = formatStoryDescription(story, { zohoUrl: story.zohoUrl });
  const tmp = `issue-${story.github}.md`;
  writeFileSync(tmp, body, 'utf8');
  try {
    execSync(`gh issue edit ${story.github} --repo ${REPO} --body-file "${tmp}"`, {
      stdio: 'inherit',
    });
    console.log(`updated #${story.github} ${story.id}`);
  } finally {
    try {
      unlinkSync(tmp);
    } catch {
      /* ignore */
    }
  }
}

const batches = [];
if (target === 'all' || target === 'sprint0') batches.push(...storiesForSprint0());
if (target === 'all' || target === 'sprint1') batches.push(...storiesForSprint1());

if (!batches.length) {
  console.error('No stories to sync. Use: sprint0 | sprint1 | all');
  process.exit(1);
}

for (const story of batches) syncStory(story);
console.log(`GitHub sync complete (${batches.length} issues).`);
