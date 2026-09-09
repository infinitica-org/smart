import { describe, expect, it } from 'vitest';
import {
  CERT_AGENDA_PROMPT_REF,
  CertAgendaInternalItemSchema,
  GenerateCertAgendaRequestSchema,
  GenerateCertAgendaResponseSchema,
} from './cert-agenda.dto.js';

const publicItem = {
  index: 1,
  stem: 'Which React hook holds component state?',
  itemType: 'MCQ' as const,
  options: [
    { label: 'A' as const, text: 'useState' },
    { label: 'B' as const, text: 'useMemo' },
    { label: 'C' as const, text: 'useRef' },
    { label: 'D' as const, text: 'useId' },
  ],
};

describe('GenerateCertAgendaRequestSchema', () => {
  it('accepts a track plus agenda lines', () => {
    const parsed = GenerateCertAgendaRequestSchema.parse({
      trackCode: 'TECH_FULLSTACK',
      agendaLines: ['React', 'REST API design', 'PostgreSQL queries'],
    });
    expect(parsed.agendaLines).toHaveLength(3);
  });

  it('rejects an empty agenda', () => {
    expect(
      GenerateCertAgendaRequestSchema.safeParse({
        trackCode: 'TECH_FULLSTACK',
        agendaLines: [],
      }).success,
    ).toBe(false);
  });
});

describe('GenerateCertAgendaResponseSchema', () => {
  it('rejects a student payload that leaks agenda mapping', () => {
    const items = Array.from({ length: 5 }, (_, i) => ({ ...publicItem, index: i + 1 }));
    const leaked = {
      trackCode: 'TECH_FULLSTACK',
      items: items.map((item) => ({ ...item, sourceAgendaLine: 'React' })),
      promptRef: CERT_AGENDA_PROMPT_REF,
      taxonomyVersionSnapshot: `${CERT_AGENDA_PROMPT_REF}+publisher-syllabus@1`,
      auditId: null,
    };
    expect(GenerateCertAgendaResponseSchema.safeParse(leaked).success).toBe(false);
  });

  it('accepts stems and options only', () => {
    const items = Array.from({ length: 5 }, (_, i) => ({ ...publicItem, index: i + 1 }));
    expect(
      GenerateCertAgendaResponseSchema.safeParse({
        trackCode: 'TECH_FULLSTACK',
        items,
        promptRef: CERT_AGENDA_PROMPT_REF,
        taxonomyVersionSnapshot: `${CERT_AGENDA_PROMPT_REF}+publisher-syllabus@1`,
        auditId: null,
      }).success,
    ).toBe(true);
  });
});

describe('CertAgendaInternalItemSchema', () => {
  it('keeps source mapping on the server-only shape', () => {
    expect(
      CertAgendaInternalItemSchema.parse({
        ...publicItem,
        sourceAgendaLine: 'React',
        competencyTopic: 'React',
      }).sourceAgendaLine,
    ).toBe('React');
  });
});
