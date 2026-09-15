import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import { NextActionCard } from './next-action-card';
import {
  RECOMMENDED_ACTION_DISMISSAL_MS,
  dismissRecommendedAction,
  isRecommendedActionDismissed,
} from '@/lib/profile-progress';

const addSkillsAction = {
  id: 'add-skills',
  title: 'Add your skills',
  description: 'Tell SMART what you already know.',
  ctaLabel: 'Add skills',
  href: '/profile#skills',
};

const verifySkillAction = {
  id: 'verify-skill-clm_1',
  title: 'Verify React',
  description: 'Show employers what you can do with evidence-backed verification.',
  ctaLabel: 'Verify React',
  href: '/assessments/skills/clm_1',
};

describe('NextActionCard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-12T00:00:00.000Z'));
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders an add skills action', () => {
    render(<NextActionCard action={addSkillsAction} onLater={vi.fn()} />);
    expect(screen.getByText('Recommended Next Step')).toBeTruthy();
    expect(screen.getByText('Add your skills')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Add skills' }).getAttribute('href')).toBe(
      '/profile#skills',
    );
  });

  it('renders a verify skill action', () => {
    render(<NextActionCard action={verifySkillAction} onLater={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Verify React' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Verify React' }).getAttribute('href')).toBe(
      '/assessments/skills/clm_1',
    );
  });

  it('calls onLater when Later is clicked', () => {
    const onLater = vi.fn();
    render(<NextActionCard action={addSkillsAction} onLater={onLater} />);
    fireEvent.click(screen.getByRole('button', { name: /Remind me later/i }));
    expect(onLater).toHaveBeenCalledTimes(1);
  });

  it('supports 7-day dismissal behavior via profile-progress helpers', () => {
    dismissRecommendedAction('add-skills');
    expect(isRecommendedActionDismissed('add-skills')).toBe(true);
    vi.setSystemTime(new Date(Date.now() + RECOMMENDED_ACTION_DISMISSAL_MS + 1));
    expect(isRecommendedActionDismissed('add-skills')).toBe(false);
  });

  it('renders the public profile action when everything is complete', () => {
    render(
      <NextActionCard
        action={{
          id: 'explore-public-profile',
          title: 'Explore your public profile',
          description: 'See how employers will view your SMART profile.',
          ctaLabel: 'View public profile',
          href: '/public-profile',
        }}
        onLater={vi.fn()}
      />,
    );
    expect(screen.getByRole('link', { name: 'View public profile' }).getAttribute('href')).toBe(
      '/public-profile',
    );
  });

  it('does not render old track-level behavior', () => {
    render(<NextActionCard action={addSkillsAction} onLater={vi.fn()} />);
    expect(screen.queryByText('Complete enrollment')).toBeNull();
    expect(screen.queryByText(/Start Level/i)).toBeNull();
    expect(screen.queryByText('View Certificates')).toBeNull();
  });
});
