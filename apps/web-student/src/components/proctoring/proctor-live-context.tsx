'use client';

import { createContext, useContext, type ReactNode, type RefCallback } from 'react';
import { PROCTORING_WARNING_LIMIT_DEFAULT, type ProctoringViolationKind } from '@smart/contracts';

export type ProctorLiveValue = {
  cameraEnabled: boolean;
  liveKind: ProctoringViolationKind | null;
  sampled: boolean;
  warningCount: number;
  warningLimit: number;
  bindPreview: RefCallback<HTMLVideoElement>;
  /** Stop proctoring mic tracks so the interview can use speech capture. */
  prepareMicForSpeech: () => void;
};

const ProctorLiveContext = createContext<ProctorLiveValue>({
  cameraEnabled: false,
  liveKind: null,
  sampled: false,
  warningCount: 0,
  warningLimit: PROCTORING_WARNING_LIMIT_DEFAULT,
  bindPreview: () => undefined,
  prepareMicForSpeech: () => undefined,
});

export function ProctorLiveProvider({
  value,
  children,
}: {
  value: ProctorLiveValue;
  children: ReactNode;
}) {
  return <ProctorLiveContext.Provider value={value}>{children}</ProctorLiveContext.Provider>;
}

export function useProctorLive(): ProctorLiveValue {
  return useContext(ProctorLiveContext);
}
