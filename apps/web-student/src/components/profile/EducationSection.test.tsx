import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EducationSection } from './EducationSection';

const listEducation = vi.fn();
const createEducation = vi.fn();
const updateEducation = vi.fn();
const deleteEducation = vi.fn();
const attachEducationDocument = vi.fn();
const removeEducationDocument = vi.fn();

vi.mock('@/lib/api', () => ({
  api: {
    users: {
      listEducation: (...args: unknown[]) => listEducation(...args),
      createEducation: (...args: unknown[]) => createEducation(...args),
      updateEducation: (...args: unknown[]) => updateEducation(...args),
      deleteEducation: (...args: unknown[]) => deleteEducation(...args),
      attachEducationDocument: (...args: unknown[]) => attachEducationDocument(...args),
      removeEducationDocument: (...args: unknown[]) => removeEducationDocument(...args),
    },
  },
}));

const mockEduItem = {
  id: 'edu-123',
  studentId: 'user-1',
  institutionName: 'MIT',
  degree: 'Bachelor of Science',
  fieldOfStudy: 'Computer Science',
  startDate: '2020-09-01',
  endDate: '2024-06-01',
  current: false,
  grade: '4.0 GPA',
  status: 'unverified',
  documents: [],
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
};

describe('EducationSection', () => {
  beforeEach(() => {
    listEducation.mockReset().mockResolvedValue([mockEduItem]);
    createEducation.mockReset();
    updateEducation.mockReset();
    deleteEducation.mockReset();
    attachEducationDocument.mockReset();
    removeEducationDocument.mockReset();
  });

  it('renders education items correctly', async () => {
    render(<EducationSection />);
    expect(await screen.findByText('MIT')).toBeTruthy();
    expect(screen.getByText('Bachelor of Science in Computer Science')).toBeTruthy();
    expect(screen.getByText('Grade / Score: 4.0 GPA')).toBeTruthy();
  });

  it('opens create modal and adds new education', async () => {
    listEducation.mockResolvedValueOnce([]).mockResolvedValueOnce([mockEduItem]);
    createEducation.mockResolvedValueOnce(mockEduItem);

    render(<EducationSection />);
    const addButton = await screen.findByRole('button', { name: /Add Education/i });
    fireEvent.click(addButton);

    fireEvent.change(screen.getByPlaceholderText(/Stanford University/i), {
      target: { value: 'MIT' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Bachelor of Science/i), {
      target: { value: 'Bachelor of Science' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Computer Science/i), {
      target: { value: 'Computer Science' },
    });

    fireEvent.click(screen.getByRole('button', { name: /^Create$/i }));

    await waitFor(() => expect(createEducation).toHaveBeenCalledTimes(1));
    expect(createEducation).toHaveBeenCalledWith({
      institutionName: 'MIT',
      degree: 'Bachelor of Science',
      fieldOfStudy: 'Computer Science',
      startDate: undefined,
      endDate: undefined,
      current: false,
      grade: undefined,
    });
  });

  it('shows proof status and attaches an education document', async () => {
    attachEducationDocument.mockResolvedValueOnce({
      id: 'doc-1',
      educationId: 'edu-123',
      documentType: 'DEGREE_CERTIFICATE',
      fileName: 'degree.pdf',
      fileUrl: 'storage/education-proofs/degree.pdf',
      fileSizeBytes: 1000,
      mimeType: 'application/pdf',
      createdAt: '2026-09-12T00:00:00.000Z',
    });
    listEducation.mockResolvedValueOnce([mockEduItem]).mockResolvedValueOnce([
      {
        ...mockEduItem,
        documents: [
          {
            id: 'doc-1',
            educationId: 'edu-123',
            documentType: 'DEGREE_CERTIFICATE',
            fileName: 'degree.pdf',
            fileUrl: 'storage/education-proofs/degree.pdf',
            fileSizeBytes: 1000,
            mimeType: 'application/pdf',
            createdAt: '2026-09-12T00:00:00.000Z',
          },
        ],
      },
    ]);

    render(<EducationSection />);
    expect(await screen.findByText('No proof uploaded yet.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Add proof/i }));

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['pdf'], 'degree.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: /Attach proof/i }));

    await waitFor(() => {
      expect(attachEducationDocument).toHaveBeenCalledWith(
        'edu-123',
        expect.objectContaining({
          documentType: 'DEGREE_CERTIFICATE',
          fileName: 'degree.pdf',
        }),
      );
      expect(screen.getByText('degree.pdf')).toBeTruthy();
    });
  });
});
