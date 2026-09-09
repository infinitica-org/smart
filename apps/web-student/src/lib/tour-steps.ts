export interface TourStep {
  id: string;
  /** Matches a `data-tour="<target>"` attribute somewhere on the page. */
  target: string;
  title: string;
  description: string;
  placement: 'top' | 'bottom';
}

export const DASHBOARD_TOUR_STEPS: TourStep[] = [
  {
    id: 'nav',
    target: 'nav-links',
    title: 'Get around',
    description: 'Home is your dashboard. Skills is where you declare and verify what you know.',
    placement: 'bottom',
  },
  {
    id: 'profile-menu',
    target: 'profile-menu',
    title: 'Your account',
    description:
      'Your public profile link, visibility settings, and username live here — click your avatar anytime.',
    placement: 'bottom',
  },
  {
    id: 'candidate-card',
    target: 'candidate-card',
    title: 'This is you',
    description:
      'Your name and track headline, exactly as an employer sees it on your public link.',
    placement: 'bottom',
  },
  {
    id: 'skills',
    target: 'skills-panel',
    title: 'Your skills',
    description:
      'Everything you’ve declared shows up here, with a badge once it’s actually verified.',
    placement: 'top',
  },
  {
    id: 'manage-skills',
    target: 'manage-skills-link',
    title: 'Add or verify more',
    description: 'Declare a new skill or start a verification anytime from here.',
    placement: 'top',
  },
];
