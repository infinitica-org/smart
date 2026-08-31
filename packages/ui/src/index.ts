/**
 * @smart/ui — SMART design system.
 *
 * Consumed as source via Next `transpilePackages`. Do not add a runtime build
 * step here; the four web apps compile this with their own bundler.
 *
 * Owner: Satheswaran V.
 */

export { cn } from './lib/cn';
/** Apply on `<html>` in every portal so class-based `dark:` utilities match the product theme. */
export const SMART_HTML_CLASS = 'dark';
export { Button, type ButtonProps, type ButtonSize, type ButtonVariant } from './components/button';
export {
  TierBadge,
  type TierBadgeProps,
  Badge,
  type BadgeProps,
  type BadgeVariant,
} from './components/badge';
export { Card, CardDescription, CardHeader, CardTitle } from './components/card';
export { Input, type InputProps } from './components/input';
export { Alert, type AlertProps, type AlertTone } from './components/alert';
export { LevelStepper, type LevelState, type LevelStepperProps } from './components/level-stepper';
export { AppShell, type AppShellProps } from './components/app-shell';
export { SignOutButton, type SignOutButtonProps } from './components/sign-out-button';
export { SessionBootstrap } from './session-bootstrap';
export { ConfidenceNote, type ConfidenceNoteProps } from './components/confidence-note';
export { Timer, type TimerProps } from './components/timer';
export { CodeEditor, type CodeEditorProps } from './components/code-editor';
export { AudioRecorder, type AudioRecorderProps } from './components/audio-recorder';
export { TierTrail, type TierTrailProps } from './components/tier-trail';
export { AssessmentHeader, type AssessmentHeaderProps } from './components/assessment-header';
export { QuestionCard, type QuestionCardProps } from './components/question-card';
export { AnswerOption, type AnswerOptionProps } from './components/answer-option';
export { ProgressIndicator, type ProgressIndicatorProps } from './components/progress-indicator';
export {
  AssessmentNavigation,
  type AssessmentNavigationProps,
} from './components/assessment-navigation';
export * from './api-provider';

export {
  VerificationBadge,
  type VerificationBadgeProps,
  type VerificationState,
} from './components/verification-badge';
export {
  AiExplanationPanel,
  type AiExplanationPanelProps,
} from './components/ai-explanation-panel';
export {
  PipelineStageBar,
  type PipelineStage,
  type PipelineStageBarProps,
} from './components/pipeline-stage-bar';
export {
  CandidateProfileCard,
  type CandidateSkill,
  type CandidateProject,
  type CandidateProfileCardProps,
} from './components/candidate-profile-card';

export const UI_VERSION = '0.1.0';
