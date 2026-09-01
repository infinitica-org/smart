import { describe, expect, it, vi } from 'vitest';
import { ResumeParseDraftSchema } from '@smart/contracts';
import { ResumeParseService, RESUME_PARSE_PROMPT_REF } from './resume-parse.service.js';
import type { AiGatewayService } from './ai-gateway.service.js';

const sampleDraft = ResumeParseDraftSchema.parse({
  basicInfo: { firstName: 'Asha', lastName: 'Iyer' },
  education: [{ institutionName: 'PSG College of Technology' }],
  experiences: [{ role: 'Intern', company: 'Infinitica' }],
  skills: [{ type: 'technical', name: 'Python', proficiency: 'INTERMEDIATE' }],
  parseConfidence: 0.8,
  missingFields: [],
});

const resumeText = 'Asha Iyer\nB.E. PSG College of Technology\nIntern, Infinitica\nPython';

function gatewayWithComplete(complete: AiGatewayService['complete']): AiGatewayService {
  return { complete } as AiGatewayService;
}

describe('ResumeParseService', () => {
  it('returns a schema-valid draft without calling a live model', async () => {
    const complete = vi.fn().mockResolvedValue({ output: sampleDraft });
    const service = new ResumeParseService(gatewayWithComplete(complete));

    const result = await service.parse({ rawText: resumeText.padEnd(40, '.') });

    expect(result.status).toBe('PARSED');
    expect(result.draft?.basicInfo?.firstName).toBe('Asha');
    expect(complete).toHaveBeenCalledTimes(1);
    expect(complete.mock.calls[0]?.[0]).toMatchObject({
      promptRef: RESUME_PARSE_PROMPT_REF,
      temperature: 0,
      variables: { rawText: resumeText.padEnd(40, '.') },
    });
  });

  it('fails closed when the gateway throws so the form stays editable', async () => {
    const complete = vi.fn().mockRejectedValue(new Error('no providers'));
    const service = new ResumeParseService(gatewayWithComplete(complete));

    await expect(service.parse({ rawText: resumeText.padEnd(40, '.') })).resolves.toEqual({
      status: 'FAILED',
      draft: null,
    });
  });

  it('fails closed on schema-invalid model JSON', async () => {
    const complete = vi.fn().mockResolvedValue({ output: { parseConfidence: 2 } });
    const service = new ResumeParseService(gatewayWithComplete(complete));

    await expect(service.parse({ rawText: resumeText.padEnd(40, '.') })).resolves.toEqual({
      status: 'FAILED',
      draft: null,
    });
  });

  it('does not call the gateway when only objectKey is provided', async () => {
    const complete = vi.fn();
    const service = new ResumeParseService(gatewayWithComplete(complete));

    await expect(service.parse({ objectKey: 'resumes/u1/cv.pdf' })).resolves.toEqual({
      status: 'FAILED',
      draft: null,
    });
    expect(complete).not.toHaveBeenCalled();
  });
});
