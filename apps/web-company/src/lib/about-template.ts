export interface AboutTemplateInput {
  name?: string;
  industry?: string;
  size?: string;
  location?: string;
}

const clean = (value: string | undefined) => value?.trim() ?? '';

/**
 * Draft "About Organization" text from details the company already entered. A fixed template, not
 * generated content: it only states what was provided and leaves the rest for the company to write.
 */
export function buildAboutDraft(input: AboutTemplateInput): string {
  const name = clean(input.name);
  if (!name) return '';
  const industry = clean(input.industry);
  const size = clean(input.size);
  const location = clean(input.location);

  const facts = [
    industry ? `in ${industry}` : '',
    location ? `based in ${location}` : '',
    size ? `with ${size}` : '',
  ].filter(Boolean);

  const intro =
    facts.length > 0 ? `${name} is a company ${facts.join(', ')}.` : `${name} is a company.`;
  return `${intro} We hire verified graduates and student talent through SMART competency credentials.`;
}
