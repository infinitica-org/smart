import { redirect } from 'next/navigation';

/** Legacy route — skill selection lives under Profile; assessments hub is `/assessment`. */
export default function LegacyAssessmentsPage() {
  redirect('/assessment');
}
