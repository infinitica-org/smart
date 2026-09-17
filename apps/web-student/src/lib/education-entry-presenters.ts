import type { CandidateEducationDto } from '@smart/contracts';

const PROGRAM_DISPLAY: Record<string, string> = {
  '10th Standard': 'Secondary (10th)',
  '12th Standard': 'Higher Secondary (12th)',
};

export interface ParsedEducationDisplay {
  programTitle: string;
  schoolName: string;
  boardName: string;
  studyMode: string;
  dateRangeLabel: string;
  streamLabel: string;
  scoreSummary: string;
  finalScore: string;
  scoreKind: 'percentage' | 'cgpa' | 'text';
}

function splitInstitution(institutionName: string): { school: string; board: string } {
  if (institutionName.includes(' · ')) {
    const [school, board] = institutionName.split(' · ', 2);
    return { school: school?.trim() ?? institutionName, board: board?.trim() ?? '' };
  }
  return { school: institutionName, board: '' };
}

function splitDegree(degree: string | null | undefined): { studyMode: string; program: string } {
  const raw = degree?.trim() ?? '';
  if (raw.includes(' — ')) {
    const [studyMode, program] = raw.split(' — ', 2);
    return { studyMode: studyMode?.trim() ?? '', program: program?.trim() ?? raw };
  }
  return { studyMode: '', program: raw };
}

function formatMonthYear(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const match = /^(\d{4})/u.exec(iso);
  if (!match) return null;
  return `Jan ${match[1]}`;
}

export function parseEducationDisplay(edu: CandidateEducationDto): ParsedEducationDisplay {
  const { school, board } = splitInstitution(edu.institutionName);
  const { studyMode, program } = splitDegree(edu.degree);
  const programTitle = (PROGRAM_DISPLAY[program] ?? program) || 'Education';

  const start = formatMonthYear(edu.startDate);
  const end = edu.current ? 'Present' : formatMonthYear(edu.endDate);
  const dateRangeLabel =
    start && end
      ? `${start} - ${end}`
      : start
        ? `${start} - Present`
        : end
          ? end
          : 'Dates not added';

  const streamLabel = edu.fieldOfStudy?.trim() || studyMode || 'General';

  const grade = edu.grade?.trim() ?? '';
  let scoreKind: ParsedEducationDisplay['scoreKind'] = 'text';
  let finalScore = '—';
  let scoreSummary = 'Score not added';

  if (grade) {
    if (/cgpa/i.test(grade)) {
      scoreKind = 'cgpa';
      finalScore = grade.replace(/\s*cgpa\s*/giu, '').trim();
      scoreSummary = `CGPA: ${finalScore}`;
    } else if (grade.includes('%')) {
      scoreKind = 'percentage';
      finalScore = grade.replace(/%/gu, '').trim();
      scoreSummary = `Percentage: ${finalScore}%`;
    } else {
      finalScore = grade;
      scoreSummary = `Score: ${grade}`;
    }
  }

  return {
    programTitle,
    schoolName: school,
    boardName: board,
    studyMode,
    dateRangeLabel,
    streamLabel,
    scoreSummary,
    finalScore: scoreKind === 'percentage' ? `${finalScore}%` : finalScore,
    scoreKind,
  };
}

export { EDUCATION_CARD_ACCENTS } from '@/lib/student-bento-accents';
