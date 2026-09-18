import type { CandidateResumeFile, CandidateResumeStateResponse } from '@smart/contracts';
import { CANDIDATE_RESUME_FILES_MAX as contractResumeFilesMax } from '@smart/contracts';

/** Keep in sync with `@smart/contracts` — fallback when package dist is stale locally. */
export const CANDIDATE_RESUME_FILES_MAX = contractResumeFilesMax ?? 5;

export function normalizeResumeFiles(state: CandidateResumeStateResponse): CandidateResumeFile[] {
  if (state.resumeFiles?.length) return state.resumeFiles;
  if (state.resumeFile) return [state.resumeFile];
  return [];
}

export function canAddResume(files: CandidateResumeFile[]): boolean {
  return files.length < CANDIDATE_RESUME_FILES_MAX;
}

export function formatResumeSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}
