/** Catalog-adjacent code for a typed skill name (certificate skillCode max 64). */
export function unlistedSkillCode(name: string): string {
  const slug = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50);
  const code = `UL_${slug || 'SKILL'}`;
  return code.slice(0, 64);
}

export function isUnlistedSkillCode(code: string): boolean {
  return code.startsWith('UL_');
}
