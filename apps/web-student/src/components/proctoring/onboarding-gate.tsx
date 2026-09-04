'use client';

import { useState } from 'react';
import { Alert, Button } from '@smart/ui';
import { api } from '../../lib/api';

export function OnboardingGate({
  attemptId,
  onPassed,
}: {
  attemptId: string;
  onPassed: () => void;
}) {
  const [camera, setCamera] = useState(false);
  const [microphone, setMicrophone] = useState(false);
  const [biometric, setBiometric] = useState(false);
  const [message, setMessage] = useState('Consent is required before the camera turns on.');
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      await api.proctoring.consent({
        attemptId,
        camera: true,
        microphone: true,
        biometricProcessing: true,
      });
      await api.proctoring.precheck({
        attemptId,
        brightness: 120,
        audioRmsPercent: 10,
        faceCentered: true,
      });
      await api.proctoring.enrollFace(attemptId);
      await api.proctoring.liveness({
        attemptId,
        challenge: 'BLINK',
        yawDelta: 0.1,
        earDelta: 0.05,
      });
      const voice = await api.proctoring.calibrateVoice({
        attemptId,
        phrase: 'Hi Proctor',
      });
      if (!voice.verified) {
        setMessage(voice.message);
        return;
      }
      onPassed();
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
        Camera, microphone, and face/voice checks are used only for this attempt. Nothing is
        pre-checked.
      </Alert>
      <label className="flex gap-2 text-sm">
        <input
          type="checkbox"
          checked={camera}
          onChange={(event) => setCamera(event.target.checked)}
        />
        I agree to camera use
      </label>
      <label className="flex gap-2 text-sm">
        <input
          type="checkbox"
          checked={microphone}
          onChange={(event) => setMicrophone(event.target.checked)}
        />
        I agree to microphone use
      </label>
      <label className="flex gap-2 text-sm">
        <input
          type="checkbox"
          checked={biometric}
          onChange={(event) => setBiometric(event.target.checked)}
        />
        I agree to biometric processing for identity checks
      </label>
      <p className="text-sm text-white/70">{message}</p>
      <Button type="button" disabled={!ready || busy} onClick={() => void run()}>
        {busy ? 'Checking…' : 'Start environment check'}
      </Button>
    </div>
  );
}
