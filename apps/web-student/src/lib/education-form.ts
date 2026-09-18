import type { CandidateDegreeDetailsDto, CandidateEducationDto } from '@smart/contracts';

import {
  buildDegreeDetailsPayload,
  degreeDetailsFromDto,
  emptyDegreeDetailsFormSlice,
  validateDegreeDetailsForm,
  type DegreeDetailsFormSlice,
} from './education-degree-details';
import {
  CUSTOM_OPTION,
  programLevelForDegree,
  programScoreUiConfig,
  resolveProgramDegree,
  type ScoreUnit,
} from './education-form-program';

export type { DegreeDetailsFormSlice };

export const PROGRAM_DEGREE_OPTIONS = [
  '10th Standard',
  '12th Standard',
  'Diploma',
  'Certificate',
  'B.Tech',
  'B.E.',
  'B.Sc',
  'BCA',
  'BBA',
  'B.Com',
  'M.Tech',
  'M.Sc',
  'MCA',
  'MBA',
  'Ph.D',
] as const;

export const BOARD_UNIVERSITY_OPTIONS = [
  'CBSE',
  'ICSE',
  'State Board',
  'VTU',
  'Anna University',
  'Mumbai University',
  'Delhi University',
  'JNTU',
] as const;

export const BRANCH_SPECIALIZATION_OPTIONS = [
  'Computer Science',
  'Information Technology',
  'Electronics & Communication',
  'Mechanical Engineering',
  'Electrical Engineering',
  'Civil Engineering',
  'Business Administration',
  'Finance',
  'Commerce',
] as const;

export const EDUCATION_TYPE_OPTIONS = [
  'Full-time',
  'Part-time',
  'Distance learning',
  'Online',
] as const;

export { CUSTOM_OPTION } from './education-form-program';
export type { ScoreUnit } from './education-form-program';

export interface EducationFormValues {
  schoolInstitutionName: string;
  programDegree: string;
  customProgramDegree: string;
  boardUniversity: string;
  customBoardUniversity: string;
  branchSpecialization: string;
  customBranchSpecialization: string;
  startYear: string;
  endYear: string;
  currentlyStudying: boolean;
  educationType: string;
  score: string;
  scoreUnit: ScoreUnit;
  hasActiveBacklog: boolean;
  degreeDetails: DegreeDetailsFormSlice;
  /** Optional marksheet / transcript uploaded with the same save action. */
  courseProofFile: File | null;
}

export function emptyEducationFormValues(): EducationFormValues {
  return {
    schoolInstitutionName: '',
    programDegree: '',
    customProgramDegree: '',
    boardUniversity: '',
    customBoardUniversity: '',
    branchSpecialization: '',
    customBranchSpecialization: '',
    startYear: '',
    endYear: '',
    currentlyStudying: false,
    educationType: '',
    score: '',
    scoreUnit: 'cgpa',
    hasActiveBacklog: false,
    degreeDetails: emptyDegreeDetailsFormSlice(),
    courseProofFile: null,
  };
}

export function applyAcademicScoresToForm(
  values: EducationFormValues,
  scores:
    | {
        cgpa?: number | null;
        sscPercentage?: number | null;
        hscPercentage?: number | null;
        hasActiveBacklog?: boolean | null;
      }
    | undefined
    | null,
): EducationFormValues {
  if (!scores) return values;

  const program = resolveProgramDegree(values.programDegree, values.customProgramDegree);
  const level = program ? programLevelForDegree(program) : null;

  let score = values.score;
  let scoreUnit = values.scoreUnit;

  if (!score.trim() && level) {
    if (level === 'ssc' && scores.sscPercentage != null) {
      score = String(scores.sscPercentage);
      scoreUnit = 'percentage';
    } else if (level === 'hsc' && scores.hscPercentage != null) {
      score = String(scores.hscPercentage);
      scoreUnit = 'percentage';
    } else if (level === 'degree' && scores.cgpa != null) {
      score = String(scores.cgpa);
      scoreUnit = 'cgpa';
    }
  }

  return {
    ...values,
    score,
    scoreUnit,
    hasActiveBacklog: scores.hasActiveBacklog === true,
  };
}

export function buildAcademicScoresPayload(values: EducationFormValues): {
  cgpa?: number;
  sscPercentage?: number;
  hscPercentage?: number;
  hasActiveBacklog?: boolean;
} | null {
  const program = resolveProgramDegree(values.programDegree, values.customProgramDegree);
  if (!program) return null;

  const level = programLevelForDegree(program);
  const payload: {
    cgpa?: number;
    sscPercentage?: number;
    hscPercentage?: number;
    hasActiveBacklog?: boolean;
  } = {};

  if (values.hasActiveBacklog && level === 'degree') {
    payload.hasActiveBacklog = true;
  }

  if (!values.score.trim()) {
    return Object.keys(payload).length > 0 ? payload : null;
  }

  const numeric = Number(values.score);
  if (Number.isNaN(numeric)) {
    throw new Error('Academic score must be a valid number.');
  }

  if (level === 'ssc') {
    if (numeric < 0 || numeric > 100) {
      throw new Error('10th percentage must be between 0 and 100.');
    }
    payload.sscPercentage = numeric;
    return payload;
  }

  if (level === 'hsc') {
    if (numeric < 0 || numeric > 100) {
      throw new Error('12th percentage must be between 0 and 100.');
    }
    payload.hscPercentage = numeric;
    return payload;
  }

  if (values.scoreUnit === 'cgpa') {
    if (numeric < 0 || numeric > 10) {
      throw new Error('CGPA must be a number between 0 and 10.');
    }
    payload.cgpa = numeric;
  }

  if (values.hasActiveBacklog) {
    payload.hasActiveBacklog = true;
  }

  return Object.keys(payload).length > 0 ? payload : null;
}

export function validateScoreForProgram(values: EducationFormValues): string | null {
  const program = resolveProgramDegree(values.programDegree, values.customProgramDegree);
  if (!program) return null;

  if (!values.score.trim()) {
    return `${programScoreUiConfig(program).scoreLabel} is required.`;
  }

  try {
    buildAcademicScoresPayload(values);
  } catch (error) {
    return error instanceof Error ? error.message : 'Invalid academic score.';
  }
  return null;
}

function resolveSelectValue(selected: string, custom: string): string {
  if (selected === CUSTOM_OPTION) return custom.trim();
  return selected.trim();
}

function yearFromDate(value: string | null | undefined): string {
  if (!value) return '';
  const match = /^(\d{4})/u.exec(value);
  return match?.[1] ?? '';
}

function parseGrade(value: string | null | undefined): { score: string; scoreUnit: ScoreUnit } {
  const raw = value?.trim() ?? '';
  if (!raw) return { score: '', scoreUnit: 'percentage' };
  if (/cgpa/i.test(raw)) {
    return { score: raw.replace(/\s*cgpa\s*/giu, '').trim(), scoreUnit: 'cgpa' };
  }
  return { score: raw.replace(/%/gu, '').trim(), scoreUnit: 'percentage' };
}

export function educationDtoToFormValues(item: CandidateEducationDto): EducationFormValues {
  const institutionParts = item.institutionName.includes(' · ')
    ? item.institutionName.split(' · ', 2)
    : [item.institutionName, ''];
  const school = institutionParts[0] ?? '';
  const boardFromInstitution = institutionParts[1] ?? '';

  let educationType = '';
  let programDegree = item.degree ?? '';
  if (programDegree.includes(' — ')) {
    const [type, program] = programDegree.split(' — ', 2);
    educationType = type ?? '';
    programDegree = program ?? '';
  }

  const programInList = (PROGRAM_DEGREE_OPTIONS as readonly string[]).includes(programDegree);
  const boardInList = (BOARD_UNIVERSITY_OPTIONS as readonly string[]).includes(
    boardFromInstitution,
  );
  const branch = item.fieldOfStudy ?? '';
  const branchInList = (BRANCH_SPECIALIZATION_OPTIONS as readonly string[]).includes(branch);
  const { score, scoreUnit } = parseGrade(item.grade);

  const degreeSlice = degreeDetailsFromDto(item);

  return {
    schoolInstitutionName: school.trim(),
    programDegree: programInList ? programDegree : programDegree ? CUSTOM_OPTION : '',
    customProgramDegree: programInList ? '' : programDegree,
    boardUniversity: boardInList ? boardFromInstitution : boardFromInstitution ? CUSTOM_OPTION : '',
    customBoardUniversity: boardInList ? '' : boardFromInstitution,
    branchSpecialization: branchInList ? branch : branch ? CUSTOM_OPTION : '',
    customBranchSpecialization: branchInList ? '' : branch,
    startYear: yearFromDate(item.startDate),
    endYear: yearFromDate(item.endDate),
    currentlyStudying: Boolean(item.current),
    educationType,
    score,
    scoreUnit,
    hasActiveBacklog: item.degreeDetails?.hasBacklog === true,
    degreeDetails: degreeSlice,
    courseProofFile: null,
  };
}

export interface EducationFormPayload {
  institutionName: string;
  degree: string;
  fieldOfStudy?: string;
  startDate?: string;
  endDate?: string;
  current: boolean;
  grade?: string;
  degreeDetails?: CandidateDegreeDetailsDto | null;
}

export function educationFormToPayload(values: EducationFormValues): EducationFormPayload {
  const program = resolveSelectValue(values.programDegree, values.customProgramDegree);
  const board = resolveSelectValue(values.boardUniversity, values.customBoardUniversity);
  const branch = resolveSelectValue(values.branchSpecialization, values.customBranchSpecialization);

  let institutionName = values.schoolInstitutionName.trim();
  if (board) {
    institutionName = `${institutionName} · ${board}`;
  }

  let degree = program;
  if (values.educationType.trim()) {
    degree = `${values.educationType.trim()} — ${degree}`;
  }

  const score = values.score.trim();
  const grade = score
    ? values.scoreUnit === 'percentage'
      ? `${score}%`
      : `${score} CGPA`
    : undefined;

  let degreeDetails: CandidateDegreeDetailsDto | null = null;
  if (programLevelForDegree(program) === 'degree') {
    const slice = {
      ...values.degreeDetails,
      hasCourseBacklog: values.degreeDetails.hasCourseBacklog || values.hasActiveBacklog,
    };
    const percent =
      values.scoreUnit === 'percentage' && values.score.trim() ? Number(values.score) : undefined;
    degreeDetails = buildDegreeDetailsPayload(
      program,
      slice,
      values.startYear,
      values.endYear,
      values.currentlyStudying,
      percent != null && !Number.isNaN(percent) ? percent : undefined,
    );
  }

  return {
    institutionName,
    degree,
    fieldOfStudy: branch || undefined,
    startDate: values.startYear ? `${values.startYear}-01-01` : undefined,
    endDate: values.currentlyStudying
      ? undefined
      : values.endYear
        ? `${values.endYear}-01-01`
        : undefined,
    current: values.currentlyStudying,
    grade,
    degreeDetails,
  };
}

export function validateEducationForm(values: EducationFormValues): string | null {
  if (!values.schoolInstitutionName.trim()) {
    return 'School/Institution name is required.';
  }
  const program = resolveSelectValue(values.programDegree, values.customProgramDegree);
  if (!program) return 'Program/Degree is required.';
  const board = resolveSelectValue(values.boardUniversity, values.customBoardUniversity);
  if (!board) return 'Board/University is required.';
  if (!values.startYear.trim()) return 'Start year is required.';
  if (!values.currentlyStudying && !values.endYear.trim()) return 'End year is required.';
  if (!values.educationType.trim()) return 'Study mode is required.';
  const scoreError = validateScoreForProgram(values);
  if (scoreError) return scoreError;
  const degreeError = validateDegreeDetailsForm(
    program,
    values.degreeDetails,
    values.startYear,
    values.endYear,
    values.currentlyStudying,
  );
  if (degreeError) return degreeError;
  return null;
}
