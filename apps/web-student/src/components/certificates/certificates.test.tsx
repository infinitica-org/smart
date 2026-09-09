import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CertificateGuidelinesBanner } from './certificate-guidelines-banner';
import { CertificateStatusStepper, getLifecycleStage } from './certificate-status-stepper';
import { CertificateDetailsForm } from './certificate-details-form';

describe('Student Certification UI Components', () => {
  describe('CertificateGuidelinesBanner', () => {
    it('renders educational notice regarding offer letters and non-certificate documents', () => {
      render(<CertificateGuidelinesBanner />);
      expect(screen.getByText('Certification Upload Guidelines')).toBeDefined();
      expect(screen.getByText('Not Accepted (Will Be Rejected)')).toBeDefined();
      expect(
        screen.getByText(/Offer letters, appointment letters, internship completion letters/i),
      ).toBeDefined();
    });
  });

  describe('CertificateStatusStepper', () => {
    it('correctly determines lifecycle stage for various statuses', () => {
      expect(getLifecycleStage('DECLARED', 'pending', false, false)).toBe('source check');
      expect(getLifecycleStage('UPLOADED', 'pending', true, false)).toBe('generate');
      expect(getLifecycleStage('UPLOADED', 'pending', true, true)).toBe('sit');
      expect(getLifecycleStage('REJECTED', 'source_failed')).toBe('retry');
      expect(getLifecycleStage('VERIFIED', 'source_verified')).toBe('verified');
      expect(getLifecycleStage('VOIDED', 'voided')).toBe('voided');
    });

    it('renders stepper steps and active stage indicator', () => {
      render(
        <CertificateStatusStepper status="IN_VERIFICATION" sourceStatus="pending" hasFileOrUrl />,
      );
      expect(screen.getByText('Certification Lifecycle')).toBeDefined();
      expect(screen.getByText('Source Check')).toBeDefined();
      expect(screen.getByText('Verified')).toBeDefined();
      expect(screen.getByText('Voided')).toBeDefined();
    });
  });

  describe('CertificateDetailsForm', () => {
    it('renders provider, title, cert number, dates, and verification url inputs', () => {
      render(<CertificateDetailsForm onSubmit={vi.fn()} />);
      expect(screen.getByLabelText(/Certification Provider/i)).toBeDefined();
      expect(screen.getByLabelText(/Certification Name/i)).toBeDefined();
      expect(screen.getByLabelText(/Certificate Number/i)).toBeDefined();
      expect(screen.getByLabelText(/Issue Date/i)).toBeDefined();
      expect(screen.getByLabelText(/Valid Through/i)).toBeDefined();
      expect(screen.getByLabelText(/Direct Verification \/ Source URL/i)).toBeDefined();
    });

    it('submits form with valid provider and title payload', () => {
      const handleSubmit = vi.fn();
      render(<CertificateDetailsForm onSubmit={handleSubmit} />);

      fireEvent.change(screen.getByLabelText(/Certification Provider/i), {
        target: { value: 'Amazon Web Services' },
      });
      fireEvent.change(screen.getByLabelText(/Certification Name/i), {
        target: { value: 'AWS Solutions Architect' },
      });
      fireEvent.change(screen.getByLabelText(/Certificate Number/i), {
        target: { value: 'AWS-998877' },
      });

      fireEvent.click(screen.getByText(/Continue to Next Step/i));

      expect(handleSubmit).toHaveBeenCalledWith({
        issuer: 'Amazon Web Services',
        title: 'AWS Solutions Architect',
        certificateNumber: 'AWS-998877',
        issueDate: undefined,
        expiryDate: undefined,
        verificationUrl: undefined,
      });
    });
  });
});
