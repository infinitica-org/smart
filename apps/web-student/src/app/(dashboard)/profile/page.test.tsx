import { describe, expect, it, vi } from 'vitest';

import { render, screen } from '@testing-library/react';

import ProfilePage from './page';

vi.mock('@/lib/candidate-identity', () => ({
  useCurrentUser: () => ({
    data: {
      userId: 'usr_1',

      fullName: 'Ada Lovelace',

      profilePhotoUrl: null,
    },
  }),

  useTracks: () => ({ data: [] }),

  headlineFor: () => 'SMART candidate',

  initialsOf: (fullName?: string) => {
    const parts = fullName?.trim().split(/\s+/u).filter(Boolean) ?? [];

    return `${parts[0]?.[0] ?? ''}${parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''}`.toUpperCase();
  },
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

vi.mock('@/components/profile/AboutSection', () => ({
  AboutSection: () => <div>About section</div>,
}));

vi.mock('@/components/profile/SkillsSection', () => ({
  SkillsSection: () => <div>Skills section</div>,
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

vi.mock('@/components/profile/ProjectSubmissionForm', () => ({
  ProjectSubmissionForm: () => <div>Projects section</div>,
}));

vi.mock('@/components/profile/ProfessionalLinksSection', () => ({
  ProfessionalLinksSection: () => <div>Professional links section</div>,
}));

vi.mock('@/components/profile/JobPreferencesSection', () => ({
  JobPreferencesSection: () => <div>Job preferences section</div>,
}));

vi.mock('@/components/profile/ResumeSection', () => ({
  ResumeSection: () => <div>Resume section</div>,
}));

describe('ProfilePage', () => {
  it('renders profile header, progress, sections, and anchors in Phase 5 order', () => {
    const { container } = render(<ProfilePage />);

    expect(screen.getByText('Build your SMART profile')).toBeTruthy();

    expect(screen.getByText('Ada Lovelace')).toBeTruthy();

    expect(screen.getByText('50% profile complete')).toBeTruthy();

    expect(screen.getByText('Your SMART Profile')).toBeTruthy();

    expect(screen.getByText('About section')).toBeTruthy();

    expect(screen.getByText('Resume section')).toBeTruthy();

    expect(screen.getByText('Skills section')).toBeTruthy();

    for (const id of [
      'about',

      'skills',

      'education',

      'experience',

      'languages',

      'certificates',

      'links',

      'projects',

      'preferences',

      'resume',
    ]) {
      expect(container.querySelector(`#${id}`)).toBeTruthy();
    }
  });
});
