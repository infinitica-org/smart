import { z } from 'zod';
import { TaxonomySkillCodeSchema } from '../../dto/catalog.dto.js';

export const CareerDomainSchema = z.object({
  domainId: z.string().min(1).max(64),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  skillIds: z.array(TaxonomySkillCodeSchema).max(200).default([]),
  roleIds: z.array(z.string().min(1).max(64)).max(100).default([]),
});
export type CareerDomain = z.infer<typeof CareerDomainSchema>;

/** V1 seed — SOFTWARE_IT career domain aligned with skill@1 taxonomy. */
export const CAREER_DOMAINS: readonly CareerDomain[] = [
  {
    domainId: 'SOFTWARE_IT',
    name: 'Software & IT',
    description: 'Software engineering, cloud, data, and IT infrastructure roles.',
    skillIds: [],
    roleIds: [
      'FULL_STACK_DEVELOPER',
      'BACKEND_DEVELOPER',
      'FRONTEND_DEVELOPER',
      'DEVOPS_ENGINEER',
      'DATA_ENGINEER',
    ],
  },
] as const;
