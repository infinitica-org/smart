import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppShell } from '../app-shell';
import { Breadcrumbs } from '../breadcrumbs';
import { UserMenu } from '../user-menu';
import {
  AsyncStateContainer,
  EmptyState,
  ErrorState,
  LoadingState,
  SuccessState,
  UnauthorizedState,
} from '../common-states';

describe('AppShell & Responsive Shell Components', () => {
  it('renders role-based navigation for INSTITUTION_ADMIN by default or props', () => {
    render(
      <AppShell role="INSTITUTION_ADMIN" title="Career Center">
        <div>Dashboard Content</div>
      </AppShell>,
    );

    expect(screen.getByText('Career Center')).toBeDefined();
    expect(screen.getByText('Dashboard Content')).toBeDefined();
    expect(screen.getByText('Students')).toBeDefined();
    expect(screen.getByText('Reports')).toBeDefined();
  });

  it('renders role-based navigation for SUPER_ADMIN', () => {
    render(
      <AppShell role="SUPER_ADMIN" title="Admin Console">
        <div>Admin Content</div>
      </AppShell>,
    );

    expect(screen.getByText('Admin Console')).toBeDefined();
    expect(screen.getByText('Institutions')).toBeDefined();
    expect(screen.getByText('Platform Admins')).toBeDefined();
  });

  it('renders role-based navigation for STUDENT', () => {
    render(
      <AppShell role="STUDENT" title="Student Dashboard">
        <div>Student Content</div>
      </AppShell>,
    );

    expect(screen.getByText('Student Dashboard')).toBeDefined();
    expect(screen.getByText('Profile')).toBeDefined();
    expect(screen.getByText('Certificates')).toBeDefined();
  });

  it('renders Breadcrumbs correctly', () => {
    render(<Breadcrumbs items={[{ label: 'Reports', href: '/reports' }, { label: 'Export' }]} />);

    expect(screen.getByText('Reports')).toBeDefined();
    expect(screen.getByText('Export')).toBeDefined();
  });

  it('renders UserMenu with name and role badge', () => {
    render(
      <UserMenu
        user={{
          name: 'Tino Britty',
          email: 'tino@smart.edu',
          role: 'INSTITUTION_ADMIN',
          organizationName: 'Oxford University',
        }}
      />,
    );

    expect(screen.getByText('Tino Britty')).toBeDefined();
  });

  it('renders common UI states correctly', () => {
    render(
      <div>
        <LoadingState message="Fetching data..." />
        <EmptyState title="No Records" description="Nothing found here." />
        <ErrorState message="Connection failed" />
        <SuccessState title="Submitted" description="Form saved successfully." />
        <UnauthorizedState title="Access Restricted" />
      </div>,
    );

    expect(screen.getByText('Fetching data...')).toBeDefined();
    expect(screen.getByText('No Records')).toBeDefined();
    expect(screen.getByText('Connection failed')).toBeDefined();
    expect(screen.getByText('Submitted')).toBeDefined();
    expect(screen.getByText('Access Restricted')).toBeDefined();
  });

  it('renders AsyncStateContainer loading, error, empty, and children states', () => {
    const { rerender } = render(
      <AsyncStateContainer loading loadingMessage="Loading records...">
        <div>Data Loaded</div>
      </AsyncStateContainer>,
    );
    expect(screen.getByText('Loading records...')).toBeDefined();

    rerender(
      <AsyncStateContainer error="API Timeout" onRetry={() => {}}>
        <div>Data Loaded</div>
      </AsyncStateContainer>,
    );
    expect(screen.getByText('API Timeout')).toBeDefined();

    rerender(
      <AsyncStateContainer
        isEmpty
        emptyTitle="Empty Cohort"
        emptyDescription="No students enrolled."
      >
        <div>Data Loaded</div>
      </AsyncStateContainer>,
    );
    expect(screen.getByText('Empty Cohort')).toBeDefined();

    rerender(
      <AsyncStateContainer>
        <div>Data Loaded</div>
      </AsyncStateContainer>,
    );
    expect(screen.getByText('Data Loaded')).toBeDefined();
  });
});
