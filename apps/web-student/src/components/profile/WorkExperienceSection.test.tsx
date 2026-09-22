import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithQueryClient } from '@/test/render-with-query-client';
import { WorkExperienceSection } from './WorkExperienceSection';

const listWorkExperiences = vi.fn();
const createWorkExperience = vi.fn();
const updateWorkExperience = vi.fn();
const deleteWorkExperience = vi.fn();
const sendWorkExperienceVerification = vi.fn();
const sendWorkExperienceManagerEndorsement = vi.fn();
const restartWorkExperienceVerification = vi.fn();
const uploadWorkExperienceProofDocument = vi.fn();
const attachWorkExperienceDocument = vi.fn();
const removeWorkExperienceDocument = vi.fn();

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/lib/api', () => ({
  api: {
    users: {
      listWorkExperiences: (...args: unknown[]) => listWorkExperiences(...args),
      createWorkExperience: (...args: unknown[]) => createWorkExperience(...args),
      updateWorkExperience: (...args: unknown[]) => updateWorkExperience(...args),
      deleteWorkExperience: (...args: unknown[]) => deleteWorkExperience(...args),
      sendWorkExperienceVerification: (...args: unknown[]) =>
        sendWorkExperienceVerification(...args),
      sendWorkExperienceManagerEndorsement: (...args: unknown[]) =>
        sendWorkExperienceManagerEndorsement(...args),
      restartWorkExperienceVerification: (...args: unknown[]) =>
        restartWorkExperienceVerification(...args),
      uploadWorkExperienceProofDocument: (...args: unknown[]) =>
        uploadWorkExperienceProofDocument(...args),
      attachWorkExperienceDocument: (...args: unknown[]) => attachWorkExperienceDocument(...args),
      removeWorkExperienceDocument: (...args: unknown[]) => removeWorkExperienceDocument(...args),
    },
  },
}));

const mockOngoingExp = {
  id: 'exp-1',
  studentId: 'user-1',
  companyName: 'Acme Corp',
  companyWebsite: 'https://acme.com',
  companyLinkedinUrl: 'https://linkedin.com/company/acme',
  role: 'Software Engineer',
  employmentType: 'FULL_TIME',
  domain: 'Software Engineering',
  startDate: '2022-01-01T00:00:00.000Z',
  endDate: null,
  isCurrent: true,
  responsibilities: 'Building awesome apps',
  skillsClaimed: ['SQL_QUERY_OPTIMIZATION'],
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

function fillMandatoryWorkExperienceFields(
  container: HTMLElement,
  overrides: Record<string, string> = {},
  options: { isCurrent?: boolean } = {},
) {
  const values = {
    companyName: 'Tech Corp',
    role: 'Frontend Engineer',
    domain: 'Software Engineering',
    responsibilities: 'Built customer-facing features.',
    startDate: '2022-01-01',
    endDate: '',
    ...overrides,
  };

  fireEvent.change(screen.getByPlaceholderText(/Acme Corporation/i), {
    target: { value: values.companyName },
  });
  fireEvent.change(screen.getByPlaceholderText(/Software Engineer Intern/i), {
    target: { value: values.role },
  });

  const dateInputs = container.querySelectorAll<HTMLInputElement>('input[type="date"]');
  const startDateInput = dateInputs[0];
  if (startDateInput) {
    fireEvent.change(startDateInput, { target: { value: values.startDate } });
  }
  if (values.endDate && dateInputs[1]) {
    fireEvent.change(dateInputs[1], { target: { value: values.endDate } });
  }

  if (options.isCurrent) {
    fireEvent.click(screen.getByLabelText(/I currently work in this role/i));
  }

  fireEvent.change(screen.getByPlaceholderText(/Software Engineering/i), {
    target: { value: values.domain },
  });
  fireEvent.change(screen.getByPlaceholderText(/Key responsibilities, projects, and impact/i), {
    target: { value: values.responsibilities },
  });
}

function clickExperienceSaveButton() {
  const save =
    screen.queryByRole('button', { name: /^Save changes$/i }) ??
    screen.getByRole('button', { name: /Save & send verification/i });
  fireEvent.click(save);
}

function selectCatalogSkill(skillName: string) {
  const select = screen.getByLabelText(/Select skill from catalog/i);
  const options = Array.from(select.querySelectorAll('option'));
  const matched = options.find((option) => option.textContent?.trim() === skillName);
  if (matched?.value) {
    fireEvent.change(select, { target: { value: matched.value } });
    return;
  }
  fireEvent.change(screen.getByPlaceholderText(/search skills/i), {
    target: { value: skillName.slice(0, 4) },
  });
  fireEvent.click(screen.getByRole('button', { name: skillName }));
}

async function openAddExperienceModal() {
  listWorkExperiences.mockResolvedValueOnce([]);
  const view = renderWithQueryClient(<WorkExperienceSection />);
  fireEvent.click(await screen.findByRole('button', { name: /Add your first experience/i }));
  return view;
}

describe('WorkExperienceSection (WE-T01 & WE-T04)', () => {
  beforeEach(() => {
    listWorkExperiences.mockReset().mockResolvedValue([mockOngoingExp]);
    createWorkExperience.mockReset();
    updateWorkExperience.mockReset();
    deleteWorkExperience.mockReset();
    sendWorkExperienceVerification.mockReset();
    sendWorkExperienceManagerEndorsement.mockReset();
    restartWorkExperienceVerification.mockReset();
    uploadWorkExperienceProofDocument.mockReset();
  });

  it('renders ongoing role with active employment metadata', async () => {
    renderWithQueryClient(<WorkExperienceSection />);
    expect(await screen.findByText('Acme Corp')).toBeTruthy();
    expect(screen.getByText('Software Engineer')).toBeTruthy();
    expect(screen.getByText('Active employment')).toBeTruthy();
  });

  it('opens add modal and displays document rule notice for ongoing roles when checkbox is checked', async () => {
    listWorkExperiences.mockResolvedValueOnce([]);
    renderWithQueryClient(<WorkExperienceSection />);

    const addButton = await screen.findByRole('button', { name: /Add your first experience/i });
    fireEvent.click(addButton);

    const currentCheckbox = screen.getByLabelText(/I currently work in this role/i);
    fireEvent.click(currentCheckbox);

    expect(screen.getByText(/Current role: offer letter required/i)).toBeTruthy();
  });

  it('displays document rule notice for ended roles by default or when current is unchecked', async () => {
    listWorkExperiences.mockResolvedValueOnce([]);
    renderWithQueryClient(<WorkExperienceSection />);

    const addButton = await screen.findByRole('button', { name: /Add your first experience/i });
    fireEvent.click(addButton);

    expect(
      screen.getByText(/Past role: offer letter and relieving or experience letter required/i),
    ).toBeTruthy();
  });

  it('shows proof document upload controls in the add experience modal', async () => {
    await openAddExperienceModal();

    expect(screen.getByText('Proof documents *')).toBeTruthy();
    expect(screen.getByLabelText('Proof document')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Add file/i })).toBeTruthy();
  });

  it('submits a new ongoing role when an offer letter is attached in the modal', async () => {
    createWorkExperience.mockResolvedValue({
      ...mockOngoingExp,
      id: 'exp-new',
    });
    uploadWorkExperienceProofDocument.mockResolvedValue({
      id: 'doc-new',
      experienceId: 'exp-new',
      documentType: 'OFFER_LETTER',
      fileName: 'offer.pdf',
      fileUrl: 'work-experience-proofs/student-1/offer.pdf',
      fileSizeBytes: 128,
      mimeType: 'application/pdf',
      createdAt: '2026-09-01T00:00:00.000Z',
    });

    const { container } = await openAddExperienceModal();
    fillMandatoryWorkExperienceFields(container, {}, { isCurrent: true });
    selectCatalogSkill('Git & Version Control');

    const file = new File(['%PDF-1.4 offer'], 'offer.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText('Proof document'), { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: /Add file/i }));

    fireEvent.click(screen.getByRole('button', { name: /Submit experience/i }));

    await waitFor(() => {
      expect(createWorkExperience).toHaveBeenCalledWith(
        expect.not.objectContaining({
          documents: expect.anything(),
        }),
      );
      expect(uploadWorkExperienceProofDocument).toHaveBeenCalledWith(
        'exp-new',
        file,
        'offer.pdf',
        'OFFER_LETTER',
      );
    });
  });

  it('allows saving a draft without proof documents when mandatory fields are complete', async () => {
    createWorkExperience.mockResolvedValue({
      ...mockOngoingExp,
      id: 'exp-draft',
      documents: [],
    });

    const { container } = await openAddExperienceModal();

    fillMandatoryWorkExperienceFields(container, {}, { isCurrent: true });
    selectCatalogSkill('Git & Version Control');

    fireEvent.click(screen.getByRole('button', { name: /Submit experience/i }));

    await waitFor(() => {
      expect(createWorkExperience).toHaveBeenCalled();
    });
    expect(uploadWorkExperienceProofDocument).not.toHaveBeenCalled();
  });

  it('renders student claim status tracker with document proof, document check, employer verification, and status copy (WE-T04)', async () => {
    renderWithQueryClient(<WorkExperienceSection />);

    expect(await screen.findByText(/Verification progress/i)).toBeTruthy();
    expect(screen.getAllByText('Submitted — Ready for Verification').length).toBeGreaterThan(0);
    expect(screen.getByText('Document Proof')).toBeTruthy();
    expect(screen.getByText('Document Review')).toBeTruthy();
    expect(screen.getByText('Employer Verification')).toBeTruthy();
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

    renderWithQueryClient(<WorkExperienceSection />);

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

  it('rate-limits resend verification while employer verification is pending', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const pendingExp = {
      ...mockOngoingExp,
      status: 'PENDING_EMPLOYER',
      verifierEmail: 'jane@acme.com',
    };
    listWorkExperiences.mockResolvedValue([pendingExp]);
    sendWorkExperienceVerification.mockResolvedValue({
      success: true,
      message: 'Employer verification email queued for delivery to jane@acme.com.',
    });

    renderWithQueryClient(<WorkExperienceSection />);
    const resendBtn = await screen.findByRole('button', { name: /Resend Verification Link/i });

    fireEvent.click(resendBtn);
    await waitFor(() => {
      expect(sendWorkExperienceVerification).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(resendBtn);
    expect(sendWorkExperienceVerification).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('button', { name: /Resend in/i })).toBeTruthy();

    vi.useRealTimers();
  });

  it('shows offer-letter helper and hides validate proof action for offer attachments (S6-VB-01)', async () => {
    renderWithQueryClient(<WorkExperienceSection />);
    expect(await screen.findByText(/Offer letters support your claim/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Validate Proof/i })).toBeNull();
  });

  it('requires company website and LinkedIn when website is provided (S6-VB-01)', async () => {
    renderWithQueryClient(<WorkExperienceSection />);

    fireEvent.click(await screen.findByRole('button', { name: /Edit experience/i }));
    expect(await screen.findByText('Edit Work Experience')).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText('https://company.com'), {
      target: { value: 'https://acme.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('https://linkedin.com/company/acme'), {
      target: { value: '' },
    });

    clickExperienceSaveButton();
    expect(updateWorkExperience).not.toHaveBeenCalled();
    expect(screen.getAllByText(/Company LinkedIn URL is required/i).length).toBeGreaterThan(0);
  });

  it('renders manager endorsement stage when manager endorsement status is attached (WE-T04)', async () => {
    const mockEndorsedExp = {
      ...mockOngoingExp,
      managerEndorsement: {
        endorsementId: 'endorsement-1',
        status: 'CONFIRMED',
        managerEmail: 'manager@acme.com',
        managerName: 'Jane Smith',
        sentAt: '2026-09-01T00:00:00.000Z',
        expiresAt: '2026-09-06T00:00:00.000Z',
      },
    };
    listWorkExperiences.mockResolvedValueOnce([mockEndorsedExp]);

    renderWithQueryClient(<WorkExperienceSection />);

    expect(await screen.findByText('Manager Endorsement')).toBeTruthy();
    expect(screen.getByText(/Manager endorsement complete for manager@acme.com/i)).toBeTruthy();
  });

  it('requests manager endorsement with manager email from the card form (VER-02)', async () => {
    listWorkExperiences.mockResolvedValue([mockOngoingExp]);
    sendWorkExperienceManagerEndorsement.mockResolvedValue({
      success: true,
      endorsementId: 'endorsement-1',
      managerEmail: 'manager@acme.com',
      expiresAt: '2026-09-06T00:00:00.000Z',
      message: 'Manager endorsement request dispatched to manager@acme.com. Valid for 5 days.',
    });

    renderWithQueryClient(<WorkExperienceSection />);

    expect(await screen.findByText('Manager endorsement')).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText('manager@yourcompany.com'), {
      target: { value: 'manager@acme.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Request Endorsement' }));

    await waitFor(() => {
      expect(sendWorkExperienceManagerEndorsement).toHaveBeenCalledWith('exp-1', {
        managerEmail: 'manager@acme.com',
        managerName: null,
      });
    });
  });

  it('shows pending manager endorsement state without resubmit form (VER-02)', async () => {
    listWorkExperiences.mockResolvedValueOnce([
      {
        ...mockOngoingExp,
        managerEndorsement: {
          endorsementId: 'endorsement-1',
          status: 'PENDING',
          managerEmail: 'manager@acme.com',
          managerName: 'Jane Smith',
          sentAt: '2026-09-01T00:00:00.000Z',
          expiresAt: '2026-09-06T00:00:00.000Z',
        },
      },
    ]);

    renderWithQueryClient(<WorkExperienceSection />);

    expect(await screen.findByText('Endorsement request pending')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Request Endorsement' })).toBeNull();
  });
});

describe('WorkExperienceSection mandatory fields (S6-VB-01)', () => {
  beforeEach(() => {
    listWorkExperiences.mockReset().mockResolvedValue([mockOngoingExp]);
    createWorkExperience.mockReset();
    updateWorkExperience.mockReset().mockResolvedValue(mockOngoingExp);
    uploadWorkExperienceProofDocument.mockReset();
  });

  it('renders the Professional Domain field', async () => {
    await openAddExperienceModal();
    expect(screen.getByPlaceholderText(/Software Engineering/i)).toBeTruthy();
  });

  it('marks Professional Domain as required', async () => {
    await openAddExperienceModal();
    expect(screen.getByText('Professional domain *')).toBeTruthy();
  });

  it('prevents save when domain is empty', async () => {
    const { container } = await openAddExperienceModal();
    fillMandatoryWorkExperienceFields(container, { domain: '' }, { isCurrent: true });
    selectCatalogSkill('Git & Version Control');

    fireEvent.click(screen.getByRole('button', { name: /Submit experience/i }));

    expect(createWorkExperience).not.toHaveBeenCalled();
    expect(screen.getAllByText(/Professional domain is required/i).length).toBeGreaterThan(0);
  });

  it('prevents save when responsibilities are empty', async () => {
    const { container } = await openAddExperienceModal();
    fillMandatoryWorkExperienceFields(container, { responsibilities: '' }, { isCurrent: true });
    selectCatalogSkill('Git & Version Control');

    fireEvent.click(screen.getByRole('button', { name: /Submit experience/i }));

    expect(createWorkExperience).not.toHaveBeenCalled();
    expect(
      screen.getAllByText(/Responsibilities and accomplishments are required/i).length,
    ).toBeGreaterThan(0);
  });

  it('prevents save when no skills are selected', async () => {
    const { container } = await openAddExperienceModal();
    fillMandatoryWorkExperienceFields(container, {}, { isCurrent: true });

    fireEvent.click(screen.getByRole('button', { name: /Submit experience/i }));

    expect(createWorkExperience).not.toHaveBeenCalled();
    expect(
      screen.getAllByText(/At least one skill from the catalog is required/i).length,
    ).toBeGreaterThan(0);
  });

  it('marks End Date as required when employment has ended', async () => {
    await openAddExperienceModal();
    expect(screen.getByText('End date *')).toBeTruthy();
  });

  it('prevents save for ended employment when End Date is missing', async () => {
    const { container } = await openAddExperienceModal();
    fillMandatoryWorkExperienceFields(container);
    selectCatalogSkill('Git & Version Control');

    fireEvent.click(screen.getByRole('button', { name: /Submit experience/i }));

    expect(createWorkExperience).not.toHaveBeenCalled();
    expect(
      screen.getAllByText(/End date is required if not currently employed/i).length,
    ).toBeGreaterThan(0);
  });

  it('keeps End Date optional when currently employed', async () => {
    createWorkExperience.mockResolvedValue({
      ...mockOngoingExp,
      id: 'exp-current',
      isCurrent: true,
      endDate: null,
    });

    const { container } = await openAddExperienceModal();
    fillMandatoryWorkExperienceFields(container, {}, { isCurrent: true });
    expect(screen.queryByText('End date *')).toBeNull();
    expect(screen.getByText(/^End date$/i)).toBeTruthy();
    selectCatalogSkill('Git & Version Control');

    fireEvent.click(screen.getByRole('button', { name: /Submit experience/i }));

    await waitFor(() => {
      expect(createWorkExperience).toHaveBeenCalledWith(
        expect.objectContaining({ isCurrent: true, endDate: null }),
      );
    });
    expect(screen.queryByText(/End date is required if not currently employed/i)).toBeNull();
  });

  it('allows saving a valid complete work experience entry', async () => {
    updateWorkExperience.mockResolvedValue(mockOngoingExp);
    sendWorkExperienceVerification.mockResolvedValue({
      success: true,
      experienceId: 'exp-1',
      status: 'PENDING_EMPLOYER',
      message: 'Employer verification email queued for delivery to jane@acme.com.',
      expiresAt: '2026-09-03T00:00:00.000Z',
    });
    renderWithQueryClient(<WorkExperienceSection />);
    fireEvent.click(await screen.findByRole('button', { name: /Edit experience/i }));
    expect(await screen.findByText('Edit Work Experience')).toBeTruthy();

    clickExperienceSaveButton();

    expect(updateWorkExperience).toHaveBeenCalledWith(
      'exp-1',
      expect.objectContaining({
        domain: 'Software Engineering',
        responsibilities: 'Building awesome apps',
        skillsClaimed: ['SQL_QUERY_OPTIMIZATION'],
      }),
    );
    expect(updateWorkExperience.mock.calls[0]?.[1]).not.toHaveProperty('documents');
  });

  it('save changes keeps persisted proof documents when adding a pending offer letter on edit', async () => {
    listWorkExperiences.mockResolvedValue([
      {
        ...mockOngoingExp,
        documents: [],
      },
    ]);
    updateWorkExperience.mockResolvedValue(mockOngoingExp);
    uploadWorkExperienceProofDocument.mockResolvedValue({
      id: 'doc-new',
      experienceId: 'exp-1',
      documentType: 'OFFER_LETTER',
      fileName: 'offer.pdf',
      fileUrl: 'work-experience-proofs/student-1/offer.pdf',
      fileSizeBytes: 128,
      mimeType: 'application/pdf',
      createdAt: '2026-09-01T00:00:00.000Z',
    });

    renderWithQueryClient(<WorkExperienceSection />);
    fireEvent.click(await screen.findByRole('button', { name: /Edit experience/i }));

    const file = new File(['%PDF-1.4 offer'], 'offer.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText('Proof document'), { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: /Add file/i }));

    expect(screen.getByText(/Requirements met/i)).toBeTruthy();

    clickExperienceSaveButton();

    await waitFor(() => {
      expect(uploadWorkExperienceProofDocument).toHaveBeenCalled();
      expect(updateWorkExperience).toHaveBeenCalledWith(
        'exp-1',
        expect.not.objectContaining({ documents: expect.anything() }),
      );
    });
  });

  it('does not call the API when mandatory validation fails', async () => {
    const { container } = await openAddExperienceModal();
    fillMandatoryWorkExperienceFields(container, { domain: '   ' }, { isCurrent: true });
    selectCatalogSkill('Git & Version Control');

    fireEvent.click(screen.getByRole('button', { name: /Submit experience/i }));

    expect(createWorkExperience).not.toHaveBeenCalled();
    expect(updateWorkExperience).not.toHaveBeenCalled();
  });
});
