import {
  BadGatewayException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
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

function codingOpenItem() {
  return {
    format: 'CODING' as const,
    title: 'Two Sum',
    prompt:
      'Given an integer array nums and an integer target, return indices of the two numbers that add up to target.',
    constraints: '2 <= nums.length <= 10000. Exactly one valid pair. Do not reuse the same index.',
    examples: [
      { input: 'nums = [2,7,11,15], target = 9', output: '[0,1]', explanation: '2 + 7 = 9' },
      { input: 'nums = [3,2,4], target = 6', output: '[1,2]' },
    ],
    hiddenTests: [
      { input: 'nums = [3,3], target = 6', expected: '[0,1]' },
      { input: 'nums = [0,4,3,0], target = 0', expected: '[0,3]' },
      { input: 'nums = [-1,-2,-3,-4,-5], target = -8', expected: '[2,4]' },
    ],
    rubric: 'Correct indices for every hidden test. Hash map O(n) is preferred.',
    modelAnswer:
      'Scan once with a map from value to index and return when target minus current exists.',
  };
}

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

  it('accepts extra LLM items on diagnostic forms and coerces sparse CODING output', async () => {
    const closedWithSlots = closedItems(8, 3).map((item, idx) => ({
      ...item,
      competencySlot: `C${String((idx % 6) + 1)}` as const,
    }));
    const complete = vi
      .fn()
      .mockResolvedValueOnce({ output: { items: closedWithSlots } })
      .mockResolvedValueOnce({
        output: {
          items: [
            {
              format: 'CODING',
              competencySlot: 'C2',
              prompt: 'Implement two sum for a unique-integer array with O(n) expected time.',
              rubric: 'Correct hash map solution with tests in mind.',
              modelAnswer: 'Use a hashmap of value to index.',
            },
            {
              format: 'SCENARIO',
              competencySlot: 'C3',
              prompt: 'Extra scenario item the model over-generated for diagnostic stage.',
              rubric: 'Names a concrete mitigation step with trade-offs.',
              modelAnswer: 'Reduce scope and roll back the change safely.',
            },
          ],
        },
      });
    const service = new EvaluationService(gatewayWithComplete(complete));
    const result = await service.generateSkillForm(
      {
        skillCode: 'SDE_PROGRAMMING_FUNDAMENTALS',
        proficiency: 'BEGINNER',
        attemptId: 'attempt-diagnostic',
        stage: 'DIAGNOSTIC',
        catalogSkillCode: 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT',
      },
      OWNER_ID,
    );

    expect(result.stage).toBe('DIAGNOSTIC');
    expect(result.items.length).toBeLessThan(12);
    expect(result.items.some((item) => item.format === 'CODING')).toBe(true);
    expect(complete).toHaveBeenCalledTimes(2);
  });

  it('accepts six over-generated open LLM items without gateway schema failure', async () => {
    const overGenerated = Array.from({ length: 6 }, (_, i) => ({
      format: 'SCENARIO' as const,
      prompt: `Open scenario ${String(i + 1)}: incremental load with duplicate keys and SLA pressure.`,
      rubric: 'Names idempotent writes, monitoring, and a recovery path.',
      modelAnswer: 'Merge on natural key, alert on SLA breach, replay from checkpoint.',
    }));
    const complete = vi
      .fn()
      .mockResolvedValueOnce({ output: { items: closedItems(8, 3) } })
      .mockResolvedValueOnce({ output: { items: overGenerated } });
    const service = new EvaluationService(gatewayWithComplete(complete));
    const result = await service.generateSkillForm(
      {
        skillCode: 'SDE_OPERATING_SYSTEMS',
        proficiency: 'BEGINNER',
        attemptId: 'attempt-open-overgen',
      },
      OWNER_ID,
    );

    expect(result.items).toHaveLength(12);
    expect(result.items.filter((item) => item.format === 'SCENARIO')).toHaveLength(1);
    expect(complete).toHaveBeenCalledTimes(2);
  });

  it('uses SCENARIO open items for APPLIED catalog skills on SDE_TESTING blueprint', async () => {
    const closedWithSlots = closedItems(8, 3).map((item, idx) => ({
      ...item,
      competencySlot: `C${String((idx % 6) + 1)}` as const,
    }));
    const complete = vi
      .fn()
      .mockResolvedValueOnce({ output: { items: closedWithSlots } })
      .mockResolvedValueOnce({
        output: {
          items: [
            {
              format: 'SCENARIO',
              competencySlot: 'C1',
              prompt:
                'During a scoped web app pentest you find reflected XSS in search. What is your next step under ROE?',
              rubric: 'Names validation scope, evidence capture, and safe reproduction.',
              modelAnswer:
                'Confirm in scope, reproduce minimally, document impact, stop short of exploit.',
            },
          ],
        },
      });
    const service = new EvaluationService(gatewayWithComplete(complete));
    const result = await service.generateSkillForm(
      {
        skillCode: 'SDE_TESTING',
        proficiency: 'BEGINNER',
        attemptId: 'attempt-pentest-diagnostic',
        stage: 'DIAGNOSTIC',
        catalogSkillCode: 'PENETRATION_TESTING_VULNERABILITY_ASSESSMENT',
      },
      OWNER_ID,
    );

    expect(result.items.some((item) => item.format === 'SCENARIO')).toBe(true);
    expect(complete.mock.calls[1]?.[0]?.variables.formats).toEqual(['SCENARIO']);
    expect(complete.mock.calls[1]?.[0]?.variables.taskFamily).toBe('APPLIED');
  });

  it('accepts mislabeled CODING output for SCENARIO-only deployment diagnostic forms', async () => {
    const closedWithSlots = closedItems(8, 3).map((item, idx) => ({
      ...item,
      competencySlot: `C${String((idx % 6) + 1)}` as const,
    }));
    const complete = vi
      .fn()
      .mockResolvedValueOnce({ output: { items: closedWithSlots } })
      .mockResolvedValueOnce({
        output: {
          items: [
            {
              format: 'CODING',
              competencySlot: 'C2',
              prompt:
                'Your MLflow model registry promotion fails during canary deploy. What steps do you take first?',
              rubric: 'Names metrics comparison, rollback, or registry checks with trade-offs.',
              modelAnswer:
                'Compare canary error rate to baseline and halt promotion if it regresses.',
            },
          ],
        },
      });
    const service = new EvaluationService(gatewayWithComplete(complete));
    const result = await service.generateSkillForm(
      {
        skillCode: 'SDE_DEPLOYMENT_CICD',
        proficiency: 'BEGINNER',
        attemptId: 'attempt-mlops-diagnostic',
        stage: 'DIAGNOSTIC',
        catalogSkillCode: 'MLOPS_MODEL_LIFECYCLE_MANAGEMENT',
      },
      OWNER_ID,
    );

    expect(result.stage).toBe('DIAGNOSTIC');
    expect(result.items.some((item) => item.format === 'SCENARIO')).toBe(true);
    expect(complete.mock.calls[1]?.[0]?.variables.formats).toEqual(['SCENARIO']);
  });

  it('remaps DEBUG output to SCENARIO when diagnostic expects only scenario items', async () => {
    const closedWithSlots = closedItems(8, 3).map((item, idx) => ({
      ...item,
      competencySlot: `C${String((idx % 6) + 1)}` as const,
    }));
    const complete = vi
      .fn()
      .mockResolvedValueOnce({ output: { items: closedWithSlots } })
      .mockResolvedValueOnce({
        output: {
          items: [
            {
              format: 'DEBUG',
              competencySlot: 'C4',
              prompt:
                'A Kubeflow pipeline step fails after model registry promotion. Identify the first checks.',
              rubric: 'Names logs, metrics, or rollback with a concrete next step.',
              modelAnswer: 'Inspect pipeline pod logs and compare canary metrics to baseline.',
            },
          ],
        },
      });
    const service = new EvaluationService(gatewayWithComplete(complete));
    const result = await service.generateSkillForm(
      {
        skillCode: 'SDE_DEPLOYMENT_CICD',
        proficiency: 'BEGINNER',
        attemptId: 'attempt-mlops-debug-diagnostic',
        stage: 'DIAGNOSTIC',
        catalogSkillCode: 'MLOPS_MODEL_LIFECYCLE_MANAGEMENT',
      },
      OWNER_ID,
    );

    expect(result.items.some((item) => item.format === 'SCENARIO')).toBe(true);
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
    expect(result.mcqCorrect).toBe(8);
    expect(result.mcqTotal).toBe(8);
    expect(result.traceCorrect).toBe(3);
    expect(result.traceTotal).toBe(3);
    expect(result.itemResults.some((row) => row.format === 'SCENARIO' && row.feedback)).toBe(true);
    expect(generateComplete).toHaveBeenCalledTimes(3);
  });

  it('accepts 0-based open grader indices and maps them to sealed item indices', async () => {
    const generateComplete = vi
      .fn()
      .mockResolvedValueOnce({ output: { items: closedItems(8, 3) } })
      .mockResolvedValueOnce({
        output: {
          items: [
            {
              format: 'SCENARIO',
              prompt: 'Design an idempotent ELT job when upstream sends duplicate keys.',
              rubric: 'Names dedupe strategy and idempotent writes.',
              modelAnswer: 'Use merge/upsert with a stable natural key.',
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        output: {
          grades: [
            {
              index: 0,
              marksAwarded: 9,
              justification: 'Strong idempotent ELT design with clear dedupe semantics.',
            },
          ],
        },
      });
    const service = new EvaluationService(gatewayWithComplete(generateComplete));
    const form = await service.generateSkillForm(
      {
        skillCode: 'SDE_OPERATING_SYSTEMS',
        proficiency: 'BEGINNER',
        attemptId: 'attempt-elt',
      },
      OWNER_ID,
    );
    const openIndex = form.items.find((item) => item.format === 'SCENARIO')?.index;
    expect(openIndex).toBeDefined();
    if (openIndex === undefined) {
      throw new Error('Expected SCENARIO item in generated form');
    }

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
          { index: openIndex, text: 'Upsert on natural key with merge for late-arriving facts.' },
        ],
      },
      OWNER_ID,
    );

    expect(
      result.itemResults.some((row) => row.format === 'SCENARIO' && row.marksEarned === 9),
    ).toBe(true);
  });

  it('fails closed when the open grader returns fewer grades than open items', async () => {
    const generateComplete = vi
      .fn()
      .mockResolvedValueOnce({ output: { items: closedItems(8, 2) } })
      .mockResolvedValueOnce({
        output: {
          items: [
            {
              format: 'SCENARIO',
              prompt: 'Design an idempotent ELT job when upstream sends duplicate keys.',
              rubric: 'Names dedupe strategy and idempotent writes.',
              modelAnswer: 'Use merge/upsert with a stable natural key.',
            },
            {
              format: 'SCENARIO',
              prompt: 'A nightly batch misses its SLA. What do you check first?',
              rubric: 'Names orchestration metrics and upstream delays.',
              modelAnswer: 'Check scheduler run history and upstream freshness.',
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        output: {
          grades: [
            {
              index: 0,
              marksAwarded: 7,
              justification: 'Only the first scenario was graded by the model.',
            },
          ],
        },
      });
    const service = new EvaluationService(gatewayWithComplete(generateComplete));
    const form = await service.generateSkillForm(
      {
        skillCode: 'SDE_OPERATING_SYSTEMS',
        proficiency: 'INTERMEDIATE',
        attemptId: 'attempt-two-open',
      },
      OWNER_ID,
    );
    const openItems = form.items.filter((item) => item.format === 'SCENARIO');
    expect(openItems).toHaveLength(2);

    await expect(
      service.gradeSkillForm(
        {
          skillCode: 'SDE_OPERATING_SYSTEMS',
          proficiency: 'INTERMEDIATE',
          scoringToken: form.scoringToken,
          responses: [
            ...form.items
              .filter((item) => item.format === 'MCQ' || item.format === 'TRACE')
              .map((item) => ({
                index: item.index,
                selectedKey: item.format === 'MCQ' ? 'A' : 'B',
              })),
            ...openItems.map((item) => ({
              index: item.index,
              text: 'Idempotent merge on natural key with monitoring and replay.',
            })),
          ],
        },
        OWNER_ID,
      ),
    ).rejects.toBeInstanceOf(BadGatewayException);
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

  it('exposes coding examples publicly and grades against hidden tests', async () => {
    const complete = vi
      .fn()
      .mockResolvedValueOnce({ output: { items: closedItems(8, 3) } })
      .mockResolvedValueOnce({ output: { items: [codingOpenItem()] } })
      .mockResolvedValueOnce({
        output: {
          grades: [
            {
              index: 12,
              marksAwarded: 7,
              justification: 'Passed two hidden tests; missed duplicate zeros.',
              testsPassed: 2,
              testsTotal: 3,
              missedTests: [
                {
                  input: 'nums = [3,3], target = 6',
                  expected: '[0,1]',
                  reason: 'Did not handle duplicate values.',
                },
              ],
            },
          ],
        },
      });
    const service = new EvaluationService(gatewayWithComplete(complete));
    const form = await service.generateSkillForm(
      {
        skillCode: 'SDE_PROGRAMMING_FUNDAMENTALS',
        proficiency: 'BEGINNER',
        attemptId: 'attempt-coding',
      },
      OWNER_ID,
    );
    const coding = form.items.find((item) => item.format === 'CODING');
    expect(coding?.title).toBe('Two Sum');
    expect(coding?.examples).toHaveLength(2);
    expect(JSON.stringify(form.items)).not.toContain('hiddenTests');
    expect(JSON.stringify(form.items)).not.toContain('nums = [3,3]');

    const result = await service.gradeSkillForm(
      {
        skillCode: 'SDE_PROGRAMMING_FUNDAMENTALS',
        proficiency: 'BEGINNER',
        scoringToken: form.scoringToken,
        responses: [
          ...form.items
            .filter((item) => item.format === 'MCQ' || item.format === 'TRACE')
            .map((item) => ({
              index: item.index,
              selectedKey: item.format === 'MCQ' ? 'A' : 'B',
            })),
          { index: 12, text: 'function twoSum(nums, target) { return [0, 1]; }' },
        ],
      },
      OWNER_ID,
    );
    expect(result.mcqCorrect).toBe(8);
    expect(result.mcqTotal).toBe(8);
    const codingResult = result.itemResults.find((row) => row.format === 'CODING');
    expect(codingResult?.testsPassed).toBe(2);
    expect(codingResult?.missedTests?.[0]?.reason).toContain('duplicate');
    expect(complete.mock.calls[2]?.[0]?.variables.items[0]?.hiddenTests).toHaveLength(3);
  });

  it('runs coding source against visible examples without awarding marks', async () => {
    const complete = vi.fn().mockResolvedValue({
      output: {
        compileError: null,
        tests: [
          {
            input: 'nums = [2,7,11,15], target = 9',
            expected: '[0,1]',
            actual: '[0,1]',
            passed: true,
          },
          {
            input: 'nums = [3,2,4], target = 6',
            expected: '[1,2]',
            actual: '[0,1]',
            passed: false,
          },
        ],
      },
    });
    const service = new EvaluationService(gatewayWithComplete(complete));
    const result = await service.runSkillFormCode({
      prompt: 'Two Sum',
      source: 'function twoSum() { return [0, 1]; }',
      examples: [
        { input: 'nums = [2,7,11,15], target = 9', output: '[0,1]' },
        { input: 'nums = [3,2,4], target = 6', output: '[1,2]' },
      ],
    });
    expect(result.testsPassed).toBe(1);
    expect(result.testsTotal).toBe(2);
    expect(result.compileError).toBeNull();
    expect(result.promptRef).toBe('sde-skill-code-runner@1');
    expect(complete.mock.calls[0]?.[0]?.promptRef).toBe('sde-skill-code-runner@1');
    expect(complete.mock.calls[0]?.[0]?.variables.tests).toHaveLength(2);
    expect(result).not.toHaveProperty('marksEarned');
  });

  it('fails closed when the code runner gateway throws', async () => {
    const complete = vi.fn().mockRejectedValue(new Error('provider down'));
    const service = new EvaluationService(gatewayWithComplete(complete));
    await expect(
      service.runSkillFormCode({
        prompt: 'Two Sum',
        source: 'function twoSum() {}',
        examples: [],
      }),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('keeps answer keys out of the opaque scoring token', () => {
    const payload = { answer: 'A', exp: Date.now() + 60_000 };
    const token = sealSdeFormPayload(payload);
    expect(token.includes('answer')).toBe(false);
    expect(unsealSdeFormPayload<typeof payload>(token).answer).toBe('A');
  });
});

const HAPPY_AGENDA = [
  'React',
  'Next.js',
  'State management',
  'REST API design',
  'Async Node/NestJS',
  'PostgreSQL queries',
  'Indexing',
  'Git workflows',
];

const paperItems = Array.from({ length: 5 }, (_, i) => ({
  index: i + 1,
  stem: `Which option matches fullstack topic ${String(i + 1)} in production code?`,
  itemType: 'MCQ' as const,
  options: [
    { label: 'A' as const, text: 'Correct approach' },
    { label: 'B' as const, text: 'Plausible mistake' },
    { label: 'C' as const, text: 'Another distractor' },
    { label: 'D' as const, text: 'Unrelated trivia' },
  ],
  correctKey: 'A' as const,
}));

function redisWithCount(count: number) {
  return {
    incr: vi.fn().mockResolvedValue(count),
    expire: vi.fn().mockResolvedValue(1),
  } as never;
}

describe('EvaluationService cert agenda (PR-T01)', () => {
  it('returns a student paper from a stubbed gateway without agenda mapping', async () => {
    const complete = vi.fn().mockResolvedValue({
      output: { items: paperItems },
      auditId: null,
    });
    const service = new EvaluationService(gatewayWithComplete(complete), redisWithCount(1));

    const result = await service.generateCertAgenda(
      { trackCode: 'TECH_FULLSTACK', agendaLines: HAPPY_AGENDA },
      OWNER_ID,
    );

    expect(result.items).toHaveLength(5);
    expect(result.promptRef).toBe('cert-agenda-generate@1');
    expect(result.taxonomyVersionSnapshot).toContain('cert-agenda-generate@1');
    expect(JSON.stringify(result)).not.toContain('sourceAgendaLine');
    expect(complete).toHaveBeenCalledTimes(1);
    expect(complete.mock.calls[0]?.[0]).toMatchObject({
      promptRef: 'cert-agenda-generate@1',
      modelRole: 'PRIMARY_REASONING',
    });
  });

  it('rejects a sparse agenda without calling the gateway', async () => {
    const complete = vi.fn();
    const service = new EvaluationService(gatewayWithComplete(complete), redisWithCount(1));
    const err = await service
      .generateCertAgenda({ trackCode: 'TECH_FULLSTACK', agendaLines: ['React', 'Git'] }, OWNER_ID)
      .catch((caught: unknown) => caught);
    expect(err).toBeInstanceOf(HttpException);
    expect((err as HttpException).getResponse()).toMatchObject({ error: 'sparse_agenda' });
    expect(complete).not.toHaveBeenCalled();
  });

  it('rejects a drifted agenda without calling the gateway', async () => {
    const complete = vi.fn();
    const service = new EvaluationService(gatewayWithComplete(complete), redisWithCount(1));
    const err = await service
      .generateCertAgenda(
        {
          trackCode: 'TECH_FULLSTACK',
          agendaLines: [
            'Sourdough starter hydration percentages',
            'Italian pasta dough lamination',
            'Wine pairing for aged cheddar',
            'Wedding cake fondant flowers',
            'Espresso extraction temperature',
            'Croissant butter lamination folds',
            'Chocolate tempering curves',
            'Knife skills for julienne vegetables',
          ],
        },
        OWNER_ID,
      )
      .catch((caught: unknown) => caught);
    expect(err).toBeInstanceOf(HttpException);
    expect((err as HttpException).getResponse()).toMatchObject({ error: 'agenda_drift' });
    expect(complete).not.toHaveBeenCalled();
  });

  it('fails closed when the stubbed gateway throws', async () => {
    const complete = vi.fn().mockRejectedValue(new Error('provider down'));
    const service = new EvaluationService(gatewayWithComplete(complete), redisWithCount(1));
    await expect(
      service.generateCertAgenda(
        { trackCode: 'TECH_FULLSTACK', agendaLines: HAPPY_AGENDA },
        OWNER_ID,
      ),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('rate-limits regen abuse without calling the gateway', async () => {
    const complete = vi.fn();
    const service = new EvaluationService(gatewayWithComplete(complete), redisWithCount(4));
    const err = await service
      .generateCertAgenda({ trackCode: 'TECH_FULLSTACK', agendaLines: HAPPY_AGENDA }, OWNER_ID)
      .catch((caught: unknown) => caught);
    expect(err).toBeInstanceOf(HttpException);
    expect((err as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect(complete).not.toHaveBeenCalled();
  });
});
