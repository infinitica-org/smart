import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const registryPath = path.join(here, '../src/skill-registry-data.ts');
let source = readFileSync(registryPath, 'utf8');

const REMOVE = [
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
];

for (const code of REMOVE) {
  const pattern = new RegExp(`\\n  ${code}: \\{[\\s\\S]*?\\n  \\},`, 'm');
  const next = source.replace(pattern, '');
  if (next === source) {
    throw new Error(`Failed to remove registry profile for ${code}`);
  }
  source = next;
}

writeFileSync(registryPath, source, 'utf8');
console.log(`Removed ${REMOVE.length} profiles from skill-registry-data.ts`);
