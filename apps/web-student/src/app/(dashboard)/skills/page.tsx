import { redirect } from 'next/navigation';

/** Skill catalog lives at `/assessments`; legacy links used `/skills`. */
export default function SkillsIndexPage() {
  redirect('/assessments');
}
