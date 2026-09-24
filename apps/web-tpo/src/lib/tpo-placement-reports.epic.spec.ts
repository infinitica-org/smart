import { describe, expect, it, vi } from 'vitest';
import type {
  InstitutionStudentDto,
  JobOpeningDto,
  PlacementEmployerSummary,
  SkillClaimDto,
} from '@smart/contracts';
import {
  applicationCountByEmployerId,
  buildEmployerEngagementRows,
  buildPlacementOpportunitiesSummary,
  buildVerificationByMajorRows,
  exportEmployerEngagementCsv,
  exportPlacementOpportunitiesCsv,
  exportVerificationByMajorCsv,
  toCsv,
} from './tpo-reports-export';

const createStudent = (overrides: Partial<InstitutionStudentDto>): InstitutionStudentDto => ({
  userId: '11111111-1111-4111-8111-111111111111',
  email: 'alex@school.edu',
  fullName: 'Alex Smith',
  batchId: 'batch-cs',
  batchName: 'Computer Science',
  inviteStatus: 'ACCEPTED',
  lastSentAt: null,
  acceptedAt: null,
  heldAt: null,
  linkedinUrl: null,
  githubUrl: null,
  ...overrides,
});

describe('Epic REPORT-01: University Placement Analytics & Export Reports (Th6-I601..Th6-I606)', () => {
  it('Th6-I601: computes student skill verification breakdown by major/cohort', () => {
    const students = [
      createStudent({ userId: 'std-1', batchName: 'Computer Science' }),
      createStudent({ userId: 'std-2', batchName: 'Computer Science', inviteStatus: 'PENDING' }),
      createStudent({ userId: 'std-3', batchName: 'Electrical Engineering' }),
    ];
    const claims = [
      { studentId: 'std-1', status: 'VERIFIED' } as SkillClaimDto,
      { studentId: 'std-3', status: 'VERIFIED' } as SkillClaimDto,
    ];

    const rows = buildVerificationByMajorRows(students, claims);
    expect(rows).toHaveLength(2);

    const cs = rows.find((r) => r.major === 'Computer Science');
    expect(cs).toEqual({
      major: 'Computer Science',
      whitelisted: 2,
      fullyVerified: 1,
      partial: 0,
      pending: 1,
      completionPct: 50,
    });

    const ee = rows.find((r) => r.major === 'Electrical Engineering');
    expect(ee).toEqual({
      major: 'Electrical Engineering',
      whitelisted: 1,
      fullyVerified: 1,
      partial: 0,
      pending: 0,
      completionPct: 100,
    });
  });

  it('Th6-I602: aggregates placement opportunity and application metrics', () => {
    const students = [
      createStudent({ userId: 'std-1' }),
      createStudent({ userId: 'std-2', inviteStatus: 'PENDING' }),
    ];
    const claims = [{ studentId: 'std-1', status: 'VERIFIED' } as SkillClaimDto];
    const openings = [
      { openingId: 'job-1', status: 'OPEN' } as JobOpeningDto,
      { openingId: 'job-2', status: 'OPEN' } as JobOpeningDto,
      { openingId: 'job-3', status: 'CLOSED' } as JobOpeningDto,
    ];

    const summary = buildPlacementOpportunitiesSummary(students, claims, openings, 24);
    expect(summary).toEqual({
      whitelisted: 2,
      fullyVerified: 1,
      activeOpenings: 2,
      totalApplications: 24,
    });
  });

  it('Th6-I603: ranks employer engagement by candidate application volume', () => {
    const employers: PlacementEmployerSummary[] = [
      {
        employerId: 'emp-1',
        institutionId: 'inst-1',
        name: 'Acme Corp',
        openingCount: 5,
        activeOpeningCount: 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        employerId: 'emp-2',
        institutionId: 'inst-1',
        name: 'Beta Systems',
        openingCount: 2,
        activeOpeningCount: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    const openings = [
      { openingId: 'job-1', employerId: 'emp-1' } as JobOpeningDto,
      { openingId: 'job-2', employerId: 'emp-1' } as JobOpeningDto,
      { openingId: 'job-3', employerId: 'emp-2' } as JobOpeningDto,
    ];
    const appCounts = new Map<string, number>([
      ['job-1', 10],
      ['job-2', 5],
      ['job-3', 20],
    ]);

    const employerAppMap = applicationCountByEmployerId(openings, appCounts);
    expect(employerAppMap.get('emp-1')).toBe(15);
    expect(employerAppMap.get('emp-2')).toBe(20);

    const rows = buildEmployerEngagementRows(employers, employerAppMap);
    expect(rows[0]?.employerName).toBe('Beta Systems');
    expect(rows[0]?.applications).toBe(20);
    expect(rows[1]?.employerName).toBe('Acme Corp');
    expect(rows[1]?.applications).toBe(15);
  });

  it('Th6-I604: exports verification by major dataset with UTF-8 BOM and escaped cells', () => {
    const appendChildSpy = vi
      .spyOn(document.body, 'appendChild')
      .mockImplementation((node) => node);
    const removeChildSpy = vi
      .spyOn(document.body, 'removeChild')
      .mockImplementation((node) => node);
    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    const rows = [
      {
        major: 'Data "AI" Science',
        whitelisted: 10,
        fullyVerified: 8,
        partial: 1,
        pending: 1,
        completionPct: 80,
      },
    ];

    const csvContent = toCsv(
      ['Major', 'Whitelisted', 'Fully verified', 'Partial', 'Pending', 'Completion %'],
      rows.map((r) => [
        r.major,
        r.whitelisted,
        r.fullyVerified,
        r.partial,
        r.pending,
        r.completionPct,
      ]),
    );

    expect(csvContent.startsWith('\uFEFF')).toBe(true);
    expect(csvContent).includes('"Data ""AI"" Science"');
    expect(csvContent).includes('"80"');

    exportVerificationByMajorCsv(rows);

    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(appendChildSpy).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalled();

    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
    createObjectURLSpy.mockRestore();
    revokeObjectURLSpy.mockRestore();
  });

  it('Th6-I605: formats placement opportunities summary report CSV', () => {
    const appendChildSpy = vi
      .spyOn(document.body, 'appendChild')
      .mockImplementation((node) => node);
    const removeChildSpy = vi
      .spyOn(document.body, 'removeChild')
      .mockImplementation((node) => node);
    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    exportPlacementOpportunitiesCsv({
      whitelisted: 500,
      fullyVerified: 400,
      activeOpenings: 15,
      totalApplications: 120,
    });

    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(appendChildSpy).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalled();

    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
    createObjectURLSpy.mockRestore();
    revokeObjectURLSpy.mockRestore();
  });

  it('Th6-I606: formats employer engagement report CSV', () => {
    const appendChildSpy = vi
      .spyOn(document.body, 'appendChild')
      .mockImplementation((node) => node);
    const removeChildSpy = vi
      .spyOn(document.body, 'removeChild')
      .mockImplementation((node) => node);
    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    exportEmployerEngagementCsv([
      { employerName: 'TechCorp', activeOpenings: 4, totalOpenings: 6, applications: 85 },
    ]);

    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(appendChildSpy).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalled();

    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
    createObjectURLSpy.mockRestore();
    revokeObjectURLSpy.mockRestore();
  });
});
