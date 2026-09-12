import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProfilePage from './page';

vi.mock('@/lib/candidate-identity', () => ({
  useCurrentUser: () => ({
    data: {
      userId: 'usr_1',
      fullName: 'Ada Lovelace',
    },
  }),
  useTracks: () => ({ data: [] }),
  headlineFor: () => 'SMART candidate',
}));

vi.mock('@/lib/use-profile-progress', () => ({
  useProfileProgress: () => ({
    loading: false,
    error: null,
    progress: {
      percent: 50,
      completedAreas: ['skills', 'languages', 'education', 'projects'],
      incompleteAreas: [],
      areaStatus: {
        skills: true,
        languages: true,
        education: true,
        experience: false,
        projects: true,
        certifications: false,
        professionalLinks: false,
        jobPreferences: false,
      },
    },
    visibleRecommendedAction: {
      id: 'add-experience',
      title: 'Add work experience',
      description: 'Share roles that shaped your professional journey.',
      ctaLabel: 'Add experience',
      href: '/profile#experience',
    },
    dismissRecommendedAction: vi.fn(),
    linkedinVerified: false,
    githubVerified: false,
  }),
}));

vi.mock('@/components/profile/EducationSection', () => ({
  EducationSection: () => <div>Education section</div>,
}));
vi.mock('@/components/profile/WorkExperienceSection', () => ({
  WorkExperienceSection: () => <div>Work experience section</div>,
}));
vi.mock('@/components/profile/LanguagesSection', () => ({
  LanguagesSection: () => <div>Languages section</div>,
}));
vi.mock('@/components/profile/CertificatesSection', () => ({
  CertificatesSection: () => <div>Certificates section</div>,
}));
vi.mock('@/components/profile/SkillsSection', () => ({
  SkillsSection: () => <div>Skills section</div>,
}));
vi.mock('@/components/profile/ProjectSubmissionForm', () => ({
  ProjectSubmissionForm: () => <div>Projects section</div>,
}));
vi.mock('@/components/profile/ProfessionalLinksSection', () => ({
  ProfessionalLinksSection: () => <div>Professional links section</div>,
}));
vi.mock('@/components/profile/JobPreferencesSection', () => ({
  JobPreferencesSection: () => <div>Job preferences section</div>,
}));

describe('ProfilePage', () => {
  it('uses shared profile progress and renders anchors plus recommended action', () => {
    const { container } = render(<ProfilePage />);

    expect(screen.getByText('Your SMART Profile')).toBeTruthy();
    expect(screen.getByText('50% complete')).toBeTruthy();
    expect(screen.getByText('Recommended next step')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Add work experience' })).toBeTruthy();

    for (const id of [
      'education',
      'experience',
      'languages',
      'certificates',
      'skills',
      'projects',
      'links',
      'preferences',
    ]) {
      expect(container.querySelector(`#${id}`)).toBeTruthy();
    }
  });
});
