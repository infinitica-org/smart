export type ScoreUnit = 'percentage' | 'cgpa';

export const CUSTOM_OPTION = '__custom__';

export type ProgramLevel = 'ssc' | 'hsc' | 'degree';

export interface ProgramScoreUiConfig {
  level: ProgramLevel;
  scoreLabel: string;
  scoreHelper: string;
  allowUnitChoice: boolean;
  defaultUnit: ScoreUnit;
  showBacklogCheckbox: boolean;
}

const SSC_PROGRAMS = new Set(['10th Standard']);
const HSC_PROGRAMS = new Set(['12th Standard']);

export function resolveProgramDegree(programDegree: string, customProgramDegree: string): string {
  if (programDegree === CUSTOM_OPTION) return customProgramDegree.trim();
  return programDegree.trim();
}

export function programLevelForDegree(program: string): ProgramLevel {
  if (SSC_PROGRAMS.has(program)) return 'ssc';
  if (HSC_PROGRAMS.has(program)) return 'hsc';
  return 'degree';
}

export function programScoreUiConfig(program: string): ProgramScoreUiConfig {
  const level = programLevelForDegree(program);
  if (level === 'ssc') {
    return {
      level,
      scoreLabel: '10th (SSC) score',
      scoreHelper: 'Enter your 10th board percentage (0–100).',
      allowUnitChoice: false,
      defaultUnit: 'percentage',
      showBacklogCheckbox: false,
    };
  }
  if (level === 'hsc') {
    return {
      level,
      scoreLabel: '12th (HSC) score',
      scoreHelper: 'Enter your 12th board percentage (0–100).',
      allowUnitChoice: false,
      defaultUnit: 'percentage',
      showBacklogCheckbox: false,
    };
  }
  return {
    level: 'degree',
    scoreLabel: 'Academic score',
    scoreHelper: 'Enter the score exactly as shown by your institution.',
    allowUnitChoice: true,
    defaultUnit: 'cgpa',
    showBacklogCheckbox: true,
  };
}

/** True when program is one of the known catalog options or custom with non-empty text. */
export function isProgramSelected(programDegree: string, customProgramDegree: string): boolean {
  return Boolean(resolveProgramDegree(programDegree, customProgramDegree));
}

const KNOWN_PROGRAMS = [
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

export function isKnownProgram(program: string): boolean {
  return (KNOWN_PROGRAMS as readonly string[]).includes(program);
}
