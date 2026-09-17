import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const signalEncoderDir = dirname(fileURLToPath(import.meta.url));

describe('SignalEncoderModule wiring', () => {
  it('does not register onboarding GitHub fusion on candidate.skills_discovered', () => {
    const moduleSource = readFileSync(join(signalEncoderDir, 'signal-encoder.module.ts'), 'utf8');
    const kafkaModuleSource = readFileSync(
      join(signalEncoderDir, '../../platform/kafka/kafka.module.ts'),
      'utf8',
    );

    expect(moduleSource).not.toContain('CandidateSkillsDiscoveredEncoderConsumer');
    expect(kafkaModuleSource).not.toContain('CandidateSkillsDiscoveredEncoderConsumer');
    expect(kafkaModuleSource).toContain('CandidateSkillsDiscoveredConsumer');
  });
});
