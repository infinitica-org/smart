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
export {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  type CardVariant,
  type CardProps,
} from './components/card';
export { AppliedBadge, type AppliedBadgeProps } from './components/applied-badge';
export {
  VerifiedBadge,
  verifiedTooltip,
  type VerifiedBadgeProps,
} from './components/verified-badge';
export { StatusBadge, type WorkflowStatus, type StatusBadgeProps } from './components/status-badge';
export { Modal, type ModalSize, type ModalProps } from './components/modal';
export {
  ConfirmDialog,
  type ConfirmDialogVariant,
  type ConfirmDialogProps,
} from './components/confirm-dialog';
export {
  FormItem,
  FormLabel,
  FormDescription,
  FormMessage,
  FormSection,
  FormErrorSummary,
  formatFieldValidationError,
  type FormItemProps,
  type FormLabelProps,
  type FormDescriptionProps,
  type FormMessageProps,
  type FormSectionProps,
  type FormErrorSummaryProps,
  type ValidationRule,
} from './components/form-controls';
export { Input, type InputProps } from './components/input';
export { Alert, type AlertProps, type AlertTone } from './components/alert';
export { LevelStepper, type LevelState, type LevelStepperProps } from './components/level-stepper';
export { ProficiencyLevelHint } from './components/proficiency-level-hint';
export { AppShell, type AppShellProps } from './components/app-shell';
export { Breadcrumbs, type BreadcrumbItem, type BreadcrumbsProps } from './components/breadcrumbs';
export { UserMenu, type UserMenuProps } from './components/user-menu';
export {
  LoadingState,
  EmptyState,
  ErrorState,
  SuccessState,
  UnauthorizedState,
  AsyncStateContainer,
  type LoadingStateProps,
  type EmptyStateProps,
  type ErrorStateProps,
  type SuccessStateProps,
  type UnauthorizedStateProps,
  type AsyncStateContainerProps,
} from './components/common-states';
export * from './navigation/role-nav-config';
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

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from './components/ui/table';

export const UI_VERSION = '0.1.0';

/* COM-01 — direct messaging (Th6-422 to Th6-430). */
export { MessagesWorkspace, type MessagesWorkspaceProps } from './messaging/messages-workspace';
export {
  StartConversationDialog,
  type StartConversationDialogProps,
} from './messaging/start-conversation-dialog';
export { ReportMessageDialog } from './messaging/report-message-dialog';
export { ReportedConversationView } from './messaging/reported-conversation-view';
export { useUnreadMessageCount, MessageText, SnippetText } from './messaging/messaging-utils';
