import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FormErrorSummary, FormMessage, formatFieldValidationError, Input } from '../../index';

describe('Form Validation & Error Guidance Suite', () => {
  describe('formatFieldValidationError Helper', () => {
    it('returns actionable error messages for required, email, minLength, duplicate, and network rules', () => {
      expect(formatFieldValidationError('Email address', 'required')).toBe(
        'Email address is required. Please enter a value to continue.',
      );
      expect(formatFieldValidationError('Email address', 'email')).toBe(
        'Invalid email address format. Please enter a valid email address (e.g., user@organization.edu).',
      );
      expect(formatFieldValidationError('Password', 'minLength', { min: 8 })).toBe(
        'Password must be at least 8 characters long.',
      );
      expect(formatFieldValidationError('Email address', 'duplicate')).toBe(
        'This email address is already registered. Please enter a unique email address.',
      );
      expect(formatFieldValidationError('Profile', 'network')).toBe(
        "Connection failed while saving profile. Your entered information is preserved. Click 'Try again' to retry.",
      );
    });
  });

  describe('FormMessage Component', () => {
    it('renders role="alert" with AlertCircle icon and actionable text', () => {
      render(<FormMessage error="Email address is required. Please enter a value to continue." />);

      const alert = screen.getByRole('alert');
      expect(alert).toBeDefined();
      expect(alert.textContent).toBe(
        'Email address is required. Please enter a value to continue.',
      );
    });
  });

  describe('FormErrorSummary Component', () => {
    it('renders summary list of field errors with title and focuses input on item click', () => {
      render(
        <div>
          <FormErrorSummary
            title="Please fix 2 errors before submitting:"
            errors={{
              email: 'Invalid email address. Please enter a valid email address.',
              password: 'Password must be at least 8 characters long.',
            }}
          />
          <Input id="email" label="Email" />
          <Input id="password" label="Password" type="password" />
        </div>,
      );

      expect(screen.getByRole('alert')).toBeDefined();
      expect(screen.getByText('Please fix 2 errors before submitting:')).toBeDefined();

      const emailLink = screen.getByRole('button', {
        name: 'Invalid email address. Please enter a valid email address.',
      });
      expect(emailLink).toBeDefined();

      const emailInput = screen.getByLabelText('Email') as HTMLInputElement;
      const focusSpy = vi.spyOn(emailInput, 'focus');

      fireEvent.click(emailLink);
      expect(focusSpy).toHaveBeenCalled();
    });

    it('renders onRetry button for network/server failure recovery while preserving user inputs', () => {
      const handleRetry = vi.fn();
      render(
        <div>
          <FormErrorSummary
            title="Server Connection Error"
            errors="Connection timed out while saving student profile. Your entered data is preserved."
            onRetry={handleRetry}
          />
          <Input id="student-name" label="Student Name" defaultValue="Tino Britty" />
        </div>,
      );

      expect(screen.getByText(/Connection timed out/)).toBeDefined();
      expect((screen.getByLabelText('Student Name') as HTMLInputElement).value).toBe('Tino Britty');

      const retryBtn = screen.getByRole('button', { name: 'Try again' });
      fireEvent.click(retryBtn);
      expect(handleRetry).toHaveBeenCalledTimes(1);
    });
  });
});
