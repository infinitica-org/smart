import { SKILL_VERIFICATION_ASSESSMENT_SUMMARY } from '@/lib/skill-declarations';

export function SkillVerificationInstructions({ className = '' }: { className?: string }) {
  return (
    <div
      className={`space-y-2 rounded-xl border border-foreground/20 bg-foreground/5 p-4 ${className}`}
    >
      <p className="text-sm font-semibold text-foreground">How we assess you</p>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {SKILL_VERIFICATION_ASSESSMENT_SUMMARY}
      </p>
    </div>
  );
}
