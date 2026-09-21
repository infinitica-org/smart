import { redirect } from 'next/navigation';

/** Skill verification lives at `/assessments/skills/[claimId]`. Without a claim id,
 * Next would otherwise treat `skills` as an L1 attempt id and show legacy proctoring. */
export default function AssessmentsSkillsIndexPage() {
  redirect('/assessments');
}
