import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ConnectUniversityStep from './ConnectUniversityStep';
import { api } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  api: {
    onboarding: {
      getInstitutionPartnershipStatus: vi.fn(),
      listPartnerUniversities: vi.fn(),
      connectPartnerUniversity: vi.fn(),
      requestUniversityContact: vi.fn(),
    },
  },
}));

describe('ConnectUniversityStep — Partnership Status (STU-01)', () => {
  const mockUniversities = [
    { institutionId: 'inst-1', name: 'PSG College of Technology', domain: 'psgtech.ac.in' },
    { institutionId: 'inst-2', name: 'Anna University', domain: 'annauniv.edu' },
  ];

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('displays warning when student institution is not currently partnered', async () => {
    vi.mocked(api.onboarding.getInstitutionPartnershipStatus).mockResolvedValue({
      institutionId: 'unpartnered-id',
      institutionName: 'Example Unpartnered College',
      isPartnered: false,
    });
    vi.mocked(api.onboarding.listPartnerUniversities).mockResolvedValue(mockUniversities);

    render(<ConnectUniversityStep onContinue={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId('unpartnered-warning')).toBeTruthy();
      expect(screen.getByText(/Institution Not Yet Partnered/i)).toBeTruthy();
      expect(screen.getByText('Example Unpartnered College')).toBeTruthy();
      expect(screen.getByText(/is not currently partnered with SMART/i)).toBeTruthy();
    });
  });

  it('displays partnered badge when student institution is already an approved partner', async () => {
    vi.mocked(api.onboarding.getInstitutionPartnershipStatus).mockResolvedValue({
      institutionId: 'inst-1',
      institutionName: 'PSG College of Technology',
      isPartnered: true,
    });
    vi.mocked(api.onboarding.listPartnerUniversities).mockResolvedValue(mockUniversities);

    render(<ConnectUniversityStep onContinue={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId('partnered-status')).toBeTruthy();
      expect(screen.getByText(/Connected Partner Account/i)).toBeTruthy();
      expect(screen.getByText(/Partner Verified/i)).toBeTruthy();
    });
  });

  it('renders directly with search when student has no connected institution', async () => {
    vi.mocked(api.onboarding.getInstitutionPartnershipStatus).mockResolvedValue({
      institutionId: null,
      institutionName: null,
      isPartnered: false,
    });
    vi.mocked(api.onboarding.listPartnerUniversities).mockResolvedValue(mockUniversities);

    render(<ConnectUniversityStep onContinue={vi.fn()} />);

    await waitFor(() => {
      expect(screen.queryByTestId('unpartnered-warning')).toBeNull();
      expect(screen.queryByTestId('partnered-status')).toBeNull();
      expect(screen.getByText('PSG College of Technology')).toBeTruthy();
    });
  });

  it('shows status check error and allows retry', async () => {
    vi.mocked(api.onboarding.getInstitutionPartnershipStatus)
      .mockRejectedValueOnce(new Error('Network failure'))
      .mockResolvedValueOnce({
        institutionId: 'inst-1',
        institutionName: 'PSG College of Technology',
        isPartnered: true,
      });
    vi.mocked(api.onboarding.listPartnerUniversities).mockResolvedValue(mockUniversities);

    render(<ConnectUniversityStep onContinue={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Could not verify institution partnership status.')).toBeTruthy();
      expect(screen.getByTestId('retry-status-btn')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('retry-status-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('partnered-status')).toBeTruthy();
    });
  });

  it('connects to partner university from unpartnered state and flips to partnered', async () => {
    vi.mocked(api.onboarding.getInstitutionPartnershipStatus).mockResolvedValue({
      institutionId: 'unpartnered-id',
      institutionName: 'Example Unpartnered College',
      isPartnered: false,
    });
    vi.mocked(api.onboarding.listPartnerUniversities).mockResolvedValue(mockUniversities);
    vi.mocked(api.onboarding.connectPartnerUniversity).mockResolvedValue({
      userId: 'user-1',
      email: 'student@psgtech.ac.in',
      fullName: 'Student User',
      role: 'STUDENT',
      institutionId: 'inst-1',
      institutionName: 'PSG College of Technology',
      primaryTrack: null,
      secondaryTrack: null,
      provider: 'PASSWORD',
      emailVerified: true,
      createdAt: new Date().toISOString(),
      sessionHold: null,
      onboardingCompleted: false,
    } as never);

    const onConnected = vi.fn();
    render(<ConnectUniversityStep onContinue={vi.fn()} onConnected={onConnected} />);

    await waitFor(() => {
      expect(screen.getByTestId('unpartnered-warning')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('university-option-inst-1'));
    fireEvent.click(screen.getByTestId('connect-university-submit'));

    await waitFor(() => {
      expect(api.onboarding.connectPartnerUniversity).toHaveBeenCalledWith({
        institutionId: 'inst-1',
      });
      expect(onConnected).toHaveBeenCalledWith('inst-1');
      expect(screen.getByTestId('partnered-status')).toBeTruthy();
      expect(screen.queryByTestId('unpartnered-warning')).toBeNull();
    });
  });
});

describe('ConnectUniversityStep — Request SMART Contact My University (STU-01)', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  async function renderWithZeroResults(query: string) {
    vi.mocked(api.onboarding.getInstitutionPartnershipStatus).mockResolvedValue({
      institutionId: null,
      institutionName: null,
      isPartnered: false,
    });
    vi.mocked(api.onboarding.listPartnerUniversities).mockResolvedValue([]);

    render(<ConnectUniversityStep onContinue={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId('universities-empty')).toBeTruthy();
    });

    if (query) {
      fireEvent.change(screen.getByTestId('university-search-input'), {
        target: { value: query },
      });
      await waitFor(() => {
        expect(api.onboarding.listPartnerUniversities).toHaveBeenCalledWith({ q: query });
      });
    }
  }

  it('does not show the contact-request CTA when the search query is empty', async () => {
    await renderWithZeroResults('');
    expect(screen.queryByTestId('request-university-contact-btn')).toBeNull();
  });

  it('shows the CTA on a zero-result non-empty search and opens the confirm step with the typed name', async () => {
    await renderWithZeroResults('Unknown University');

    const cta = screen.getByTestId('request-university-contact-btn');
    expect(cta.textContent).toContain('Unknown University');

    fireEvent.click(cta);

    expect(screen.getByTestId('confirm-university-contact-btn')).toBeTruthy();
    expect(screen.getByText(/Unknown University/)).toBeTruthy();
  });

  it('submits the request and shows a success state', async () => {
    await renderWithZeroResults('Unknown University');
    vi.mocked(api.onboarding.requestUniversityContact).mockResolvedValue({
      id: 'req-1',
      universityName: 'Unknown University',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    });

    fireEvent.click(screen.getByTestId('request-university-contact-btn'));
    fireEvent.click(screen.getByTestId('confirm-university-contact-btn'));

    await waitFor(() => {
      expect(api.onboarding.requestUniversityContact).toHaveBeenCalledWith({
        universityName: 'Unknown University',
      });
      expect(screen.getByTestId('university-contact-requested')).toBeTruthy();
      expect(screen.queryByTestId('confirm-university-contact-btn')).toBeNull();
    });
  });

  it('shows an error and stays retryable when the request fails', async () => {
    await renderWithZeroResults('Unknown University');
    vi.mocked(api.onboarding.requestUniversityContact).mockRejectedValue(
      new Error('Network failure'),
    );

    fireEvent.click(screen.getByTestId('request-university-contact-btn'));
    fireEvent.click(screen.getByTestId('confirm-university-contact-btn'));

    await waitFor(() => {
      expect(screen.getByText('Could not send the request. Please try again.')).toBeTruthy();
      expect(screen.getByTestId('confirm-university-contact-btn')).toBeTruthy();
    });
  });

  it('calls the API at most once when the confirm button is clicked rapidly', async () => {
    await renderWithZeroResults('Unknown University');
    let resolveRequest: (value: {
      id: string;
      universityName: string;
      status: 'PENDING';
      createdAt: string;
    }) => void = () => {};
    vi.mocked(api.onboarding.requestUniversityContact).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        }),
    );

    fireEvent.click(screen.getByTestId('request-university-contact-btn'));
    const confirmBtn = screen.getByTestId('confirm-university-contact-btn');
    fireEvent.click(confirmBtn);
    fireEvent.click(confirmBtn);
    fireEvent.click(confirmBtn);

    expect(api.onboarding.requestUniversityContact).toHaveBeenCalledTimes(1);

    resolveRequest({
      id: 'req-1',
      universityName: 'Unknown University',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    });

    await waitFor(() => {
      expect(screen.getByTestId('university-contact-requested')).toBeTruthy();
    });
  });

  it('clears the success state when the search query changes', async () => {
    await renderWithZeroResults('Unknown University');
    vi.mocked(api.onboarding.requestUniversityContact).mockResolvedValue({
      id: 'req-1',
      universityName: 'Unknown University',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    });

    fireEvent.click(screen.getByTestId('request-university-contact-btn'));
    fireEvent.click(screen.getByTestId('confirm-university-contact-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('university-contact-requested')).toBeTruthy();
    });

    fireEvent.change(screen.getByTestId('university-search-input'), {
      target: { value: 'Another University' },
    });

    await waitFor(() => {
      expect(screen.queryByTestId('university-contact-requested')).toBeNull();
    });
  });
});
