import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CERT_AGENDA_PROMPT_REF, type TrackCode } from '@smart/contracts';
import {
  agendaGuardFailure,
  alignAgendaToSyllabus,
  publisherSyllabus,
} from './cert-agenda-guardrails.js';
import { promptRef } from './types.js';
import { certAgendaGenerateTemplate, toStudentPaper } from './templates/cert-agenda.js';
import { PROMPT_REGISTRY, renderPrompt } from './registry.js';

const here = dirname(fileURLToPath(import.meta.url));

function loadFixture(name: 'happy' | 'sparse' | 'drift'): {
  trackCode: TrackCode;
  agendaLines: string[];
} {
  return JSON.parse(
    readFileSync(join(here, 'fixtures', 'cert-agenda', `${name}.json`), 'utf8'),
  ) as {
    trackCode: TrackCode;
    agendaLines: string[];
  };
}

describe('cert agenda guardrails', () => {
  it('registers cert-agenda-generate@1', () => {
    expect(promptRef(certAgendaGenerateTemplate)).toBe(CERT_AGENDA_PROMPT_REF);
    expect(PROMPT_REGISTRY.has(CERT_AGENDA_PROMPT_REF)).toBe(true);
  });

  it('accepts the happy-path fixture against the publisher syllabus', () => {
    const fixture = loadFixture('happy');
    const syllabus = publisherSyllabus(fixture.trackCode);
    const alignment = alignAgendaToSyllabus(fixture.agendaLines, syllabus);
    expect(agendaGuardFailure(alignment)).toBeUndefined();
  });

  it('rejects a sparse agenda before any model call would run', () => {
    const fixture = loadFixture('sparse');
    const alignment = alignAgendaToSyllabus(
      fixture.agendaLines,
      publisherSyllabus(fixture.trackCode),
    );
    expect(agendaGuardFailure(alignment)).toBe('sparse_agenda');
  });

  it('rejects a drifted agenda against the known syllabus', () => {
    const fixture = loadFixture('drift');
    const alignment = alignAgendaToSyllabus(
      fixture.agendaLines,
      publisherSyllabus(fixture.trackCode),
    );
    expect(agendaGuardFailure(alignment)).toBe('agenda_drift');
  });

  it('strips agenda mapping from the student paper', () => {
    const publicItems = toStudentPaper([
      {
        index: 1,
        stem: 'Which hook stores React component state?',
        itemType: 'MCQ',
        options: [
          { label: 'A', text: 'useState' },
          { label: 'B', text: 'useMemo' },
          { label: 'C', text: 'useRef' },
          { label: 'D', text: 'useId' },
        ],
        sourceAgendaLine: 'React',
        competencyTopic: 'React',
      },
    ]);
    expect(JSON.stringify(publicItems)).not.toContain('sourceAgendaLine');
    expect(JSON.stringify(publicItems)).not.toContain('competencyTopic');
  });

  it('does not ask the model to emit agenda line mapping', () => {
    const rendered = renderPrompt(certAgendaGenerateTemplate, {
      trackCode: 'TECH_FULLSTACK',
      trackName: 'Full Stack Developer',
      syllabusTopics: [
        'React',
        'REST API design',
        'PostgreSQL queries',
        'Git workflows',
        'Next.js',
      ],
      agendaLines: ['React', 'REST API design', 'PostgreSQL queries', 'Git workflows', 'Next.js'],
    });
    expect(rendered.system).toContain('Do not mention the agenda');
    expect(rendered.user).toContain('<submitted_agenda>');
  });
});
