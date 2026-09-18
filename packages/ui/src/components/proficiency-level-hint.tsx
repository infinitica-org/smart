import { Info } from 'lucide-react';
import { proficiencyLegendEntries } from '@smart/contracts';

const legend = proficiencyLegendEntries();

export function ProficiencyLevelHint({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex align-middle ${className}`}
      title={legend.map((row) => `Level ${row.level} → ${row.traditionalLabel}`).join('\n')}
    >
      <Info className="size-3.5 opacity-70" aria-hidden />
      <span className="sr-only">Proficiency level legend</span>
    </span>
  );
}
