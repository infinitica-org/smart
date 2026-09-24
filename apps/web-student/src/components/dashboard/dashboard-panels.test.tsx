import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DashboardListPanel } from './DashboardListPanel';
import { StudentNextActionCard } from './StudentNextActionCard';

describe('DashboardListPanel', () => {
  it('shows an explicit empty state instead of placeholder rows', () => {
    render(
      <DashboardListPanel
        testId="panel"
        title="Active applications"
        items={[]}
        emptyTitle="No active applications"
        emptyBody="Applications in progress will appear here."
      />,
    );

    expect(screen.getByText('No active applications')).toBeTruthy();
    expect(screen.getByText('Applications in progress will appear here.')).toBeTruthy();
  });

  it('renders rows with badges and links, and notes when the list is capped', () => {
    render(
      <DashboardListPanel
        testId="panel"
        title="Needs your attention"
        viewAllHref="/profile"
        viewAllLabel="Open profile"
        total={9}
        items={[
          {
            id: 'a',
            title: 'MIT',
            subtitle: 'Attach proof.',
            href: '/profile?section=education',
            badge: { label: 'Needs action', tone: 'warning' },
          },
        ]}
        emptyTitle="Nothing needs your attention"
        emptyBody="All good."
      />,
    );

    expect(screen.getByText('MIT')).toBeTruthy();
    expect(screen.getByText('Needs action')).toBeTruthy();
    expect(screen.getByRole('link', { name: /MIT/ }).getAttribute('href')).toBe(
      '/profile?section=education',
    );
    expect(screen.getByRole('link', { name: /Open profile/ }).getAttribute('href')).toBe(
      '/profile',
    );
    expect(screen.getByText('Showing 1 of 9')).toBeTruthy();
    expect(screen.queryByText('Nothing needs your attention')).toBeNull();
  });

  it('does not claim the list is capped when everything is shown', () => {
    render(
      <DashboardListPanel
        testId="panel"
        title="Opportunities"
        total={1}
        items={[{ id: 'a', title: 'Data Analyst' }]}
        emptyTitle="None"
        emptyBody="None."
      />,
    );

    expect(screen.queryByText(/Showing/)).toBeNull();
  });
});

describe('StudentNextActionCard', () => {
  it('links straight to the recommended action', () => {
    render(
      <StudentNextActionCard
        action={{
          title: 'Add a project',
          description: 'Projects are strong evidence.',
          ctaLabel: 'Add project',
          href: '/profile?section=projects',
        }}
      />,
    );

    expect(screen.getByText('Add a project')).toBeTruthy();
    expect(screen.getByRole('link', { name: /Add project/ }).getAttribute('href')).toBe(
      '/profile?section=projects',
    );
  });

  it('says the profile is complete when there is no action', () => {
    render(<StudentNextActionCard action={null} />);

    expect(screen.getByText('Your profile is complete')).toBeTruthy();
    expect(screen.queryByRole('link')).toBeNull();
  });
});
