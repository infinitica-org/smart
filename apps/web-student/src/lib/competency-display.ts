import {
  getSkillBlueprint,
  getSkillDefinition,
  buildSkillBlueprintForCategory,
  type CompetencyStatus,
  type SkillEvidenceContext,
} from '@smart/contracts';

export const COMPETENCY_STATUS_LABELS: Record<CompetencyStatus, string> = {
  DEMONSTRATED: 'Demonstrated',
  PARTIALLY_DEMONSTRATED: 'Partially demonstrated',
  UNCERTAIN: 'Uncertain',
  NOT_DEMONSTRATED: 'Not demonstrated',
  NOT_TESTED: 'Not tested',
};

export function competencyLabel(skillCode: string, competencyId: string): string {
  const authored = getSkillBlueprint(skillCode);
  if (authored) {
    const match = authored.competencyModel.find((row) => row.competencyId === competencyId);
    if (match) return match.capability;
  }
  const def = getSkillDefinition(skillCode);
  if (!def) return competencyId.slice(0, 8);
  const fallback = buildSkillBlueprintForCategory(
    def.code,
    def.name,
    def.domain,
    def.categoryName,
    def.categoryId,
  );
  return (
    fallback.competencyModel.find((row) => row.competencyId === competencyId)?.capability ??
    competencyId.slice(0, 8)
  );
}

export function competencyStatusTone(status: CompetencyStatus): string {
  if (status === 'DEMONSTRATED') return 'text-foreground dark:text-foreground';
  if (status === 'PARTIALLY_DEMONSTRATED') return 'text-amber-700 dark:text-amber-400';
  if (status === 'UNCERTAIN') return 'text-orange-700 dark:text-orange-400';
  if (status === 'NOT_DEMONSTRATED') return 'text-rose-700 dark:text-rose-400';
  return 'text-muted-foreground';
}

export function competencyStatusBadgeVariant(
  status: CompetencyStatus,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'DEMONSTRATED') return 'default';
  if (status === 'PARTIALLY_DEMONSTRATED') return 'secondary';
  if (status === 'NOT_DEMONSTRATED' || status === 'UNCERTAIN') return 'destructive';
  return 'outline';
}

export function summarizeEvidenceContext(context: SkillEvidenceContext | undefined): string {
  if (!context || context.availableCount === 0) {
    return 'No projects or work experience linked to this skill yet. You can still take the assessment.';
  }
  const labels = context.items.slice(0, 3).map((item) => item.label);
  const extra =
    context.availableCount > labels.length
      ? ` and ${String(context.availableCount - labels.length)} more`
      : '';
  return `Linked on your profile: ${labels.join(', ')}${extra}.`;
}
