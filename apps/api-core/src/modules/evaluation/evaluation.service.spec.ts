import { BadGatewayException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import {
  EvaluationService,
  SKILL_INTERVIEW_EXAMINER_PROMPT_REF,
  SKILL_INTERVIEW_GRADER_PROMPT_REF,
} from './evaluation.service.js';
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
