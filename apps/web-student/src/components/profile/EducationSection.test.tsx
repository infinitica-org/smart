import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithQueryClient } from '@/test/render-with-query-client';
import { EducationSection } from './EducationSection';

const listEducation = vi.fn();
const createEducation = vi.fn();
const updateEducation = vi.fn();
const deleteEducation = vi.fn();
const attachEducationDocument = vi.fn();
const removeEducationDocument = vi.fn();
const getOnboarding = vi.fn();
const saveOnboarding = vi.fn();

vi.mock('@/lib/api', () => ({
  api: {
    users: {
      listEducation: (...args: unknown[]) => listEducation(...args),
      createEducation: (...args: unknown[]) => createEducation(...args),
      updateEducation: (...args: unknown[]) => updateEducation(...args),
      deleteEducation: (...args: unknown[]) => deleteEducation(...args),
      attachEducationDocument: (...args: unknown[]) => attachEducationDocument(...args),
      removeEducationDocument: (...args: unknown[]) => removeEducationDocument(...args),
      getOnboarding: (...args: unknown[]) => getOnboarding(...args),
      saveOnboarding: (...args: unknown[]) => saveOnboarding(...args),
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
    getOnboarding.mockReset().mockResolvedValue({ profile: null, draft: null });
    saveOnboarding.mockReset().mockResolvedValue(undefined);
  });

  it('renders education items correctly', async () => {
    renderWithQueryClient(<EducationSection />);
    expect(await screen.findByText('MIT')).toBeTruthy();
    expect(screen.getByText('Bachelor of Science')).toBeTruthy();
    expect(screen.getByText('4.0 GPA')).toBeTruthy();
    expect(screen.getByText(/Final score/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Add education/i })).toBeTruthy();
  });

  it('discards unsaved create form when the modal is closed', async () => {
    listEducation.mockResolvedValue([]);

    renderWithQueryClient(<EducationSection />);
    fireEvent.click(await screen.findByRole('button', { name: /Add your first education/i }));

    const schoolInput = await screen.findByPlaceholderText(/RV College/i);
    fireEvent.change(schoolInput, { target: { value: 'Draft College' } });
    fireEvent.click(screen.getByLabelText('Close'));

    fireEvent.click(screen.getByRole('button', { name: /Add your first education/i }));
    const schoolAgain = await screen.findByPlaceholderText(/RV College/i);
    expect((schoolAgain as HTMLInputElement).value).toBe('');
  });

  it('opens create modal and adds new education', async () => {
    listEducation.mockResolvedValueOnce([]).mockResolvedValueOnce([mockEduItem]);
    createEducation.mockResolvedValueOnce(mockEduItem);

    renderWithQueryClient(<EducationSection />);
    const addButton = await screen.findByRole('button', { name: /Add your first education/i });
    fireEvent.click(addButton);

    await screen.findByPlaceholderText(/RV College/i);

    fireEvent.change(screen.getByPlaceholderText(/RV College/i), {
      target: { value: 'MIT' },
    });
    fireEvent.change(screen.getByLabelText('Program / Degree *'), {
      target: { value: 'B.Tech' },
    });
    fireEvent.change(screen.getByLabelText('Board / University *'), {
      target: { value: 'CBSE' },
    });
    fireEvent.change(screen.getByLabelText('Branch / Specialization (Optional)'), {
      target: { value: 'Computer Science' },
    });
    fireEvent.change(screen.getByLabelText('Start year *'), {
      target: { value: '2020' },
    });
    fireEvent.change(screen.getByLabelText('End year *'), {
      target: { value: '2024' },
    });
    fireEvent.change(screen.getByLabelText('Study mode *'), {
      target: { value: 'Full-time' },
    });
    fireEvent.change(screen.getByTestId('education-score-input'), {
      target: { value: '8.5' },
    });
    fireEvent.change(screen.getByLabelText(/Institute roll no/i), {
      target: { value: '22ALR110' },
    });
    fireEvent.change(screen.getByLabelText(/Current semester/i), {
      target: { value: '7' },
    });

    fireEvent.click(screen.getByRole('button', { name: /^Save$/i }));

    await waitFor(() => expect(createEducation).toHaveBeenCalledTimes(1));
    expect(createEducation).toHaveBeenCalledWith(
      expect.objectContaining({
        institutionName: 'MIT · CBSE',
        degree: 'Full-time — B.Tech',
        fieldOfStudy: 'Computer Science',
        startDate: '2020-01-01',
        endDate: '2024-01-01',
        current: false,
        grade: '8.5 CGPA',
        degreeDetails: expect.objectContaining({
          rollNumber: '22ALR110',
          currentSemester: 7,
        }),
      }),
    );
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

    renderWithQueryClient(<EducationSection />);
    expect(await screen.findByText(/No files/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /^Upload$/i }));

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
      expect(screen.getByText(/1 document\(s\)/i)).toBeTruthy();
    });
  });

  async function openCreateModalAndFill() {
    fireEvent.click(await screen.findByRole('button', { name: /Add your first education/i }));
    await screen.findByPlaceholderText(/RV College/i);
    fireEvent.change(screen.getByPlaceholderText(/RV College/i), { target: { value: 'MIT' } });
    fireEvent.change(screen.getByLabelText('Program / Degree *'), { target: { value: 'B.Tech' } });
    fireEvent.change(screen.getByLabelText('Board / University *'), { target: { value: 'CBSE' } });
    fireEvent.change(screen.getByLabelText('Start year *'), { target: { value: '2020' } });
    fireEvent.change(screen.getByLabelText('End year *'), { target: { value: '2024' } });
    fireEvent.change(screen.getByLabelText('Study mode *'), { target: { value: 'Full-time' } });
    fireEvent.change(screen.getByTestId('education-score-input'), { target: { value: '8.5' } });
    fireEvent.change(screen.getByLabelText(/Institute roll no/i), {
      target: { value: '22ALR110' },
    });
    fireEvent.change(screen.getByLabelText(/Current semester/i), { target: { value: '7' } });
  }

  it('shows an empty state when there are no education entries', async () => {
    listEducation.mockResolvedValue([]);
    renderWithQueryClient(<EducationSection />);
    expect(await screen.findByText('No education entries yet')).toBeTruthy();
  });

  it('shows a specific error when education cannot be loaded', async () => {
    listEducation.mockRejectedValue(new Error('Education service unavailable'));
    renderWithQueryClient(<EducationSection />);
    expect(await screen.findByText('Education service unavailable')).toBeTruthy();
  });

  it('does not save when required fields are missing', async () => {
    listEducation.mockResolvedValue([]);
    renderWithQueryClient(<EducationSection />);
    fireEvent.click(await screen.findByRole('button', { name: /Add your first education/i }));
    await screen.findByPlaceholderText(/RV College/i);

    fireEvent.click(screen.getByRole('button', { name: /^Save$/i }));

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(createEducation).not.toHaveBeenCalled();
    expect(screen.getByPlaceholderText(/RV College/i)).toBeTruthy();
  });

  it('keeps the entered data and reports the error when saving fails, then succeeds on retry', async () => {
    listEducation.mockResolvedValue([]);
    createEducation
      .mockRejectedValueOnce(new Error('Could not reach server'))
      .mockResolvedValueOnce(mockEduItem);
    renderWithQueryClient(<EducationSection />);
    await openCreateModalAndFill();

    fireEvent.click(screen.getByRole('button', { name: /^Save$/i }));

    expect(await screen.findByText('Could not reach server')).toBeTruthy();
    expect((screen.getByPlaceholderText(/RV College/i) as HTMLInputElement).value).toBe('MIT');

    fireEvent.click(screen.getByRole('button', { name: /^Save$/i }));
    await waitFor(() => expect(createEducation).toHaveBeenCalledTimes(2));
  });

  it('asks for confirmation before deleting and skips the API call when cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderWithQueryClient(<EducationSection />);

    fireEvent.click(await screen.findByRole('button', { name: 'Delete education' }));

    expect(window.confirm).toHaveBeenCalled();
    expect(deleteEducation).not.toHaveBeenCalled();
  });

  it('deletes the entry once confirmed', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    deleteEducation.mockResolvedValue(undefined);
    renderWithQueryClient(<EducationSection />);

    fireEvent.click(await screen.findByRole('button', { name: 'Delete education' }));

    await waitFor(() => expect(deleteEducation).toHaveBeenCalledWith('edu-123'));
  });
});
