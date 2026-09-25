import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SmartApiError } from '@smart/api-client';
import type { CompanyProfile } from '@smart/contracts';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CompanyProfilePage from './page';

const employer = vi.hoisted(() => ({
  getCompany: vi.fn(),
  updateCompany: vi.fn(),
  uploadLogo: vi.fn(),
  searchLocations: vi.fn().mockResolvedValue({ locations: [] }),
}));
vi.mock('@/lib/api', () => ({ api: { employer } }));

const profile = (over: Partial<CompanyProfile> = {}): CompanyProfile => ({
  companyId: '11111111-1111-4111-8111-111111111111',
  slug: 'acme-11111111',
  displayName: 'Acme Robotics',
  logoUrl: null,
  website: null,
  about: null,
  benefits: [],
  socialLinks: {},
  industry: 'Automotive',
  employeeCount: 'E_51_200',
  headquarters: 'Pune, India',
  additionalLocations: [],
  version: 3,
  isVerified: true,
  verifiedAt: '2026-09-01T10:00:00.000Z',
  ...over,
});

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <CompanyProfilePage />
    </QueryClientProvider>,
  );
}

describe('Company profile page (Th6-349/350/354)', () => {
  beforeEach(() => {
    Object.values(employer).forEach((fn) => fn.mockReset());
    employer.searchLocations.mockResolvedValue({ locations: [] });
  });
  afterEach(cleanup);

  it('shows loading, then an error state that can retry', async () => {
    employer.getCompany.mockRejectedValueOnce(new Error('down'));
    renderPage();
    expect(screen.getByText('Loading your company profile…')).toBeTruthy();
    expect(await screen.findByText('Could not load the company profile')).toBeTruthy();
    employer.getCompany.mockResolvedValue(profile());
    fireEvent.click(screen.getByRole('button', { name: /retry|try again/i }));
    expect(await screen.findByLabelText('Company name')).toBeTruthy();
  });

  it('updates the live preview as the owner types', async () => {
    employer.getCompany.mockResolvedValue(profile());
    renderPage();
    const name = (await screen.findByLabelText('Company name')) as HTMLInputElement;
    fireEvent.change(name, { target: { value: 'Acme Labs' } });
    const preview = screen.getByLabelText('Live preview');
    expect(preview.textContent).toContain('Acme Labs');
    expect(preview.textContent).toContain('Automotive · 51–200 employees · Pune, India');
  });

  it('drafts About from name, industry, size and location, then lets the owner edit it', async () => {
    employer.getCompany.mockResolvedValue(profile());
    renderPage();
    await screen.findByLabelText('Company name');
    fireEvent.click(screen.getByRole('button', { name: 'Draft from my details' }));
    const about = screen.getByLabelText('About the company') as HTMLTextAreaElement;
    expect(about.value).toContain('Acme Robotics');
    expect(about.value).toContain('Automotive');
    expect(about.value).toContain('Pune, India');
    fireEvent.change(about, { target: { value: 'Edited by hand.' } });
    expect(about.value).toBe('Edited by hand.');
  });

  it('offers only the fixed size and industry lists', async () => {
    employer.getCompany.mockResolvedValue(profile());
    renderPage();
    const size = (await screen.findByLabelText('Employees')) as HTMLSelectElement;
    expect([...size.options].map((o) => o.text)).toEqual([
      'Select a size',
      '1–10',
      '11–50',
      '51–200',
      '201–500',
      '501–1000',
      '1000+',
    ]);
  });

  it('blocks a description over 2000 characters before calling the API', async () => {
    employer.getCompany.mockResolvedValue(profile());
    renderPage();
    fireEvent.change(await screen.findByLabelText('About the company'), {
      target: { value: 'a'.repeat(2001) },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));
    expect((await screen.findAllByText(/2000|too big|at most/i)).length).toBeGreaterThan(0);
    expect(employer.updateCompany).not.toHaveBeenCalled();
  });

  it('saves with the loaded version and an Idempotency-Key, and shows server 422 field errors', async () => {
    employer.getCompany.mockResolvedValue(profile());
    employer.updateCompany.mockRejectedValueOnce(
      new SmartApiError({
        error: 'validation_failed',
        message: 'Request failed validation.',
        statusCode: 422,
        details: [{ path: 'website', message: 'Enter a valid URL.' }],
      } as never),
    );
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Save profile' }));
    expect((await screen.findAllByText('Enter a valid URL.')).length).toBeGreaterThan(0);
    const call = employer.updateCompany.mock.calls[0]?.[0];
    expect(call.version).toBe(3);
    expect(typeof call.idempotencyKey).toBe('string');

    // Retrying the identical payload reuses the same key, so the server cannot duplicate the write.
    employer.updateCompany.mockResolvedValue(profile({ version: 4 }));
    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));
    await waitFor(() => expect(employer.updateCompany).toHaveBeenCalledTimes(2));
    expect(employer.updateCompany.mock.calls[1]?.[0].idempotencyKey).toBe(call.idempotencyKey);
    expect(await screen.findByText('Company profile saved.')).toBeTruthy();
  });

  it('offers to reload after a stale-version conflict', async () => {
    employer.getCompany.mockResolvedValue(profile());
    employer.updateCompany.mockRejectedValue(
      new SmartApiError({
        error: 'version_conflict',
        message: 'stale',
        statusCode: 409,
      } as never),
    );
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Save profile' }));
    expect(await screen.findByRole('button', { name: 'Reload latest' })).toBeTruthy();
  });

  it('hides the verified badge and the public link for an unverified company', async () => {
    employer.getCompany.mockResolvedValue(profile({ isVerified: false, verifiedAt: null }));
    renderPage();
    await screen.findByLabelText('Company name');
    expect(screen.queryByTestId('verified-badge')).toBeNull();
    expect(screen.queryByRole('link', { name: 'View public page' })).toBeNull();
    expect(screen.getByText('Your public page is not live yet')).toBeTruthy();
  });

  it('shows the verified badge for a verified company', async () => {
    employer.getCompany.mockResolvedValue(profile());
    renderPage();
    await screen.findByLabelText('Company name');
    expect(screen.getByTestId('verified-badge')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'View public page' })).toBeTruthy();
  });
});
