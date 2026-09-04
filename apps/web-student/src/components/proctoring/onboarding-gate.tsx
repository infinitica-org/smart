'use client';

import { useRef, useState, type RefObject } from 'react';
import { Alert, Button } from '@smart/ui';
import { api } from '../../lib/api';
import { requestProctoringMedia, sampleEnvironment } from '../../lib/proctoring/media';
import { enterAssessmentFullscreen } from '../../lib/proctoring/fullscreen';

export function OnboardingGate({
  attemptId,
  onPassed,
  fullscreenRootRef,
}: {
  attemptId: string;
  onPassed: (stream: MediaStream) => void;
  fullscreenRootRef?: RefObject<HTMLElement | null>;
}) {
  const [camera, setCamera] = useState(false);
  const [microphone, setMicrophone] = useState(false);
  const [biometric, setBiometric] = useState(false);
  const [message, setMessage] = useState(
    'Check all three boxes, then continue. The browser will ask for camera and microphone after consent is saved.',
  );
  const [busy, setBusy] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  async function run() {
    setBusy(true);
    try {
      const fullscreenOk = await enterAssessmentFullscreen(fullscreenRootRef?.current);
      if (!fullscreenOk) {
        setMessage(
          'If the browser blocks fullscreen, use Return to fullscreen after the checks finish.',
        );
      }
      await api.proctoring.consent({
        attemptId,
        camera: true,
        microphone: true,
        biometricProcessing: true,
      });
      if (!streamRef.current) {
        streamRef.current = await requestProctoringMedia();
      }
      const sample = await sampleEnvironment(streamRef.current);
      const precheck = await api.proctoring.precheck({
        attemptId,
        brightness: sample.brightness,
        audioRmsPercent: sample.audioRmsPercent,
        faceCentered: sample.faceCentered,
      });
      if (!precheck.passed) {
        setMessage(precheck.message);
        return;
      }
      await api.proctoring.enrollFace(attemptId);
      await api.proctoring.liveness({
        attemptId,
        challenge: 'BLINK',
        yawDelta: 0.1,
        earDelta: 0.05,
      });
      onPassed(streamRef.current);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Onboarding failed.');
    } finally {
      setBusy(false);
    }
  }

  const ready = camera && microphone && biometric;

  return (
    <div className="mx-auto max-w-lg space-y-4 p-6">
      <Alert tone="info" title="Proctoring consent">
        Camera and microphone are used only for this attempt. Nothing is pre-checked. Device
        permission is requested only after you continue.
      </Alert>
      <label htmlFor="proctor-consent-camera" className="flex gap-2 text-sm">
        <input
          id="proctor-consent-camera"
          type="checkbox"
          checked={camera}
          onChange={(event) => setCamera(event.target.checked)}
        />
        I agree to camera use
      </label>
      <label htmlFor="proctor-consent-mic" className="flex gap-2 text-sm">
        <input
          id="proctor-consent-mic"
          type="checkbox"
          checked={microphone}
          onChange={(event) => setMicrophone(event.target.checked)}
        />
        I agree to microphone use
      </label>
      <label htmlFor="proctor-consent-biometric" className="flex gap-2 text-sm">
        <input
          id="proctor-consent-biometric"
          type="checkbox"
          checked={biometric}
          onChange={(event) => setBiometric(event.target.checked)}
        />
        I agree to biometric processing for identity checks
      </label>
      <p className="text-sm text-white/70">{message}</p>
      <Button
        type="button"
        disabled={!ready || busy}
        className="bg-teal text-ink hover:bg-teal/90"
        onClick={() => void run()}
      >
        {busy ? 'Checking…' : 'Continue and allow camera'}
      </Button>
    </div>
  );
}
