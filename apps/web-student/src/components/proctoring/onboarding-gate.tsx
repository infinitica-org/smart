'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { Camera } from 'lucide-react';
import { Button, Card, CardDescription, CardHeader, CardTitle } from '@smart/ui';
import { api } from '../../lib/api';
import {
  requestProctoringMedia,
  sampleEnvironment,
  stopProctoringMedia,
} from '../../lib/proctoring/media';
import { enterAssessmentFullscreen } from '../../lib/proctoring/fullscreen';
import type { FaceCheckResult } from '../../lib/proctoring/face-check';
import { FaceLiveCheck } from './face-live-check';

export function OnboardingGate({
  attemptId,
  onPassed,
  fullscreenRootRef,
  cameraEnabled = true,
  faceLiveCheck = false,
}: {
  attemptId: string;
  onPassed: (stream: MediaStream | null) => void;
  fullscreenRootRef?: RefObject<HTMLElement | null>;
  /** When false, skip webcam capture and preview. Fullscreen lockdown still runs. */
  cameraEnabled?: boolean;
  /** Live one-face + lighting check after the camera opens. */
  faceLiveCheck?: boolean;
}) {
  const [camera, setCamera] = useState(false);
  const [microphone, setMicrophone] = useState(false);
  const [biometric, setBiometric] = useState(false);
  const [message, setMessage] = useState(
    cameraEnabled
      ? faceLiveCheck
        ? 'Allow the camera, then we will check that only one clearly lit face is visible in the oval.'
        : 'Check all three boxes, then continue. The browser will ask for camera and microphone after consent is saved.'
      : 'Continue to enter fullscreen lockdown. Camera is not used for this assessment.',
  );
  const [busy, setBusy] = useState(false);
  const [liveStream, setLiveStream] = useState<MediaStream | null>(null);
  const [faceEpoch, setFaceEpoch] = useState(0);
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

  const finish = useCallback(
    async (stream: MediaStream | null) => {
      await enterAssessmentFullscreen(fullscreenRootRef?.current);
      handedOffRef.current = true;
      onPassed(stream);
    },
    [fullscreenRootRef, onPassed],
  );

  const onFacePassed = useCallback(
    async (sample: FaceCheckResult) => {
      if (!streamRef.current) return;
      if (!sample.ok || !sample.oneFace || sample.faceCount !== 1) {
        setMessage('Only one clearly lit face can continue.');
        setFaceEpoch((n) => n + 1);
        return;
      }
      setBusy(true);
      try {
        const precheck = await api.proctoring.precheck({
          attemptId,
          brightness: sample.brightness,
          audioRmsPercent: 8,
          faceCentered: sample.oneFace,
        });
        if (!precheck.passed) {
          setMessage(precheck.message);
          setFaceEpoch((n) => n + 1);
          return;
        }
        await finish(streamRef.current);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Face check failed.');
      } finally {
        setBusy(false);
      }
    },
    [attemptId, finish],
  );

  async function run() {
    setBusy(true);
    try {
      if (!cameraEnabled) {
        await finish(null);
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
      if (faceLiveCheck) {
        setLiveStream(streamRef.current);
        setMessage('Stay in the oval until both checks pass.');
        return;
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
      if (!streamRef.current) {
        throw new Error('Camera stream missing after onboarding.');
      }
      await finish(streamRef.current);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Onboarding failed.');
    } finally {
      setBusy(false);
    }
  }

  const consentsReady = faceLiveCheck ? camera : camera && microphone && biometric;
  const ready = cameraEnabled ? consentsReady : true;
  const title = faceLiveCheck ? 'Face check' : 'Proctoring consent';
  const detail = cameraEnabled
    ? faceLiveCheck
      ? 'The camera is used only for this attempt. Align your face with the oval. We scan only that cutout for one well-lit face. Nothing is uploaded from this preview.'
      : 'Camera and microphone are used only for this attempt. Nothing is pre-checked. Device permission is requested only after you continue.'
    : 'This attempt uses fullscreen lockdown and integrity sensors. Camera and microphone are not used.';

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--background)] text-[var(--text-primary)]">
      <header className="flex shrink-0 items-center justify-between border-b border-[var(--surface-border)] bg-[var(--surface)] px-6 py-3">
        <h1 className="text-lg font-semibold tracking-tight">
          {faceLiveCheck ? 'Skill verification' : 'Assessment'}
        </h1>
        <p className="text-xs text-[var(--text-secondary)]">
          {faceLiveCheck
            ? liveStream
              ? 'Step 2 of 2 · Stay in frame'
              : 'Step 1 of 2 · Consent'
            : 'Before you begin'}
        </p>
      </header>
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-6">
        <Card
          className={`w-full border-white/10 bg-[var(--surface)] ${liveStream ? 'max-w-xl' : 'max-w-lg'}`}
        >
          <CardHeader className={liveStream ? 'mb-4' : 'mb-5'}>
            <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-teal-500/15 text-teal-300">
              <Camera className="size-5" aria-hidden />
            </div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{detail}</CardDescription>
          </CardHeader>
          {cameraEnabled && !liveStream ? (
            <div className="mb-4 space-y-2">
              <ConsentRow
                id="proctor-consent-camera"
                checked={camera}
                onChange={setCamera}
                label="I agree to camera use"
              />
              {faceLiveCheck ? null : (
                <>
                  <ConsentRow
                    id="proctor-consent-mic"
                    checked={microphone}
                    onChange={setMicrophone}
                    label="I agree to microphone use"
                  />
                  <ConsentRow
                    id="proctor-consent-biometric"
                    checked={biometric}
                    onChange={setBiometric}
                    label="I agree to biometric processing for identity checks"
                  />
                </>
              )}
            </div>
          ) : null}
          {liveStream ? (
            <FaceLiveCheck
              key={faceEpoch}
              stream={liveStream}
              onPassed={onFacePassed}
              busy={busy}
            />
          ) : null}
          <p className="text-sm text-[var(--text-secondary)]">{message}</p>
          {liveStream ? null : (
            <Button
              type="button"
              disabled={!ready || busy}
              className="mt-4 w-full bg-teal text-ink hover:bg-teal/90"
              onClick={() => void run()}
            >
              {busy ? 'Checking…' : cameraEnabled ? 'Continue and allow camera' : 'Continue'}
            </Button>
          )}
        </Card>
      </div>
    </div>
  );
}

function ConsentRow({
  id,
  checked,
  onChange,
  label,
}: {
  id: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-4 shrink-0 accent-teal-400"
      />
      <span>{label}</span>
    </label>
  );
}
