'use client';

import type { AssessmentResult, GradeSdeSkillFormResponse } from '@smart/contracts';
import { Button } from '@smart/ui';
import { skillNameForCode } from '@/lib/skill-declarations';

export function SkillVerifyReport({
  grade,
  assessmentResult: _assessmentResult,
  catalogSkillCode,
  onDone,
}: {
  grade?: GradeSdeSkillFormResponse | null;
  assessmentResult?: AssessmentResult | null;
  catalogSkillCode?: string;
  onDone: () => void;
}) {
  const skillLabel = catalogSkillCode
    ? skillNameForCode(catalogSkillCode)
    : (grade?.skillCode ?? 'Skill verification');

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 p-6 text-[var(--text-primary)]">
      <header className="space-y-2">
        <h1 className="text-xl font-semibold">Assessment finished</h1>
        <p className="text-sm text-[var(--text-muted)]">{skillLabel}</p>
      </header>

      <Button type="button" variant="primary" className="w-full sm:w-auto" onClick={onDone}>
        Back to Skills
      </Button>
    </div>
  );
}
