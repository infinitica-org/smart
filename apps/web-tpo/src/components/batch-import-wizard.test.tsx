import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, apiClient } from '../lib/api';
import {
  BatchImportWizard,
  suggestBatchImportMapping,
  toBatchImportMapping,
  validateBatchImportFile,
} from './batch-import-wizard';

vi.mock('../lib/api', () => ({
  apiClient: { getBlob: vi.fn(), postForm: vi.fn() },
  api: { onboarding: { sendBatchInvites: vi.fn() } },
}));

const headers = ['Student Name', 'Email Address', 'Department'];
const probe = { imported: 0, skipped: 0, errors: [], headers };
const imported = {
  imported: 1,
  skipped: 1,
  errors: [{ row: 3, email: 'invalid', message: 'Invalid email address.' }],
  headers,
  validRows: 1,
  invalidRows: 1,
  existingStudents: 0,
  newAccounts: 1,
  pendingInvitations: 7,
};

function upload(name = 'candidates.csv', type = 'text/csv') {
  fireEvent.change(screen.getByLabelText('Choose candidate CSV or XLSX file'), {
    target: { files: [new File(['name,email'], name, { type })] },
  });
}

async function reachMapping() {
  render(<BatchImportWizard batchId="batch-1" />);
  upload();
  await screen.findByText('Map uploaded columns');
}

describe('BatchImportWizard', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('accepts CSV and XLSX and rejects unsupported or empty files', () => {
    expect(validateBatchImportFile(new File(['data'], 'candidates.csv'))).toBeNull();
    expect(validateBatchImportFile(new File(['data'], 'candidates.xlsx'))).toBeNull();
    expect(validateBatchImportFile(new File(['data'], 'candidates.pdf'))).toContain('Unsupported');
    expect(validateBatchImportFile(new File([], 'candidates.csv'))).toContain('empty');
    expect(
      toBatchImportMapping(suggestBatchImportMapping(['Candidate Name', 'E-mail', 'Section'])),
    ).toEqual({ fullName: 'Candidate Name', email: 'E-mail', groupLabel: 'Section' });
  });

  it('renders an accessible drop zone, loads CSV headers, and confirms mapping', async () => {
    let resolveProbe: (value: typeof probe) => void = () => undefined;
    vi.mocked(apiClient.postForm).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveProbe = resolve;
        }),
    );
    render(<BatchImportWizard batchId="batch-1" />);
    expect(screen.getByRole('button', { name: /Drop a roster here or browse/ })).toBeDefined();
    expect(screen.getByLabelText('Choose candidate CSV or XLSX file')).toBeDefined();
    expect(screen.getByText(/maximum 5 MB/)).toBeDefined();
    expect(screen.getByRole('list', { name: 'Provisioning progress' })).toBeDefined();
    upload('candidate-list.pdf', 'application/pdf');
    expect(await screen.findByText(/Unsupported file type/)).toBeDefined();
    expect(apiClient.postForm).not.toHaveBeenCalled();
    upload();
    expect(await screen.findByText('Processing securely…')).toBeDefined();
    expect(screen.getByRole('button', { name: /Drop a roster here or browse/ })).toHaveProperty(
      'disabled',
      true,
    );
    resolveProbe(probe);
    expect(await screen.findByText('Map uploaded columns')).toBeDefined();
    expect(screen.getByText('candidates.csv')).toBeDefined();
    expect(
      screen.getByText(/Detected headers: Student Name, Email Address, Department/),
    ).toBeDefined();
    const firstCall = vi.mocked(apiClient.postForm).mock.calls[0];
    expect(firstCall?.[2]?.query).toEqual({ dryRun: true });
    expect(firstCall?.[1] instanceof FormData && firstCall[1].get('mapping')).toBeNull();
    cleanup();
    vi.mocked(apiClient.postForm).mockResolvedValueOnce(probe);
    render(<BatchImportWizard batchId="batch-1" />);
    upload('candidates.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(await screen.findByText('candidates.xlsx')).toBeDefined();
  });

  it('blocks missing and duplicate required mappings', async () => {
    vi.mocked(apiClient.postForm).mockResolvedValueOnce({
      imported: 0,
      skipped: 0,
      errors: [],
      headers: ['Column A', 'Column B'],
    });
    await reachMapping();
    const confirm = screen.getByRole('button', { name: 'Confirm mapping' }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Full Name *'), { target: { value: 'Column A' } });
    fireEvent.change(screen.getByLabelText('Email *'), { target: { value: 'Column A' } });
    expect(screen.getByText(/Each SMART field must use a different/)).toBeDefined();
    expect(confirm.disabled).toBe(true);
  });

  it('announces dry-run and template download failures', async () => {
    vi.mocked(apiClient.postForm).mockRejectedValueOnce(new Error('Could not read CSV file.'));
    render(<BatchImportWizard batchId="batch-1" />);
    upload();
    expect(await screen.findByText(/Could not read CSV file/)).toBeDefined();
    expect(screen.getByRole('button', { name: /Drop a roster here or browse/ })).toBeDefined();
    cleanup();
    vi.mocked(apiClient.getBlob).mockRejectedValueOnce(new Error('network'));
    render(<BatchImportWizard batchId="batch-1" />);
    fireEvent.click(screen.getByRole('button', { name: 'Download XLSX template' }));
    expect(await screen.findByText(/template could not be downloaded/)).toBeDefined();
  });

  it('imports after mapping confirmation and renders preview, errors, and batch-wide invites', async () => {
    let resolveImport: (value: typeof imported) => void = () => undefined;
    vi.mocked(apiClient.postForm)
      .mockResolvedValueOnce(probe)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveImport = resolve;
          }),
      );
    await reachMapping();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm mapping' }));
    expect(await screen.findByText('Processing securely…')).toBeDefined();
    resolveImport(imported);
    expect(await screen.findByText('Data preview')).toBeDefined();
    const summary = screen.getByLabelText('Import summary').textContent ?? '';
    expect(summary).toContain('Valid');
    expect(summary).toContain('Invalid');
    expect(summary).toContain('Existing students');
    expect(summary).toContain('New accounts');
    expect(summary).toContain('Pending invitations');
    expect(summary).toContain('1');
    expect(summary).toContain('7');
    expect(screen.getByRole('table', { name: 'Rows requiring attention' })).toBeDefined();
    expect(screen.getByText('invalid')).toBeDefined();
    expect(screen.getByText('Invalid email address.')).toBeDefined();
    expect(screen.getByText(/already pending before this upload/)).toBeDefined();
    expect(screen.getByText(/Expected emails to queue: 7/)).toBeDefined();
    const second = vi.mocked(apiClient.postForm).mock.calls[1];
    expect(second?.[2]?.query).toBeUndefined();
    expect(second?.[1] instanceof FormData && second[1].get('mapping')).toContain('Student Name');
    const send = screen.getByRole('button', { name: 'Send 7 invitations' }) as HTMLButtonElement;
    expect(send.disabled).toBe(true);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(send.disabled).toBe(false);
    vi.mocked(api.onboarding.sendBatchInvites).mockResolvedValueOnce({ enqueued: 7 });
    fireEvent.click(send);
    expect(await screen.findByText('7 invitations queued successfully')).toBeDefined();
    expect(api.onboarding.sendBatchInvites).toHaveBeenCalledWith('batch-1');
  });

  it('handles empty results, keeps send disabled, and shows a safe import failure', async () => {
    vi.mocked(apiClient.postForm).mockResolvedValueOnce(probe).mockResolvedValueOnce({
      imported: 0,
      skipped: 0,
      errors: [],
      validRows: 0,
      invalidRows: 0,
      existingStudents: 0,
      newAccounts: 0,
      pendingInvitations: 0,
    });
    await reachMapping();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm mapping' }));
    expect(await screen.findByText('No candidates were imported from this file.')).toBeDefined();
    expect(
      (screen.getByRole('button', { name: 'Send 0 invitations' }) as HTMLButtonElement).disabled,
    ).toBe(true);
    cleanup();
    vi.mocked(apiClient.postForm)
      .mockResolvedValueOnce(probe)
      .mockRejectedValueOnce(new Error('Import is temporarily unavailable.'));
    await reachMapping();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm mapping' }));
    expect(await screen.findByText('Import is temporarily unavailable.')).toBeDefined();
    expect(screen.getByText('Map uploaded columns')).toBeDefined();
    expect(screen.queryByText('Data preview')).toBeNull();
  });

  it('shows a safe accessible error when invitation sending fails', async () => {
    vi.mocked(apiClient.postForm).mockResolvedValueOnce(probe).mockResolvedValueOnce(imported);
    vi.mocked(api.onboarding.sendBatchInvites).mockRejectedValueOnce(new Error('queue down'));
    await reachMapping();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm mapping' }));
    await screen.findByText('Data preview');
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Send 7 invitations' }));
    expect(await screen.findByRole('alert')).toBeDefined();
    expect(screen.getByText(/Invitations could not be queued/)).toBeDefined();
    expect(screen.queryByText('queue down')).toBeNull();
  });
});
