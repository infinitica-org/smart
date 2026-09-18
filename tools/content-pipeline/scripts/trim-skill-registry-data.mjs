import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const registryPath = path.join(here, '../src/skill-registry-data.ts');
let source = readFileSync(registryPath, 'utf8');

const REMOVE = [
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
