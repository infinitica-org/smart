import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EducationProofUploadModal } from './EducationProofUploadModal';

describe('EducationProofUploadModal', () => {
  it('renders drop zone and submits selected file', () => {
    const onSubmit = vi.fn();
    render(
      <EducationProofUploadModal open uploading={false} onClose={vi.fn()} onSubmit={onSubmit} />,
    );

    expect(screen.getByText(/Drop file here or browse/i)).toBeTruthy();

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['pdf'], 'degree.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(screen.getByText('degree.pdf')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Attach proof/i }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        documentType: 'DEGREE_CERTIFICATE',
        file,
      }),
    );
  });
});
