import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FaceCheckResult } from '../../lib/proctoring/face-check';
import type * as ProctoringMedia from '../../lib/proctoring/media';

const mocks = vi.hoisted(() => ({
  consent: vi.fn(),
  precheck: vi.fn(),
  enrollFace: vi.fn(),
  liveness: vi.fn(),
  requestProctoringMedia: vi.fn(),
  sampleEnvironment: vi.fn(),
  chromium: vi.fn(() => true),
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
  const actual = await importOriginal<typeof ProctoringMedia>();
  return {
    ...actual,
    requestProctoringMedia: (...args: unknown[]) => mocks.requestProctoringMedia(...args),
    sampleEnvironment: (...args: unknown[]) => mocks.sampleEnvironment(...args),
  };
});

vi.mock('../../lib/proctoring/chromium', () => ({
  isGoogleChrome: () => mocks.chromium(),
}));

vi.mock('./face-live-check', () => ({
  FaceLiveCheck: ({ onPassed }: { onPassed: (sample: FaceCheckResult) => void }) => (
    <button
      type="button"
      onClick={() =>
        onPassed({
          faceCount: 1,
          brightness: 140,
          oneFace: true,
          lightingOk: true,
          ok: true,
          fillOk: true,
          message: 'Face check passed.',
        })
      }
    >
      Enter the challenge
    </button>
  ),
}));

import { OnboardingGate } from './onboarding-gate';

const ATTEMPT = '0971c53e-649b-427e-b00d-12f5988a68ba';

function acceptSkillVerifyRules() {
  fireEvent.click(screen.getByLabelText(/i have read this playbook/i));
  fireEvent.click(screen.getByRole('button', { name: /continue to camera consent/i }));
}

describe('OnboardingGate', () => {
  beforeEach(() => {
    mocks.consent.mockReset();
    mocks.precheck.mockReset();
    mocks.enrollFace.mockReset();
    mocks.liveness.mockReset();
    mocks.requestProctoringMedia.mockReset();
    mocks.sampleEnvironment.mockReset();
    mocks.chromium.mockReset();
    mocks.chromium.mockReturnValue(true);
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

  it('enters fullscreen without requesting camera when camera is off', async () => {
    const onPassed = vi.fn();
    render(<OnboardingGate attemptId={ATTEMPT} cameraEnabled={false} onPassed={onPassed} />);
    expect(screen.queryByLabelText(/camera use/i)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /^continue$/i }));
    await waitFor(() => expect(onPassed).toHaveBeenCalledWith(null));
    expect(mocks.requestProctoringMedia).not.toHaveBeenCalled();
    expect(mocks.consent).not.toHaveBeenCalled();
    expect(mocks.enrollFace).not.toHaveBeenCalled();
  });

  it('lays out face-check consent in a centered card', () => {
    render(
      <OnboardingGate
        attemptId={ATTEMPT}
        faceLiveCheck
        kioskTitle="GitOps & Continuous Delivery · Beginner"
        onPassed={vi.fn()}
      />,
    );
    expect(
      screen.getByRole('heading', { name: /gitops & continuous delivery · beginner/i }),
    ).toBeTruthy();
    expect(screen.getByRole('heading', { name: /how the challenge works/i })).toBeTruthy();
    expect(screen.getByText(/5 integrity warnings/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /continue and allow camera/i })).toBeNull();
    const next = screen.getByRole('button', { name: /continue to camera consent/i });
    expect(next).toHaveProperty('disabled', true);
    acceptSkillVerifyRules();
    expect(screen.getByRole('heading', { name: /face check/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /continue and allow camera/i })).toBeTruthy();
  });

  it('runs a live one-face lighting check instead of enroll and blink liveness', async () => {
    const onPassed = vi.fn();
    const stream = { id: 'cam', getTracks: () => [] };
    mocks.requestProctoringMedia.mockResolvedValue(stream);
    render(<OnboardingGate attemptId={ATTEMPT} faceLiveCheck onPassed={onPassed} />);
    acceptSkillVerifyRules();
    fireEvent.click(screen.getByLabelText(/camera use/i));
    expect(screen.queryByLabelText(/microphone use/i)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /continue and allow camera/i }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /enter the challenge/i })).toBeDefined(),
    );
    expect(mocks.enrollFace).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /enter the challenge/i }));
    await waitFor(() => expect(onPassed).toHaveBeenCalledWith(stream));
    expect(mocks.precheck).toHaveBeenCalledWith(
      expect.objectContaining({ attemptId: ATTEMPT, faceCentered: true, brightness: 140 }),
    );
    expect(mocks.liveness).not.toHaveBeenCalled();
  });

  it('blocks skill-verify onboarding outside Google Chrome', () => {
    mocks.chromium.mockReturnValue(false);
    render(<OnboardingGate attemptId={ATTEMPT} faceLiveCheck onPassed={vi.fn()} />);
    expect(screen.getByRole('heading', { name: /use google chrome/i })).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toMatch(/google chrome on a computer/i);
    expect(screen.queryByRole('button', { name: /continue and allow camera/i })).toBeNull();
  });
});
