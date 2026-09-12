import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkExperienceSection } from './WorkExperienceSection';

const listWorkExperiences = vi.fn();
const createWorkExperience = vi.fn();
const updateWorkExperience = vi.fn();
const deleteWorkExperience = vi.fn();
const sendWorkExperienceVerification = vi.fn();
const restartWorkExperienceVerification = vi.fn();
const uploadWorkExperienceProofDocument = vi.fn();
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
  fireEvent.change(screen.getByPlaceholderText(/Software Engineering, Business Analytics/i), {
    target: { value: values.domain },
  });
  fireEvent.change(
    screen.getByPlaceholderText(/Key responsibilities, projects, and technologies used/i),
    { target: { value: values.responsibilities } },
  );

  const dateInputs = container.querySelectorAll<HTMLInputElement>('input[type="date"]');
  const startDateInput = dateInputs[0];
  if (startDateInput) {
    fireEvent.change(startDateInput, { target: { value: values.startDate } });
  }
  if (values.endDate && dateInputs[1]) {
    fireEvent.change(dateInputs[1], { target: { value: values.endDate } });
  }
}

function selectCatalogSkill(skillName: string) {
  fireEvent.change(screen.getByPlaceholderText(/Search skills/i), {
    target: { value: skillName.slice(0, 4) },
  });
  fireEvent.click(screen.getByRole('button', { name: skillName }));
}

async function openAddExperienceModal() {
  listWorkExperiences.mockResolvedValueOnce([]);
  const view = render(<WorkExperienceSection />);
  fireEvent.click(await screen.findByRole('button', { name: /Add/i }));
  return view;
}

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
    const { container } = await openAddExperienceModal();

    fillMandatoryWorkExperienceFields(container);
    selectCatalogSkill('Version Control & Code Collaboration');

    fireEvent.click(screen.getByLabelText(/I currently work in this role/i));
    fireEvent.click(screen.getByRole('button', { name: /Submit Experience/i }));

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

  it('shows offer-letter helper and hides validate proof action for offer attachments (S6-VB-01)', async () => {
    render(<WorkExperienceSection />);
    expect(await screen.findByText(/Offer letters support your claim/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Validate Proof/i })).toBeNull();
  });

  it('requires company website and LinkedIn when website is provided (S6-VB-01)', async () => {
    render(<WorkExperienceSection />);

    fireEvent.click(await screen.findByTitle('Edit Experience'));
    expect(await screen.findByText('Edit Work Experience')).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText('https://company.com'), {
      target: { value: 'https://acme.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('https://linkedin.com/company/acme'), {
      target: { value: '' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));
    expect(updateWorkExperience).not.toHaveBeenCalled();
    expect(screen.getAllByText(/Company LinkedIn URL is required/i).length).toBeGreaterThan(0);
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

describe('WorkExperienceSection mandatory fields (S6-VB-01)', () => {
  beforeEach(() => {
    listWorkExperiences.mockReset().mockResolvedValue([mockOngoingExp]);
    createWorkExperience.mockReset();
    updateWorkExperience.mockReset().mockResolvedValue(mockOngoingExp);
  });

  it('renders the Professional Domain field', async () => {
    await openAddExperienceModal();
    expect(screen.getByPlaceholderText(/Software Engineering, Business Analytics/i)).toBeTruthy();
  });

  it('marks Professional Domain as required', async () => {
    await openAddExperienceModal();
    expect(screen.getByText('Professional Domain *')).toBeTruthy();
  });

  it('prevents save when domain is empty', async () => {
    const { container } = await openAddExperienceModal();
    fillMandatoryWorkExperienceFields(container, { domain: '' });
    selectCatalogSkill('Version Control & Code Collaboration');
    fireEvent.click(screen.getByLabelText(/I currently work in this role/i));

    fireEvent.click(screen.getByRole('button', { name: /Submit Experience/i }));

    expect(createWorkExperience).not.toHaveBeenCalled();
    expect(screen.getAllByText(/Professional domain is required/i).length).toBeGreaterThan(0);
  });

  it('prevents save when responsibilities are empty', async () => {
    const { container } = await openAddExperienceModal();
    fillMandatoryWorkExperienceFields(container, { responsibilities: '' });
    selectCatalogSkill('Version Control & Code Collaboration');
    fireEvent.click(screen.getByLabelText(/I currently work in this role/i));

    fireEvent.click(screen.getByRole('button', { name: /Submit Experience/i }));

    expect(createWorkExperience).not.toHaveBeenCalled();
    expect(
      screen.getAllByText(/Responsibilities and accomplishments are required/i).length,
    ).toBeGreaterThan(0);
  });

  it('prevents save when no skills are selected', async () => {
    const { container } = await openAddExperienceModal();
    fillMandatoryWorkExperienceFields(container);
    fireEvent.click(screen.getByLabelText(/I currently work in this role/i));

    fireEvent.click(screen.getByRole('button', { name: /Submit Experience/i }));

    expect(createWorkExperience).not.toHaveBeenCalled();
    expect(
      screen.getAllByText(/At least one skill from the catalog is required/i).length,
    ).toBeGreaterThan(0);
  });

  it('marks End Date as required when employment has ended', async () => {
    await openAddExperienceModal();
    expect(screen.getByText('End Date *')).toBeTruthy();
  });

  it('prevents save for ended employment when End Date is missing', async () => {
    const { container } = await openAddExperienceModal();
    fillMandatoryWorkExperienceFields(container);
    selectCatalogSkill('Version Control & Code Collaboration');

    fireEvent.click(screen.getByRole('button', { name: /Submit Experience/i }));

    expect(createWorkExperience).not.toHaveBeenCalled();
    expect(
      screen.getAllByText(/End date is required if not currently employed/i).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText('End Date *')).toBeTruthy();
  });

  it('keeps End Date optional when currently employed', async () => {
    const { container } = await openAddExperienceModal();
    fillMandatoryWorkExperienceFields(container);
    selectCatalogSkill('Version Control & Code Collaboration');
    fireEvent.click(screen.getByLabelText(/I currently work in this role/i));

    expect(screen.queryByText('End Date *')).toBeNull();
    expect(screen.getByText(/^End Date$/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Submit Experience/i }));

    expect(createWorkExperience).not.toHaveBeenCalled();
    expect(
      screen.getAllByText(/An offer letter is required for all work experience claims/i).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByText(/End date is required if not currently employed/i)).toBeNull();
  });

  it('allows saving a valid complete work experience entry', async () => {
    render(<WorkExperienceSection />);
    fireEvent.click(await screen.findByTitle('Edit Experience'));
    expect(await screen.findByText('Edit Work Experience')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

    expect(updateWorkExperience).toHaveBeenCalledWith(
      'exp-1',
      expect.objectContaining({
        domain: 'Software Engineering',
        responsibilities: 'Building awesome apps',
        skillsClaimed: ['SQL_QUERY_OPTIMIZATION'],
      }),
    );
  });

  it('does not call the API when mandatory validation fails', async () => {
    const { container } = await openAddExperienceModal();
    fillMandatoryWorkExperienceFields(container, { domain: '   ' });
    selectCatalogSkill('Version Control & Code Collaboration');
    fireEvent.click(screen.getByLabelText(/I currently work in this role/i));

    fireEvent.click(screen.getByRole('button', { name: /Submit Experience/i }));

    expect(createWorkExperience).not.toHaveBeenCalled();
    expect(updateWorkExperience).not.toHaveBeenCalled();
  });
});
