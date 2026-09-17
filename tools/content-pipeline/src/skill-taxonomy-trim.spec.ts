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
  'ACCESSIBILITY_ENGINEERING_A11Y',
  'AGILE_DELIVERY_LEADERSHIP',
  'CONFIGURATION_MANAGEMENT_AUTOMATION',
  'CROSS_PLATFORM_MOBILE_DEVELOPMENT',
  'CLOUD_COST_OPTIMIZATION_FINOPS',
  'IDENTITY_ACCESS_MANAGEMENT_IAM',
  'INFRASTRUCTURE_AS_CODE_IAC',
  'SECURITY_OPERATIONS_INCIDENT_RESPONSE',
  'API_GATEWAY_SERVICE_MESH_MANAGEMENT',
  'CROSS_FUNCTIONAL_STAKEHOLDER_COLLABORATION',
  'STREAM_PROCESSING_MESSAGING_SYSTEMS',
  'TECHNICAL_DOCUMENTATION_KNOWLEDGE_MANAGEMENT',
  'MENTORSHIP_TECHNICAL_LEADERSHIP',
  'TECHNICAL_PROGRAM_PROJECT_MANAGEMENT',
  'TEST_AUTOMATION_ENGINEERING',
  'VIRTUALIZATION_HYPERVISOR_MANAGEMENT',
] as const;

describe('skill@1 taxonomy trim', () => {
  it('keeps 51 assessable skills across 14 categories', () => {
    expect(SKILL_DEFINITIONS).toHaveLength(51);
    expect(SKILL_CODES).toHaveLength(51);
    expect(new Set(SKILL_CODES).size).toBe(51);
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
