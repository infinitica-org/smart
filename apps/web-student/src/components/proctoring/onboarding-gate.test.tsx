import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  consent: vi.fn(),
  precheck: vi.fn(),
  enrollFace: vi.fn(),
  liveness: vi.fn(),
  requestProctoringMedia: vi.fn(),
  sampleEnvironment: vi.fn(),
}));

vi.mock('../../lib/api', () => ({
  api: {
    proctoring: {
      consent: (...args: unknown[]) => mocks.consent(...args),
      precheck: (...args: unknown[]) => mocks.precheck(...args),
      enrollFace: (...args: unknown[]) => mocks.enrollFace(...args),
      liveness: (...args: unknown[]) => mocks.liveness(...args),
    },
  },
}));

vi.mock('../../lib/proctoring/media', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/proctoring/media')>();
  return {
    ...actual,
    requestProctoringMedia: (...args: unknown[]) => mocks.requestProctoringMedia(...args),
    sampleEnvironment: (...args: unknown[]) => mocks.sampleEnvironment(...args),
  };
});

import { OnboardingGate } from './onboarding-gate';

const ATTEMPT = '0971c53e-649b-427e-b00d-12f5988a68ba';

describe('OnboardingGate', () => {
  beforeEach(() => {
    mocks.consent.mockReset();
    mocks.precheck.mockReset();
    mocks.enrollFace.mockReset();
    mocks.liveness.mockReset();
    mocks.requestProctoringMedia.mockReset();
    mocks.sampleEnvironment.mockReset();
    mocks.consent.mockResolvedValue({});
    mocks.precheck.mockResolvedValue({ passed: true, message: 'ok' });
    mocks.enrollFace.mockResolvedValue({ enrolled: true, message: 'ok' });
    mocks.liveness.mockResolvedValue({ isLive: true, message: 'ok' });
    mocks.requestProctoringMedia.mockResolvedValue({
      id: 'stream',
      getTracks: () => [],
    });
    mocks.sampleEnvironment.mockResolvedValue({
      brightness: 120,
      audioRmsPercent: 10,
      faceCentered: true,
    });
  });

  it('keeps continue disabled until all three consents are checked', () => {
    render(<OnboardingGate attemptId={ATTEMPT} onPassed={vi.fn()} />);
    const button = screen.getByRole('button', { name: /continue and allow camera/i });
    expect(button).toHaveProperty('disabled', true);
    fireEvent.click(screen.getByLabelText(/camera use/i));
    fireEvent.click(screen.getByLabelText(/microphone use/i));
    expect(button).toHaveProperty('disabled', true);
    fireEvent.click(screen.getByLabelText(/biometric processing/i));
    expect(button).toHaveProperty('disabled', false);
  });

  it('saves consent before requesting browser media', async () => {
    const onPassed = vi.fn();
    const stream = { id: 'cam', getTracks: () => [] };
    mocks.requestProctoringMedia.mockResolvedValue(stream);
    render(<OnboardingGate attemptId={ATTEMPT} onPassed={onPassed} />);
    fireEvent.click(screen.getByLabelText(/camera use/i));
    fireEvent.click(screen.getByLabelText(/microphone use/i));
    fireEvent.click(screen.getByLabelText(/biometric processing/i));
    fireEvent.click(screen.getByRole('button', { name: /continue and allow camera/i }));

    await waitFor(() => expect(onPassed).toHaveBeenCalledWith(stream));
    const consentOrder = mocks.consent.mock.invocationCallOrder[0];
    const mediaOrder = mocks.requestProctoringMedia.mock.invocationCallOrder[0];
    if (consentOrder === undefined || mediaOrder === undefined) {
      throw new Error('expected consent and media to be called');
    }
    expect(consentOrder).toBeLessThan(mediaOrder);
    expect(mocks.precheck).toHaveBeenCalledWith(
      expect.objectContaining({ attemptId: ATTEMPT, brightness: 120, faceCentered: true }),
    );
  });

  it('does not call getUserMedia when the student has not continued', () => {
    render(<OnboardingGate attemptId={ATTEMPT} onPassed={vi.fn()} />);
    fireEvent.click(screen.getByLabelText(/camera use/i));
    expect(mocks.requestProctoringMedia).not.toHaveBeenCalled();
  });

  it('does not request media when consent fails', async () => {
    mocks.consent.mockRejectedValue(new Error('consent failed'));
    render(<OnboardingGate attemptId={ATTEMPT} onPassed={vi.fn()} />);
    fireEvent.click(screen.getByLabelText(/camera use/i));
    fireEvent.click(screen.getByLabelText(/microphone use/i));
    fireEvent.click(screen.getByLabelText(/biometric processing/i));
    fireEvent.click(screen.getByRole('button', { name: /continue and allow camera/i }));
    await waitFor(() => expect(screen.getByText(/consent failed/i)).toBeDefined());
    expect(mocks.requestProctoringMedia).not.toHaveBeenCalled();
    expect(mocks.enrollFace).not.toHaveBeenCalled();
  });

  it('stops after a failed precheck and does not enroll', async () => {
    mocks.precheck.mockResolvedValue({ passed: false, message: 'Too dark' });
    render(<OnboardingGate attemptId={ATTEMPT} onPassed={vi.fn()} />);
    fireEvent.click(screen.getByLabelText(/camera use/i));
    fireEvent.click(screen.getByLabelText(/microphone use/i));
    fireEvent.click(screen.getByLabelText(/biometric processing/i));
    fireEvent.click(screen.getByRole('button', { name: /continue and allow camera/i }));
    await waitFor(() => expect(screen.getByText(/too dark/i)).toBeDefined());
    expect(mocks.enrollFace).not.toHaveBeenCalled();
  });

  it('stops camera tracks on unmount if onboarding never handed the stream off', async () => {
    const stop = vi.fn();
    mocks.requestProctoringMedia.mockResolvedValue({
      id: 'cam',
      getTracks: () => [{ stop }],
    });
    mocks.precheck.mockResolvedValue({ passed: false, message: 'Too dark' });
    const { unmount } = render(<OnboardingGate attemptId={ATTEMPT} onPassed={vi.fn()} />);
    fireEvent.click(screen.getByLabelText(/camera use/i));
    fireEvent.click(screen.getByLabelText(/microphone use/i));
    fireEvent.click(screen.getByLabelText(/biometric processing/i));
    fireEvent.click(screen.getByRole('button', { name: /continue and allow camera/i }));
    await waitFor(() => expect(screen.getByText(/too dark/i)).toBeDefined());
    unmount();
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('does not stop tracks on unmount after onPassed takes ownership', async () => {
    const stop = vi.fn();
    const stream = { id: 'cam', getTracks: () => [{ stop }] };
    mocks.requestProctoringMedia.mockResolvedValue(stream);
    const { unmount } = render(<OnboardingGate attemptId={ATTEMPT} onPassed={vi.fn()} />);
    fireEvent.click(screen.getByLabelText(/camera use/i));
    fireEvent.click(screen.getByLabelText(/microphone use/i));
    fireEvent.click(screen.getByLabelText(/biometric processing/i));
    fireEvent.click(screen.getByRole('button', { name: /continue and allow camera/i }));
    await waitFor(() => expect(mocks.liveness).toHaveBeenCalled());
    unmount();
    expect(stop).not.toHaveBeenCalled();
  });
});
