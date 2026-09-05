'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import { Alert, Button } from '@smart/ui';
import { api } from '../../lib/api';
import {
  requestProctoringMedia,
  sampleEnvironment,
  stopProctoringMedia,
} from '../../lib/proctoring/media';
import { enterAssessmentFullscreen } from '../../lib/proctoring/fullscreen';

export function OnboardingGate({
  attemptId,
  onPassed,
  fullscreenRootRef,
  cameraEnabled = true,
}: {
  attemptId: string;
  onPassed: (stream: MediaStream | null) => void;
  fullscreenRootRef?: RefObject<HTMLElement | null>;
  /** When false, skip camera/mic/face checks. Fullscreen lockdown still runs. */
  cameraEnabled?: boolean;
}) {
  const [camera, setCamera] = useState(false);
  const [microphone, setMicrophone] = useState(false);
  const [biometric, setBiometric] = useState(false);
  const [message, setMessage] = useState(
    cameraEnabled
      ? 'Check all three boxes, then continue. The browser will ask for camera and microphone after consent is saved.'
      : 'Continue to enter fullscreen lockdown. Camera is not used for this assessment.',
  );
  const [busy, setBusy] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const handedOffRef = useRef(false);

  useEffect(() => {
    return () => {
      if (!handedOffRef.current) {
        stopProctoringMedia(streamRef.current);
        streamRef.current = null;
      }
    };
  }, []);

  async function run() {
    setBusy(true);
    try {
      if (!cameraEnabled) {
        await enterAssessmentFullscreen(fullscreenRootRef?.current);
        handedOffRef.current = true;
        onPassed(null);
        return;
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
      await enterAssessmentFullscreen(fullscreenRootRef?.current);
      if (!streamRef.current) {
        throw new Error('Camera stream missing after onboarding.');
      }
      handedOffRef.current = true;
      onPassed(streamRef.current);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Onboarding failed.');
    } finally {
      setBusy(false);
    }
  }

  const ready = cameraEnabled ? camera && microphone && biometric : true;

  return (
    <div className="mx-auto max-w-lg space-y-4 p-6">
      <Alert tone="info" title="Proctoring consent">
        {cameraEnabled
          ? 'Camera and microphone are used only for this attempt. Nothing is pre-checked. Device permission is requested only after you continue.'
          : 'This attempt uses fullscreen lockdown and integrity sensors. Camera and microphone are not used.'}
      </Alert>
      {cameraEnabled ? (
        <>
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
        </>
      ) : null}
      <p className="text-sm text-white/70">{message}</p>
      <Button
        type="button"
        disabled={!ready || busy}
        className="bg-teal text-ink hover:bg-teal/90"
        onClick={() => void run()}
      >
        {busy ? 'Checking…' : cameraEnabled ? 'Continue and allow camera' : 'Continue'}
      </Button>
    </div>
  );
}
