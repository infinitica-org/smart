import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { StudentTopMatchesPanel } from './StudentTopMatchesPanel';

afterEach(cleanup);

const base = { companyName: 'Initech', location: 'Pune', matchPercentage: 80 };

describe('StudentTopMatchesPanel applied badge', () => {
  it('shows Applied only on matches the student already applied to', () => {
    render(
      <StudentTopMatchesPanel
        matches={[
          { ...base, id: 'a', roleTitle: 'Backend Engineer', applied: true },
          { ...base, id: 'b', roleTitle: 'Data Analyst' },
        ]}
      />,
    );
    expect(screen.getAllByText('Applied')).toHaveLength(1);
    const rowText = (name: string) => screen.getByText(name).closest('tr')?.textContent ?? '';
    expect(rowText('Backend Engineer')).toContain('Applied');
    expect(rowText('Data Analyst')).not.toContain('Applied');
  });
});
