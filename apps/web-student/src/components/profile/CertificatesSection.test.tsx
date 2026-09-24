import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { CertificatesSection } from '@/components/profile/CertificatesSection';

vi.mock('@smart/ui', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useQuery: vi.fn(),
  };
});

const { useQuery } = await import('@smart/ui');

describe('CertificatesSection', () => {
  it('renders premium empty state when no certificates', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: { certificates: [] },
      isLoading: false,
      error: null,
    } as never);

    render(<CertificatesSection />);

    expect(screen.getByRole('heading', { name: 'Certifications' })).toBeTruthy();
    expect(screen.getByText(/No certifications yet/i)).toBeTruthy();
    expect(screen.getAllByRole('link', { name: /Add certificate/i }).length).toBeGreaterThan(0);
  });

  it('renders bento cards when certificates exist', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: {
        certificates: [
          {
            certificateId: '00000000-0000-4000-8000-000000000001',
            candidateId: '00000000-0000-4000-8000-000000000002',
            title: 'Google Data Analytics',
            issuer: 'Google',
            status: 'VERIFIED',
            sourceStatus: 'source_verified',
            certificateNumber: 'G-123',
            issueDate: '2025-01-15',
            expiryDate: null,
            verificationUrl: null,
            verificationMethod: 'ENDORSEMENT',
            certificateFileUrl: null,
            certificateFileName: 'cert.pdf',
            fileMimeType: 'application/pdf',
            fileSizeBytes: 1024,
            learningDescription: null,
            tools: [],
            practicalApplied: null,
            practicalDescription: null,
            skills: [
              { skillCode: 'SKILL_1', skillName: 'SQL', selfAssessedProficiency: 'INTERMEDIATE' },
            ],
            skillsClaimedSnapshot: null,
            trackCode: null,
            agendaLines: [],
            retryAvailableAt: null,
            lockedUntil: null,
            taxonomyVersionSnapshot: null,
            createdAt: '2025-01-01T00:00:00.000Z',
            updatedAt: '2025-01-01T00:00:00.000Z',
          },
        ],
      },
      isLoading: false,
      error: null,
    } as never);

    render(<CertificatesSection />);

    expect(screen.getByText('Google Data Analytics')).toBeTruthy();
    expect(screen.getByText('Verified')).toBeTruthy();
    expect(screen.getByText('SQL')).toBeTruthy();
    const manageLink = screen.getByRole('link', { name: 'View details' });
    expect(manageLink.getAttribute('href')).toBe(
      '/certificates/add?id=00000000-0000-4000-8000-000000000001',
    );
  });

  it('shows a loading message and no empty state while certificates load', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as never);

    render(<CertificatesSection />);

    expect(screen.getByText(/Loading certifications/i)).toBeTruthy();
    expect(screen.queryByText(/No certifications yet/i)).toBeNull();
  });

  it('shows a specific error when certificates cannot be loaded', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Certificates service unavailable'),
    } as never);

    render(<CertificatesSection />);

    expect(screen.getByText('Certificates service unavailable')).toBeTruthy();
  });

  it('falls back to a generic error message when the failure has no message', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error(''),
    } as never);

    render(<CertificatesSection />);

    expect(screen.getByText('Failed to load candidate certificates.')).toBeTruthy();
  });

  it('links every add action to the add-certificate flow', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: { certificates: [] },
      isLoading: false,
      error: null,
    } as never);

    render(<CertificatesSection />);

    const links = screen.getAllByRole('link', { name: /Add (your first )?certificate/i });
    expect(links.length).toBeGreaterThanOrEqual(2);
    for (const link of links) expect(link.getAttribute('href')).toBe('/certificates/add');
  });
});
