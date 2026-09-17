import { z } from 'zod';

/** How the student entered the skill certification queue (audit + UI copy). */
export const SkillClaimDeclareOriginSchema = z.enum(['MANUAL', 'PROJECT_TAGGED', 'GITHUB_DERIVED']);
export type SkillClaimDeclareOrigin = z.infer<typeof SkillClaimDeclareOriginSchema>;

const PROJECT_TAGGED_METADATA_KEY = 'declareOrigin' as const;

export function projectTaggedSkillClaimMetadata(projectId: string): Record<string, unknown> {
  return {
    [PROJECT_TAGGED_METADATA_KEY]: 'PROJECT_TAGGED' satisfies SkillClaimDeclareOrigin,
    projectIds: [projectId],
    taggedAt: new Date().toISOString(),
  };
}

export function mergeLinkedProjectIds(
  existing: unknown,
  projectId: string,
): Record<string, unknown> {
  const base =
    existing && typeof existing === 'object' && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};
  const ids = new Set<string>(
    Array.isArray(base.linkedProjectIds)
      ? base.linkedProjectIds.filter((id): id is string => typeof id === 'string')
      : [],
  );
  ids.add(projectId);
  return { ...base, linkedProjectIds: [...ids] };
}

export function mergeProjectTaggedMetadata(
  existing: unknown,
  projectId: string,
): Record<string, unknown> {
  const base =
    existing && typeof existing === 'object' && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};
  const origin = base[PROJECT_TAGGED_METADATA_KEY];
  if (origin === 'MANUAL') return mergeLinkedProjectIds(base, projectId);
  const ids = new Set<string>(
    Array.isArray(base.projectIds)
      ? base.projectIds.filter((id): id is string => typeof id === 'string')
      : [],
  );
  ids.add(projectId);
  return {
    ...base,
    [PROJECT_TAGGED_METADATA_KEY]: 'PROJECT_TAGGED',
    projectIds: [...ids],
    taggedAt: base.taggedAt ?? new Date().toISOString(),
  };
}

export function skillClaimDeclareOrigin(params: {
  source?: string | null;
  sourceMetadata?: unknown;
}): SkillClaimDeclareOrigin {
  const meta =
    params.sourceMetadata &&
    typeof params.sourceMetadata === 'object' &&
    !Array.isArray(params.sourceMetadata)
      ? (params.sourceMetadata as Record<string, unknown>)
      : null;
  const fromMeta = meta?.[PROJECT_TAGGED_METADATA_KEY];
  const parsedMeta = SkillClaimDeclareOriginSchema.safeParse(fromMeta);
  if (parsedMeta.success) return parsedMeta.data;
  if (params.source === 'GITHUB_DERIVED') return 'GITHUB_DERIVED';
  return 'MANUAL';
}
