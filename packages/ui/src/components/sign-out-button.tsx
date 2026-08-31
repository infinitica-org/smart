'use client';

import { Button, type ButtonProps } from './button';

export interface SignOutButtonProps extends Omit<ButtonProps, 'onClick' | 'type'> {
  onSignOut: () => void | Promise<void>;
}

export function SignOutButton({
  onSignOut,
  variant = 'ghost',
  size = 'sm',
  children = 'Sign out',
  ...props
}: SignOutButtonProps) {
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={() => {
        void onSignOut();
      }}
      {...props}
    >
      {children}
    </Button>
  );
}
