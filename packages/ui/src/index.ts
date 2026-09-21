/**
 * @smart/ui — SMART design system.
 *
 * Consumed as source via Next `transpilePackages`. Do not add a runtime build
 * step here; the four web apps compile this with their own bundler.
 *
 * Shadcn primitives live under subpaths (`@smart/ui/button`, `@smart/ui/sidebar`)
 * so they do not collide with the SMART Button / Card / Alert used by existing
 * portals. Shared theme + `bg-background` / `text-foreground` tokens ship via
 * `@smart/ui/styles.css`.
 *
 * Owner: Satheswaran V.
 */

export { cn, getInitials } from './lib/cn';
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
export { ProficiencyLevelHint } from './components/proficiency-level-hint';
export { AppShell, type AppShellProps } from './components/app-shell';
export {
  SmartLogo,
  type SmartLogoKind,
  type SmartLogoProps,
  type SmartLogoTone,
  SMART_MARK_TEAL,
} from './components/smart-logo';
export { SignOutButton, type SignOutButtonProps } from './components/sign-out-button';
export { SessionBootstrap } from './session-bootstrap';
export { SessionHoldWall } from './components/session-hold-wall';
export { RolesGuard, type RolesGuardProps } from './roles-guard';
export { ForbiddenWall, NotFoundWall } from './components/status-walls';
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

export { MagicCard, type MagicCardProps } from './components/magic/magic-card';
export { ShineBorder, type ShineBorderProps } from './components/magic/shine-border';
export { NumberTicker, type NumberTickerProps } from './components/magic/number-ticker';
export { BorderBeam, type BorderBeamProps } from './components/magic/border-beam';
export {
  AnimatedCircularProgressBar,
  type AnimatedCircularProgressBarProps,
} from './components/magic/animated-circular-progress-bar';
export {
  AnimatedGridPattern,
  type AnimatedGridPatternProps,
} from './components/magic/animated-grid-pattern';
export {
  AnimatedShinyText,
  type AnimatedShinyTextProps,
} from './components/magic/animated-shiny-text';
export {
  AnimatedList,
  AnimatedListItem,
  type AnimatedListProps,
} from './components/magic/animated-list';
export { KpiCard, type KpiCardProps } from './components/dashboard/kpi-card';
export {
  FunnelPipeline,
  ProgressList,
  type FunnelStep,
} from './components/dashboard/funnel-pipeline';
export {
  ReadinessOverview,
  DashboardPanel,
  type RingLegendItem,
} from './components/dashboard/readiness-overview';
export {
  ConsoleShell,
  ConsolePromoCard,
  type ConsoleNavItem,
  type ConsoleShellProps,
} from './components/dashboard/console-shell';

export {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarBadge,
} from './components/ui/avatar';

export const UI_VERSION = '0.1.0';
