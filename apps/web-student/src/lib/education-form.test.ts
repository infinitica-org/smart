import { describe, expect, it } from 'vitest';
import {
  buildAcademicScoresPayload,
  educationDtoToFormValues,
  educationFormToPayload,
  emptyEducationFormValues,
  validateEducationForm,
} from './education-form';

describe('educationFormToPayload', () => {
  it('maps the reference-style fields onto the education API shape', () => {
    const payload = educationFormToPayload({
      ...emptyEducationFormValues(),
      schoolInstitutionName: 'RV College of Engineering',
      programDegree: 'B.Tech',
      boardUniversity: 'VTU',
      branchSpecialization: 'Computer Science',
      startYear: '2020',
      endYear: '2024',
      educationType: 'Full-time',
      score: '8.6',
      scoreUnit: 'cgpa',
    });

    expect(payload).toMatchObject({
      institutionName: 'RV College of Engineering · VTU',
      degree: 'Full-time — B.Tech',
      fieldOfStudy: 'Computer Science',
      startDate: '2020-01-01',
      endDate: '2024-01-01',
      current: false,
      grade: '8.6 CGPA',
    });
    expect(payload.degreeDetails).toBeDefined();
    expect(payload.degreeDetails?.semesters?.length).toBeGreaterThan(0);
  });
});

describe('educationDtoToFormValues', () => {
  it('round-trips encoded institution, degree, and grade fields', () => {
    const values = educationDtoToFormValues({
      id: '1',
      studentId: 's1',
      institutionName: 'MIT · CBSE',
      degree: 'Full-time — B.Tech',
      fieldOfStudy: 'Computer Science',
      startDate: '2020-09-01',
      endDate: '2024-06-01',
      current: false,
      grade: '92%',
      status: 'unverified',
      documents: [],
      createdAt: '',
      updatedAt: '',
    });

    expect(values.schoolInstitutionName).toBe('MIT');
    expect(values.boardUniversity).toBe('CBSE');
    expect(values.programDegree).toBe('B.Tech');
    expect(values.educationType).toBe('Full-time');
    expect(values.startYear).toBe('2020');
    expect(values.score).toBe('92');
    expect(values.scoreUnit).toBe('percentage');
  });
});

describe('validateEducationForm', () => {
  it('requires core reference fields', () => {
    expect(validateEducationForm(emptyEducationFormValues())).toMatch(/School/i);
  });
});

describe('buildAcademicScoresPayload', () => {
  it('syncs only SSC profile score for 10th entries', () => {
    expect(
      buildAcademicScoresPayload({
        ...emptyEducationFormValues(),
        programDegree: '10th Standard',
        score: '92',
        scoreUnit: 'percentage',
      }),
    ).toEqual({ sscPercentage: 92 });
  });

  it('syncs CGPA profile score for degree entries when unit is CGPA', () => {
    expect(
      buildAcademicScoresPayload({
        ...emptyEducationFormValues(),
        programDegree: 'B.Tech',
        score: '8.5',
        scoreUnit: 'cgpa',
        hasActiveBacklog: true,
      }),
    ).toEqual({ cgpa: 8.5, hasActiveBacklog: true });
  });
});
