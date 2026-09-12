import { describe, expect, it } from 'vitest';
import {
  INF_SE_V1_TAXONOMY_VERSION,
  SE_SKILL_CATEGORY_IDS,
  SE_SKILL_DEFINITIONS,
  groupSeSkillsByCategory,
} from './se-skills.js';

describe('inf-se-v1 taxonomy (se-skills)', () => {
  it('defines 33 skills across 9 categories', () => {
    expect(SE_SKILL_DEFINITIONS).toHaveLength(33);
    expect(SE_SKILL_CATEGORY_IDS).toHaveLength(9);
  });

  it('groups every skill under exactly one category', () => {
    const grouped = groupSeSkillsByCategory();
    expect(grouped).toHaveLength(9);
    const flat = grouped.flatMap((category) => category.skills);
    expect(flat).toHaveLength(33);
    expect(new Set(flat.map((skill) => skill.code)).size).toBe(33);
  });

  it('marks Docker and Kubernetes as tool tags', () => {
    const tools = SE_SKILL_DEFINITIONS.filter((skill) => skill.tagType === 'TOOL');
    expect(tools.map((skill) => skill.code).sort()).toEqual(['TOOL_DOCKER', 'TOOL_KUBERNETES']);
    for (const entry of tools) {
      expect(entry.toolBars?.AWARE).toBeTruthy();
      expect(entry.toolBars?.WORKING).toBeTruthy();
      expect(entry.toolBars?.PRODUCTION).toBeTruthy();
    }
  });

  it('uses the frozen inf-se-v1@1 version constant', () => {
    expect(INF_SE_V1_TAXONOMY_VERSION).toBe('inf-se-v1@1');
  });
});
