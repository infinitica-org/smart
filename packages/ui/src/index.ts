/**
 * @smart/ui — SMART design system.
 *
 * Consumed as source via Next `transpilePackages`. Do not add a runtime build
 * step here; the four web apps compile this with their own bundler.
 *
 * Owner: Satheswaran V.
 */

export { cn } from './lib/cn.js';
export { Button, type ButtonProps, type ButtonSize, type ButtonVariant } from './components/button.js';
export { TierBadge, type TierBadgeProps } from './components/badge.js';
export { Card, CardDescription, CardHeader, CardTitle } from './components/card.js';
export { Input, type InputProps } from './components/input.js';
export { Alert, type AlertProps, type AlertTone } from './components/alert.js';
export { LevelStepper, type LevelState, type LevelStepperProps } from './components/level-stepper.js';
export { AppShell, type AppShellProps } from './components/app-shell.js';

export const UI_VERSION = '0.1.0';
