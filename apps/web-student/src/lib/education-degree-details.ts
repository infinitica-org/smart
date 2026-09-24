import type { CandidateDegreeDetailsDto, CandidateEducationDto } from '@smart/contracts';
import { programLevelForDegree } from './education-form-program';

export const DEFAULT_SEMESTERS_PER_YEAR = 2;

/** Typical program length when start/end years are missing. */
export const PROGRAM_DURATION_YEARS: Record<string, number> = {
  Diploma: 3,
  Certificate: 1,
  'B.Tech': 4,
  'B.E.': 4,
  'B.Sc': 3,
  BCA: 3,
  BBA: 3,
  'B.Com': 3,
  'M.Tech': 2,
  'M.Sc': 2,
  MCA: 2,
  MBA: 2,
  'Ph.D': 3,
};

export interface DegreeSemesterFormRow {
  performance: string;
  backlogsTotal: string;
  backlogsOngoing: string;
}

export interface DegreeDetailsFormSlice {
  rollNumber: string;
  currentSemester: string;
  semestersPerYear: string;
  lateralEntry: boolean;
  courseNotes: string;
  hasCourseBacklog: boolean;
  semesterRows: DegreeSemesterFormRow[];
}

export function emptyDegreeDetailsFormSlice(): DegreeDetailsFormSlice {
  return {
    rollNumber: '',
    currentSemester: '',
    semestersPerYear: String(DEFAULT_SEMESTERS_PER_YEAR),
    lateralEntry: false,
    courseNotes: '',
    hasCourseBacklog: false,
    semesterRows: [],
  };
}

function parseYear(value: string): number | null {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
}

export function computeCourseDurationYears(
  program: string,
  startYear: string,
  endYear: string,
  currentlyStudying: boolean,
): number {
  const start = parseYear(startYear);
  const end = parseYear(endYear);
  if (start !== null && end !== null && end >= start) {
    return Math.max(1, end - start);
  }
  if (start !== null && currentlyStudying) {
    const now = new Date().getFullYear();
    return Math.max(1, now - start + 1);
  }
  return PROGRAM_DURATION_YEARS[program] ?? 4;
}

export function computeTotalSemesters(input: {
  program: string;
  startYear: string;
  endYear: string;
  currentlyStudying: boolean;
  semestersPerYear: number;
  lateralEntry: boolean;
}): number {
  const perYear = Math.min(4, Math.max(1, input.semestersPerYear || DEFAULT_SEMESTERS_PER_YEAR));
  // A course never has more semesters than its standard duration, whatever years were typed.
  const standardYears = PROGRAM_DURATION_YEARS[input.program];
  const enteredYears = computeCourseDurationYears(
    input.program,
    input.startYear,
    input.endYear,
    input.currentlyStudying,
  );
  const years = standardYears === undefined ? enteredYears : Math.min(enteredYears, standardYears);
  let total = years * perYear;
  if (input.lateralEntry && total > perYear) {
    total -= perYear;
  }
  return Math.min(24, Math.max(1, total));
}

export function syncSemesterRows(
  targetCount: number,
  existing: DegreeSemesterFormRow[],
): DegreeSemesterFormRow[] {
  const rows: DegreeSemesterFormRow[] = [];
  for (let i = 0; i < targetCount; i += 1) {
    rows.push(
      existing[i] ?? {
        performance: '',
        backlogsTotal: '0',
        backlogsOngoing: '0',
      },
    );
  }
  return rows;
}

export function degreeDetailsFromDto(
  dto: CandidateEducationDto | null | undefined,
): DegreeDetailsFormSlice {
  const base = emptyDegreeDetailsFormSlice();
  const details = dto?.degreeDetails;
  if (!details) return base;

  return {
    rollNumber: details.rollNumber ?? '',
    currentSemester: details.currentSemester ? String(details.currentSemester) : '',
    semestersPerYear: String(details.semestersPerYear ?? DEFAULT_SEMESTERS_PER_YEAR),
    lateralEntry: details.lateralEntry === true,
    courseNotes: details.notes ?? '',
    hasCourseBacklog: details.hasBacklog === true,
    semesterRows: (details.semesters ?? []).map((row) => ({
      performance:
        row.performancePercent != null && !Number.isNaN(row.performancePercent)
          ? String(row.performancePercent)
          : '',
      backlogsTotal:
        row.backlogsTotal != null && !Number.isNaN(row.backlogsTotal)
          ? String(row.backlogsTotal)
          : '0',
      backlogsOngoing:
        row.backlogsOngoing != null && !Number.isNaN(row.backlogsOngoing)
          ? String(row.backlogsOngoing)
          : '0',
    })),
  };
}

function parseOptionalPercent(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (Number.isNaN(n) || n < 0 || n > 100) return null;
  return n;
}

function parseOptionalInt(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number.parseInt(trimmed, 10);
  if (Number.isNaN(n) || n < 0) return null;
  return n;
}

export function buildDegreeDetailsPayload(
  program: string,
  slice: DegreeDetailsFormSlice,
  startYear: string,
  endYear: string,
  currentlyStudying: boolean,
  overallScorePercent?: number | null,
): CandidateDegreeDetailsDto | null {
  if (programLevelForDegree(program) !== 'degree') return null;

  const semestersPerYear = Math.min(
    4,
    Math.max(1, parseOptionalInt(slice.semestersPerYear) ?? DEFAULT_SEMESTERS_PER_YEAR),
  );
  const total = computeTotalSemesters({
    program,
    startYear,
    endYear,
    currentlyStudying,
    semestersPerYear,
    lateralEntry: slice.lateralEntry,
  });
  const rows = syncSemesterRows(total, slice.semesterRows);

  const semesters = rows.map((row, index) => ({
    semester: index + 1,
    performancePercent: parseOptionalPercent(row.performance),
    backlogsTotal: parseOptionalInt(row.backlogsTotal) ?? 0,
    backlogsOngoing: parseOptionalInt(row.backlogsOngoing) ?? 0,
  }));

  const currentSemester = parseOptionalInt(slice.currentSemester);

  return {
    rollNumber: slice.rollNumber.trim() || undefined,
    currentSemester: currentSemester ?? undefined,
    semestersPerYear,
    lateralEntry: slice.lateralEntry,
    overallScorePercent: overallScorePercent ?? undefined,
    notes: slice.courseNotes.trim() || undefined,
    hasBacklog: slice.hasCourseBacklog || undefined,
    semesters,
  };
}

export function validateDegreeDetailsForm(
  program: string,
  slice: DegreeDetailsFormSlice,
  startYear: string,
  endYear: string,
  currentlyStudying: boolean,
): string | null {
  if (programLevelForDegree(program) !== 'degree') return null;
  if (!slice.rollNumber.trim()) {
    return 'Institute roll number is required for college programs.';
  }
  const current = parseOptionalInt(slice.currentSemester);
  const total = computeTotalSemesters({
    program,
    startYear,
    endYear,
    currentlyStudying,
    semestersPerYear: parseOptionalInt(slice.semestersPerYear) ?? DEFAULT_SEMESTERS_PER_YEAR,
    lateralEntry: slice.lateralEntry,
  });
  if (!current || current < 1 || current > total) {
    return `Select your current semester (1–${total}).`;
  }
  return null;
}
