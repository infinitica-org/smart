import { getSkillDefinition, type ProjectDto } from '@smart/contracts';
import { parseStackTags } from '@/components/profile/projects/project-presenters';

/** When project skill-mapping UI is unused, infer linkage from stack tags vs catalog skill name. */
export function projectStackDeclaresSkill(project: ProjectDto, skillCode: string): boolean {
  const definition = getSkillDefinition(skillCode);
  if (!definition) return false;

  const tags = parseStackTags(project.stack).map((tag) => tag.toLowerCase());
  if (tags.length === 0) return false;

  const name = definition.name.toLowerCase();
  const nameTokens = name.split(/[\s/]+/).filter((token) => token.length > 2);

  return tags.some((tag) => {
    if (name.includes(tag) || tag.includes(name)) return true;
    return nameTokens.some((token) => tag.includes(token) || token.includes(tag));
  });
}
