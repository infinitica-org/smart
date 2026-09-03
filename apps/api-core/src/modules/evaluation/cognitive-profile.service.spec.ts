import { BadGatewayException, ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { COGNITIVE_PROFILE_PROMPT_REF } from '@smart/contracts';
import type { AiGatewayService } from '../ai-gateway/ai-gateway.service.js';
import { buildCognitiveBioDigest, isCognitiveProfileFresh } from './cognitive-profile.digest.js';
import { parseCognitiveCommLlmOutput } from './cognitive-profile.mapper.js';
import { CognitiveProfileService } from './cognitive-profile.service.js';

const studentId = '11111111-1111-4111-8111-111111111111';

const llmOutput = {
  cognitiveNarrative:
    'Breaks work into ordered steps and checks constraints before choosing a tool.'.padEnd(40, '.'),
  communicationNarrative:
    'Writes short updates that name the blocker and the decision needed.'.padEnd(40, '.'),
  cognitiveStrengths: ['Checks assumptions before implementing a change.'],
  cognitiveWeaknesses: ['Starts building before listing the constraint set.'],
  communicationStrengths: ['Leads with the decision requested in written updates.'],
  communicationWeaknesses: ['Omits who the audience is when explaining a trade-off.'],
  cognitiveScore: 61,
  communicationScore: 57,
};

const onboardingDetails = {
  firstName: 'Pilot',
  lastName: 'Student',
  phoneCountryCode: '+91',
  phoneNumber: '9000000000',
  linkedinUrl: '',
  education: [
    { institutionName: 'PSG College of Technology', degree: 'B.E.', fieldOfStudy: 'CSE' },
  ],
  experiences: [
    {
      role: 'Intern',
      company: 'Infinitica',
      description: 'Wrote weekly notes for a small intern cohort.',
      tags: [],
    },
  ],
  skills: [{ type: 'technical', name: 'javascript', proficiency: 'ADVANCED' }],
  preferences: ['backend internships'],
  dpdpConsent: true as const,
  dpdpConsentAt: '2026-09-01T00:00:00.000Z',
  completedAt: '2026-09-01T00:00:00.000Z',
};

function prismaMock(overrides?: { user?: unknown; cognitive?: unknown; communication?: unknown }) {
  return {
    user: {
      findUnique: vi.fn().mockResolvedValue(
        overrides?.user ?? {
          id: studentId,
          role: 'STUDENT',
          onboardingCompleted: true,
          onboardingDetails,
        },
      ),
    },
    cognitiveProfile: {
      findUnique: vi.fn().mockResolvedValue(overrides?.cognitive ?? null),
      upsert: vi.fn().mockResolvedValue({}),
    },
    communicationProfile: {
      findUnique: vi.fn().mockResolvedValue(overrides?.communication ?? null),
      upsert: vi.fn().mockResolvedValue({}),
    },
    $transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  };
}

describe('buildCognitiveBioDigest', () => {
  it('omits declared skills so the model is not grading a skill claim', () => {
    const digest = buildCognitiveBioDigest(onboardingDetails);
    expect(digest).toContain('PSG');
    expect(digest).not.toContain('javascript');
  });
});

describe('isCognitiveProfileFresh', () => {
  it('skips regenerate inside the 90-day window', () => {
    const now = new Date('2026-09-03T00:00:00.000Z');
    const recent = new Date('2026-08-01T00:00:00.000Z');
    expect(isCognitiveProfileFresh(recent, now, 90)).toBe(true);
    expect(isCognitiveProfileFresh(new Date('2026-05-01T00:00:00.000Z'), now, 90)).toBe(false);
  });
});

describe('parseCognitiveCommLlmOutput', () => {
  it('fails closed when weaknesses are missing', () => {
    expect(() => parseCognitiveCommLlmOutput({ ...llmOutput, cognitiveWeaknesses: [] })).toThrow();
  });
});

describe('CognitiveProfileService', () => {
  it('persists both axes from a stubbed gateway', async () => {
    const complete = vi.fn().mockResolvedValue({ output: llmOutput, auditId: null });
    const prisma = prismaMock();
    const service = new CognitiveProfileService(
      { complete } as unknown as AiGatewayService,
      prisma as never,
    );

    const result = await service.refresh(studentId, {});

    expect(result.status).toBe('ready');
    expect(result.snapshot?.cognitive.score).toBe(61);
    expect(complete.mock.calls[0]?.[0]).toMatchObject({
      promptRef: COGNITIVE_PROFILE_PROMPT_REF,
      priority: 'P3_BATCH',
    });
    expect(String(complete.mock.calls[0]?.[0]?.variables?.bioDigest)).not.toContain('javascript');
    expect(prisma.cognitiveProfile.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.communicationProfile.upsert).toHaveBeenCalledTimes(1);
  });

  it('returns the existing snapshot inside 90 days without calling the gateway', async () => {
    const complete = vi.fn();
    const refreshedAt = new Date('2026-08-20T00:00:00.000Z');
    const prisma = prismaMock({
      cognitive: {
        narrative: llmOutput.cognitiveNarrative,
        strengths: llmOutput.cognitiveStrengths,
        weaknesses: llmOutput.cognitiveWeaknesses,
        score: 61,
        refreshedAt,
      },
      communication: {
        narrative: llmOutput.communicationNarrative,
        strengths: llmOutput.communicationStrengths,
        weaknesses: llmOutput.communicationWeaknesses,
        score: 57,
        refreshedAt,
      },
    });
    const service = new CognitiveProfileService(
      { complete } as unknown as AiGatewayService,
      prisma as never,
    );

    const result = await service.refresh(studentId, {}, new Date('2026-09-03T00:00:00.000Z'));
    expect(result.status).toBe('ready');
    expect(complete).not.toHaveBeenCalled();
  });

  it('calls the gateway when force is true even if the snapshot is fresh', async () => {
    const complete = vi.fn().mockResolvedValue({ output: llmOutput, auditId: null });
    const refreshedAt = new Date('2026-08-20T00:00:00.000Z');
    const prisma = prismaMock({
      cognitive: {
        narrative: llmOutput.cognitiveNarrative,
        strengths: llmOutput.cognitiveStrengths,
        weaknesses: llmOutput.cognitiveWeaknesses,
        score: 61,
        refreshedAt,
      },
      communication: {
        narrative: llmOutput.communicationNarrative,
        strengths: llmOutput.communicationStrengths,
        weaknesses: llmOutput.communicationWeaknesses,
        score: 57,
        refreshedAt,
      },
    });
    const service = new CognitiveProfileService(
      { complete } as unknown as AiGatewayService,
      prisma as never,
    );
    await service.refresh(studentId, { force: true }, new Date('2026-09-03T00:00:00.000Z'));
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it('rejects when onboarding is incomplete', async () => {
    const service = new CognitiveProfileService(
      { complete: vi.fn() } as unknown as AiGatewayService,
      prismaMock({ user: { id: studentId, role: 'STUDENT', onboardingCompleted: false } }) as never,
    );
    await expect(service.refresh(studentId, {})).rejects.toBeInstanceOf(ConflictException);
  });

  it('fails closed on invalid LLM JSON', async () => {
    const complete = vi.fn().mockResolvedValue({
      output: { ...llmOutput, cognitiveNarrative: 'short' },
    });
    const service = new CognitiveProfileService(
      { complete } as unknown as AiGatewayService,
      prismaMock() as never,
    );
    await expect(service.refresh(studentId, {})).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('returns 404 when GET has no rows', async () => {
    const service = new CognitiveProfileService(
      { complete: vi.fn() } as unknown as AiGatewayService,
      prismaMock() as never,
    );
    await expect(service.getMine(studentId)).rejects.toBeInstanceOf(NotFoundException);
  });
});
