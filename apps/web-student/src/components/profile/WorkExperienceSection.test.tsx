import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkExperienceSection } from './WorkExperienceSection';

const listWorkExperiences = vi.fn();
const createWorkExperience = vi.fn();
const updateWorkExperience = vi.fn();
const deleteWorkExperience = vi.fn();
const sendWorkExperienceVerification = vi.fn();
const restartWorkExperienceVerification = vi.fn();
const attachWorkExperienceDocument = vi.fn();
const removeWorkExperienceDocument = vi.fn();

vi.mock('@/lib/api', () => ({
  api: {
    users: {
      listWorkExperiences: (...args: unknown[]) => listWorkExperiences(...args),
      createWorkExperience: (...args: unknown[]) => createWorkExperience(...args),
      updateWorkExperience: (...args: unknown[]) => updateWorkExperience(...args),
      deleteWorkExperience: (...args: unknown[]) => deleteWorkExperience(...args),
      sendWorkExperienceVerification: (...args: unknown[]) =>
        sendWorkExperienceVerification(...args),
      restartWorkExperienceVerification: (...args: unknown[]) =>
        restartWorkExperienceVerification(...args),
      attachWorkExperienceDocument: (...args: unknown[]) => attachWorkExperienceDocument(...args),
      removeWorkExperienceDocument: (...args: unknown[]) => removeWorkExperienceDocument(...args),
    },
  },
}));

const mockOngoingExp = {
  id: 'exp-1',
  studentId: 'user-1',
  companyName: 'Acme Corp',
  role: 'Software Engineer',
  employmentType: 'FULL_TIME',
  startDate: '2022-01-01T00:00:00.000Z',
  endDate: null,
  isCurrent: true,
  responsibilities: 'Building awesome apps',
  skillsClaimed: ['GIT_VERSION_CONTROL'],
  verifierName: 'Jane Manager',
  verifierEmail: 'jane@acme.com',
  status: 'SUBMITTED',
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
  documents: [
    {
      id: 'doc-1',
      experienceId: 'exp-1',
      documentType: 'OFFER_LETTER',
      fileName: 'offer.pdf',
      fileUrl: 'storage/offer.pdf',
      fileSizeBytes: 1024,
      mimeType: 'application/pdf',
      createdAt: '2026-09-01T00:00:00.000Z',
    },
  ],
};

describe('WorkExperienceSection (WE-T01 & WE-T04)', () => {
  beforeEach(() => {
    listWorkExperiences.mockReset().mockResolvedValue([mockOngoingExp]);
    createWorkExperience.mockReset();
    updateWorkExperience.mockReset();
    deleteWorkExperience.mockReset();
    sendWorkExperienceVerification.mockReset();
    restartWorkExperienceVerification.mockReset();
  });

  it('renders ongoing role and displays "Active — pending final documentation" status badge', async () => {
    render(<WorkExperienceSection />);
    expect(await screen.findByText('Acme Corp')).toBeTruthy();
    expect(screen.getByText('Software Engineer')).toBeTruthy();
    expect(screen.getByText('Active — pending final documentation')).toBeTruthy();
  });

  it('opens add modal and displays document rule notice for ongoing roles when checkbox is checked', async () => {
    listWorkExperiences.mockResolvedValueOnce([]);
    render(<WorkExperienceSection />);

    const addButton = await screen.findByRole('button', { name: /Add/i });
    fireEvent.click(addButton);

    const currentCheckbox = screen.getByLabelText(/I currently work in this role/i);
    fireEvent.click(currentCheckbox);

    expect(screen.getByText(/Ongoing Role: Offer letter required/i)).toBeTruthy();
  });

  it('displays document rule notice for ended roles by default or when current is unchecked', async () => {
    listWorkExperiences.mockResolvedValueOnce([]);
    render(<WorkExperienceSection />);

    const addButton = await screen.findByRole('button', { name: /Add/i });
    fireEvent.click(addButton);

    expect(
      screen.getByText(/Ended Role: Offer Letter \+ Completion\/Relieving Letter required/i),
    ).toBeTruthy();
  });

  it('prevents submission client-side if required offer letter is missing', async () => {
    listWorkExperiences.mockResolvedValueOnce([]);
    const { container } = render(<WorkExperienceSection />);

    const addButton = await screen.findByRole('button', { name: /Add/i });
    fireEvent.click(addButton);

    fireEvent.change(screen.getByPlaceholderText(/Acme Corporation/i), {
      target: { value: 'Tech Corp' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Software Engineer Intern/i), {
      target: { value: 'Frontend Engineer' },
    });

    const currentCheckbox = screen.getByLabelText(/I currently work in this role/i);
    fireEvent.click(currentCheckbox);

    // Set valid start date so HTML5 validation passes
    const dateInputs = container.querySelectorAll<HTMLInputElement>('input[type="date"]');
    const startDateInput = dateInputs[0];
    if (startDateInput) {
      fireEvent.change(startDateInput, { target: { value: '2022-01-01' } });
    }

    const submitBtn = screen.getByRole('button', { name: /Submit Experience/i });
    fireEvent.click(submitBtn);

    expect(createWorkExperience).not.toHaveBeenCalled();
    expect(
      screen.getAllByText(/An offer letter is required for all work experience claims/i).length,
    ).toBeGreaterThan(0);
  });

  it('renders student claim status tracker with document proof, document check, employer verification, and status copy (WE-T04)', async () => {
    render(<WorkExperienceSection />);

    expect(await screen.findByText('Student Claim Status Tracker')).toBeTruthy();
    expect(screen.getAllByText('Submitted — Ready for Verification').length).toBeGreaterThan(0);
    expect(screen.getByText('1. Document Proof')).toBeTruthy();
    expect(screen.getByText('2. Document Check')).toBeTruthy();
    expect(screen.getByText('3. Employer Verification')).toBeTruthy();
    expect(
      screen.getByText(/Click "Send Verification Link" to dispatch verification request/i),
    ).toBeTruthy();
  });

  it('renders expired verification banner with "Link Expired — Resend or Try Another Verifier" prompt and invokes restartWorkExperienceVerification (WE-T04)', async () => {
    const mockExpiredExp = {
      ...mockOngoingExp,
      status: 'EXPIRED',
    };
    listWorkExperiences.mockResolvedValueOnce([mockExpiredExp]);
    restartWorkExperienceVerification.mockResolvedValueOnce({
      success: true,
      message: 'Verification request restarted successfully.',
    });

    render(<WorkExperienceSection />);

    expect(await screen.findByText('Link Expired — Resend or Try Another Verifier')).toBeTruthy();
    expect(
      screen.getByText(/Verification link expired after 48h without a response/i),
    ).toBeTruthy();
    expect(screen.getAllByText('Verification Link Expired (Action Needed)').length).toBeGreaterThan(
      0,
    );

    const restartBtn = screen.getAllByRole('button', { name: /Restart Verification/i })[0];
    expect(restartBtn).toBeTruthy();
    if (restartBtn) {
      fireEvent.click(restartBtn);
    }

    expect(restartWorkExperienceVerification).toHaveBeenCalledWith('exp-1');
  });

  it('renders manager endorsement stage when manager endorsement status is attached (WE-T04)', async () => {
    const mockEndorsedExp = {
      ...mockOngoingExp,
      managerEndorsement: {
        status: 'CONFIRMED',
      },
    };
    listWorkExperiences.mockResolvedValueOnce([mockEndorsedExp]);

    render(<WorkExperienceSection />);

    expect(await screen.findByText('4. Manager Endorsement Status')).toBeTruthy();
    expect(screen.getByText('CONFIRMED')).toBeTruthy();
  });
});
