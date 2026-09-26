import { CampusEmployersTable } from '../../../../components/campus/CampusEmployersTable';

export const metadata = { title: 'Campus employers · SMART TPO' };

/** UNI-05 (Th6-447) — employers recruiting from this institution, aggregates only. */
export default function CampusEmployersPage() {
  return <CampusEmployersTable />;
}
