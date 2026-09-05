import { BadGatewayException, BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import {
  EvaluationService,
  SKILL_INTERVIEW_EXAMINER_PROMPT_REF,
  SKILL_INTERVIEW_GRADER_PROMPT_REF,
} from './evaluation.service.js';
import { sealSdeFormPayload, unsealSdeFormPayload } from './sde-form-seal.js';
import type { AiGatewayService } from '../ai-gateway/ai-gateway.service.js';

const questions = [
  { index: 1, text: 'How would you design a cache for this API?' },
  { index: 2, text: 'What fails first when traffic spikes ten times?' },
  { index: 3, text: 'Walk through one production incident you owned.' },
];

const items = questions.map((question) => ({
  ...question,
  question: question.text,
  answer: 'I would use Redis with a TTL and a stampede lock.',
}));

const OWNER_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_ID = '22222222-2222-4222-8222-222222222222';

function gatewayWithComplete(complete: AiGatewayService['complete']): AiGatewayService {
  return { complete } as AiGatewayService;
}

describe('EvaluationService skill interview (SE-T02)', () => {
  it('returns three questions from a stubbed gateway, not a live model', async () => {
    const complete = vi.fn().mockResolvedValue({ output: { questions } });
    const service = new EvaluationService(gatewayWithComplete(complete));

    const result = await service.generateSkillInterview({
      skillCode: 'SYSTEM_DESIGN_ARCHITECTURE',
      proficiency: 'ADVANCED',
    });

    expect(result.questions).toHaveLength(3);
    expect(result.promptRef).toBe(SKILL_INTERVIEW_EXAMINER_PROMPT_REF);
    expect(complete).toHaveBeenCalledTimes(1);
    expect(complete.mock.calls[0]?.[0]).toMatchObject({
      promptRef: SKILL_INTERVIEW_EXAMINER_PROMPT_REF,
      modelRole: 'FAST_EXTRACTION',
      temperature: 0,
    });
  });

  it('returns pass/fail plus a visible why from a stubbed grade call', async () => {
    const complete = vi.fn().mockResolvedValue({
      output: {
        passed: false,
        explanation: 'Named Redis but could not explain stampede or TTL trade-offs.',
      },
      auditId: null,
    });
    const service = new EvaluationService(gatewayWithComplete(complete));

    const result = await service.gradeSkillInterview({
      skillCode: 'SYSTEM_DESIGN_ARCHITECTURE',
      proficiency: 'ADVANCED',
      items,
    });

    expect(result.passed).toBe(false);
    expect(result.explanation.length).toBeGreaterThanOrEqual(10);
    expect(result.promptRef).toBe(SKILL_INTERVIEW_GRADER_PROMPT_REF);
    expect(complete.mock.calls[0]?.[0]).toMatchObject({
      promptRef: SKILL_INTERVIEW_GRADER_PROMPT_REF,
      modelRole: 'PRIMARY_REASONING',
    });
    expect(JSON.stringify(complete.mock.calls[0]?.[0]?.variables)).not.toContain('ignore previous');
  });

  it('rejects a grade payload that has no explanation so a score-only result cannot ship', async () => {
    const complete = vi.fn().mockResolvedValue({
      output: { passed: true, explanation: '' },
      auditId: null,
    });
    const service = new EvaluationService(gatewayWithComplete(complete));

    await expect(
      service.gradeSkillInterview({
        skillCode: 'SYSTEM_DESIGN_ARCHITECTURE',
        proficiency: 'ADVANCED',
        items,
      }),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('fails closed when the stubbed gateway throws', async () => {
    const complete = vi.fn().mockRejectedValue(new Error('no providers'));
    const service = new EvaluationService(gatewayWithComplete(complete));

    await expect(
      service.generateSkillInterview({
        skillCode: 'SYSTEM_DESIGN_ARCHITECTURE',
        proficiency: 'ADVANCED',
      }),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('does not call the gateway for Beginner claims', async () => {
    const complete = vi.fn();
    const service = new EvaluationService(gatewayWithComplete(complete));

    await expect(
      service.generateSkillInterview({
        skillCode: 'SYSTEM_DESIGN_ARCHITECTURE',
        proficiency: 'BEGINNER',
      }),
    ).rejects.toThrow();
    expect(complete).not.toHaveBeenCalled();
  });
});

function closedItems(mcq: number, trace: number) {
  const options = {
    A: 'Alpha option text',
    B: 'Beta option text',
    C: 'Gamma option text',
    D: 'Delta option text',
  };
  return [
    ...Array.from({ length: mcq }, () => ({
      format: 'MCQ' as const,
      prompt: 'Which statement about this skill is correct in production?',
      options,
      answer: 'A' as const,
    })),
    ...Array.from({ length: trace }, () => ({
      format: 'TRACE' as const,
      prompt: 'What is the next process state after this syscall returns?',
      options,
      answer: 'B' as const,
    })),
  ];
}

describe('EvaluationService SDE v4 skill form', () => {
  it('returns a 12-item beginner applied form without answer keys on public items', async () => {
    const complete = vi
      .fn()
      .mockResolvedValueOnce({ output: { items: closedItems(8, 3) } })
      .mockResolvedValueOnce({
        output: {
          items: [
            {
              format: 'SCENARIO',
              prompt: 'A host is swapping heavily; what do you check first and why in this shop?',
              rubric: 'Names memory pressure, not CPU. Names a concrete next command.',
              modelAnswer: 'Check RSS vs available RAM, then reclaim or add capacity.',
            },
          ],
        },
      });
    const service = new EvaluationService(gatewayWithComplete(complete));
    const result = await service.generateSkillForm(
      {
        skillCode: 'SDE_OPERATING_SYSTEMS',
        proficiency: 'BEGINNER',
        attemptId: 'attempt-1',
      },
      OWNER_ID,
    );

    expect(result.items).toHaveLength(12);
    expect(result.timeMinutes).toBe(20);
    expect(result.passMarkPercent).toBe(80);
    expect(result.items.some((item) => item.format === 'SCENARIO')).toBe(true);
    expect(result.items.some((item) => item.format === 'CODING')).toBe(false);
    expect(JSON.stringify(result.items)).not.toContain('"answer"');
    expect(result).not.toHaveProperty('scoringBundle');
    expect(result.scoringToken.length).toBeGreaterThan(20);
    expect(complete.mock.calls[1]?.[0]?.variables.flavorNotes[0]).toContain('OS');
    expect(complete).toHaveBeenCalledTimes(2);
  });

  it('passes skillFocus into both generate prompt variable bags', async () => {
    const complete = vi
      .fn()
      .mockResolvedValueOnce({ output: { items: closedItems(8, 3) } })
      .mockResolvedValueOnce({
        output: {
          items: [
            {
              format: 'SCENARIO',
              prompt: 'A host is swapping heavily; what do you check first and why in this shop?',
              rubric: 'Names memory pressure, not CPU. Names a concrete next command.',
              modelAnswer: 'Check RSS vs available RAM, then reclaim or add capacity.',
            },
          ],
        },
      });
    const service = new EvaluationService(gatewayWithComplete(complete));
    await service.generateSkillForm(
      {
        skillCode: 'SDE_OPERATING_SYSTEMS',
        proficiency: 'BEGINNER',
        attemptId: 'attempt-1',
        skillFocus: 'Concurrency',
      },
      OWNER_ID,
    );
    expect(complete.mock.calls[0]?.[0]?.variables.skillFocus).toBe('Concurrency');
    expect(complete.mock.calls[1]?.[0]?.variables.skillFocus).toBe('Concurrency');
    expect(complete.mock.calls[1]?.[0]?.variables.flavorNotes[0]).toContain('Concurrency');
  });

  it('grades MCQ locally and open items in one batched grader call', async () => {
    const generateComplete = vi
      .fn()
      .mockResolvedValueOnce({ output: { items: closedItems(8, 3) } })
      .mockResolvedValueOnce({
        output: {
          items: [
            {
              format: 'SCENARIO',
              prompt: 'A host is swapping heavily; what do you check first and why in this shop?',
              rubric: 'Names memory pressure, not CPU. Names a concrete next command.',
              modelAnswer: 'Check RSS vs available RAM, then reclaim or add capacity.',
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        output: {
          grades: [
            {
              index: 12,
              marksAwarded: 10,
              justification: 'Named memory pressure and a real next step.',
            },
          ],
        },
      });
    const service = new EvaluationService(gatewayWithComplete(generateComplete));
    const form = await service.generateSkillForm(
      {
        skillCode: 'SDE_OPERATING_SYSTEMS',
        proficiency: 'BEGINNER',
        attemptId: 'attempt-1',
      },
      OWNER_ID,
    );
    const result = await service.gradeSkillForm(
      {
        skillCode: 'SDE_OPERATING_SYSTEMS',
        proficiency: 'BEGINNER',
        scoringToken: form.scoringToken,
        responses: [
          ...form.items
            .filter((item) => item.format === 'MCQ' || item.format === 'TRACE')
            .map((item) => ({
              index: item.index,
              selectedKey: item.format === 'MCQ' ? 'A' : 'B',
            })),
          { index: 12, text: 'Check RSS against available RAM, then reclaim or add capacity.' },
        ],
      },
      OWNER_ID,
    );

    expect(result.passed).toBe(true);
    expect(generateComplete).toHaveBeenCalledTimes(3);
  });

  it('fails closed when form generation output is malformed', async () => {
    const complete = vi.fn().mockResolvedValue({ output: { items: [] } });
    const service = new EvaluationService(gatewayWithComplete(complete));
    await expect(
      service.generateSkillForm(
        {
          skillCode: 'SDE_OPERATING_SYSTEMS',
          proficiency: 'BEGINNER',
        },
        OWNER_ID,
      ),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('rejects grading a scoring token issued to a different student', async () => {
    const complete = vi
      .fn()
      .mockResolvedValueOnce({ output: { items: closedItems(8, 3) } })
      .mockResolvedValueOnce({
        output: {
          items: [
            {
              format: 'SCENARIO',
              prompt: 'A host is swapping heavily; what do you check first and why in this shop?',
              rubric: 'Names memory pressure, not CPU. Names a concrete next command.',
              modelAnswer: 'Check RSS vs available RAM, then reclaim or add capacity.',
            },
          ],
        },
      });
    const service = new EvaluationService(gatewayWithComplete(complete));
    const form = await service.generateSkillForm(
      {
        skillCode: 'SDE_OPERATING_SYSTEMS',
        proficiency: 'BEGINNER',
        attemptId: 'attempt-1',
      },
      OWNER_ID,
    );
    await expect(
      service.gradeSkillForm(
        {
          skillCode: 'SDE_OPERATING_SYSTEMS',
          proficiency: 'BEGINNER',
          scoringToken: form.scoringToken,
          responses: [{ index: 1, selectedKey: 'A' }],
        },
        OTHER_ID,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('keeps answer keys out of the opaque scoring token', () => {
    const payload = { answer: 'A', exp: Date.now() + 60_000 };
    const token = sealSdeFormPayload(payload);
    expect(token.includes('answer')).toBe(false);
    expect(unsealSdeFormPayload<typeof payload>(token).answer).toBe('A');
  });
});
