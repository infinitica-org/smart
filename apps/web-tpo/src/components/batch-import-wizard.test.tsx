import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../lib/api';
import {
  BatchImportWizard,
  suggestBatchImportMapping,
  toBatchImportMapping,
  validateBatchImportFile,
} from './batch-import-wizard';

vi.mock('../lib/api', () => ({
  apiClient: { getBlob: vi.fn(), postForm: vi.fn() },
}));

const headers = ['Student Name', 'Email Address', 'Department'];
const probe = { imported: 0, skipped: 0, errors: [], headers };

function upload(name = 'candidates.csv', type = 'text/csv') {
  fireEvent.change(screen.getByLabelText('Choose candidate CSV or XLSX file'), {
    target: { files: [new File(['name,email'], name, { type })] },
  });
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
    fireEvent.click(screen.getByRole('button', { name: 'Confirm mapping' }));
    expect(
      await screen.findByText(
        'Mapping payload ready: fullName=Student Name; email=Email Address; groupLabel=Department',
      ),
    ).toBeDefined();
    expect(apiClient.postForm).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Data preview')).toBeNull();
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
    render(<BatchImportWizard batchId="batch-1" />);
    upload();
    await screen.findByText('Map uploaded columns');
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
});
