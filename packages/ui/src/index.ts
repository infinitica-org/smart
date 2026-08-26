/**
 * @smart/ui — SMART design system.
 *
 * Consumed as source via Next `transpilePackages`. Do not add a runtime build
 * step here; the four web apps compile this with their own bundler.
 *
 * Owner: Satheswaran V.
 */

export { cn } from './lib/cn';
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
export { SessionBootstrap } from './session-bootstrap';
export * from './api-provider';

export const UI_VERSION = '0.1.0';
