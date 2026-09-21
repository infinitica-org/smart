import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CredentialsSection } from './CredentialsSection';

const listCredentials = vi.fn();
const createCredential = vi.fn();
const uploadCredentialDocument = vi.fn();

vi.mock('@smart/api-client', () => ({
  isSmartApiError: () => false,
}));

vi.mock('@/lib/api', () => ({
  api: {
    evidence: {
      listCredentials: () => listCredentials(),
      createCredential: (...args: unknown[]) => createCredential(...args),
      uploadCredentialDocument: (...args: unknown[]) => uploadCredentialDocument(...args),
    },
  },
}));

describe('CredentialsSection', () => {
  beforeEach(() => {
    listCredentials.mockReset();
    createCredential.mockReset();
    uploadCredentialDocument.mockReset();
    listCredentials.mockResolvedValue([]);
    // jsdom has no real blob storage; stub just enough for the preview thumbnail.
    URL.createObjectURL = vi.fn(() => 'blob:mock-preview-url');
    URL.revokeObjectURL = vi.fn();
  });

  it('shows a pending-verification note explaining that verification runs on the backend', async () => {
    listCredentials.mockResolvedValue([
      {
        credentialId: 'cred-1',
        issuer: 'Amazon Web Services',
        credentialName: 'AWS Certified Solutions Architect',
        credentialType: 'CERTIFICATION',
        status: 'PENDING_VERIFICATION',
      },
    ]);

    render(<CredentialsSection />);
    expect(await screen.findByText(/all verification runs on our backend/i)).toBeDefined();
  });

  it('shows an empty state when there are no credentials', async () => {
    render(<CredentialsSection />);
    expect(await screen.findByText('No credentials yet')).toBeDefined();
  });

  it('creates a credential and always shows it as pending, never trusting a pre-set status', async () => {
    createCredential.mockResolvedValue({
      credentialId: 'cred-1',
      issuer: 'Amazon Web Services',
      credentialName: 'AWS Certified Solutions Architect',
      credentialType: 'CERTIFICATION',
      status: 'PENDING_VERIFICATION',
    });
    listCredentials.mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        credentialId: 'cred-1',
        issuer: 'Amazon Web Services',
        credentialName: 'AWS Certified Solutions Architect',
        credentialType: 'CERTIFICATION',
        status: 'PENDING_VERIFICATION',
      },
    ]);

    render(<CredentialsSection />);
    await screen.findByText('No credentials yet');

    fireEvent.click(screen.getByRole('button', { name: /Add your first credential/i }));
    fireEvent.change(screen.getByPlaceholderText('e.g. Amazon Web Services'), {
      target: { value: 'Amazon Web Services' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. AWS Certified Solutions Architect'), {
      target: { value: 'AWS Certified Solutions Architect' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add credential' }));

    await waitFor(() => {
      expect(createCredential).toHaveBeenCalledWith(
        expect.objectContaining({
          issuer: 'Amazon Web Services',
          credentialName: 'AWS Certified Solutions Architect',
        }),
      );
      expect(screen.getByText('Pending verification')).toBeDefined();
    });
  });

  it('uploads a supporting document for a pending credential', async () => {
    listCredentials.mockResolvedValue([
      {
        credentialId: 'cred-1',
        issuer: 'Amazon Web Services',
        credentialName: 'AWS Certified Solutions Architect',
        credentialType: 'CERTIFICATION',
        status: 'PENDING_VERIFICATION',
      },
    ]);
    uploadCredentialDocument.mockResolvedValue({});

    render(<CredentialsSection />);
    await screen.findByText('AWS Certified Solutions Architect');

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['fake-cert-bytes'], 'license.pdf', { type: 'application/pdf' });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(uploadCredentialDocument).toHaveBeenCalledWith('cred-1', file, 'license.pdf');
      expect(screen.getByText('license.pdf')).toBeDefined();
    });
  });

  it('derives a readable file name from a previously uploaded document object key', async () => {
    listCredentials.mockResolvedValue([
      {
        credentialId: 'cred-1',
        issuer: 'Amazon Web Services',
        credentialName: 'AWS Certified Solutions Architect',
        credentialType: 'CERTIFICATION',
        status: 'PENDING_VERIFICATION',
        documentObjectKey:
          'credential-documents/student-1/3a60db1a-71bd-4673-b161-f98f38fe5886-attorney-license.pdf',
      },
    ]);

    render(<CredentialsSection />);
    expect(await screen.findByText('attorney-license.pdf')).toBeDefined();
  });
});
