import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { SKILL_CODES, SKILL_DEFINITIONS } from '@smart/contracts';

const REMOVED = [
  'DISTRIBUTED_SYSTEMS_DESIGN',
  'MICROSERVICES_ARCHITECTURE_SERVICE_DECOMPOSITION',
  'EVENT_DRIVEN_ARCHITECTURE',
  'SCALABLE_SYSTEM_HIGH_AVAILABILITY_ARCHITECTURE',
  'DOMAIN_DRIVEN_DESIGN_DDD',
  'DESIGN_PATTERNS_CLEAN_ARCHITECTURE',
  'MULTI_CLOUD_HYBRID_CLOUD_STRATEGY',
  'SERVERLESS_ARCHITECTURE',
  'SITE_RELIABILITY_ENGINEERING_SRE',
  'DATA_WAREHOUSING',
  'DATA_LAKE_LAKEHOUSE_ARCHITECTURE',
  'DATA_GOVERNANCE_QUALITY_ENGINEERING',
  'COMPLIANCE_RISK_MANAGEMENT',
  'EDGE_COMPUTING',
] as const;

describe('skill@1 taxonomy trim', () => {
  it('keeps 67 assessable skills across 14 categories', () => {
    expect(SKILL_DEFINITIONS).toHaveLength(67);
    expect(SKILL_CODES).toHaveLength(67);
    expect(new Set(SKILL_CODES).size).toBe(67);
    expect(new Set(SKILL_DEFINITIONS.map((skill) => skill.categoryId)).size).toBe(14);
  });

  it('removes concept-only entries from the generated catalog', () => {
    for (const code of REMOVED) {
      expect(SKILL_CODE_SET.has(code)).toBe(false);
    }
  });

  it('uses short display names in skill.json source', () => {
    const jsonPath = path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      '../data/taxonomies/skill.json',
    );
    const raw = JSON.parse(readFileSync(jsonPath, 'utf8')) as {
      categories: Array<{ skills: Array<{ code: string; name: string }> }>;
    };
    const python = raw.categories
      .flatMap((category) => category.skills)
      .find((skill) => skill.code === 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT');
    expect(python?.name).toBe('Python');
  });
});

const SKILL_CODE_SET = new Set(SKILL_CODES);
