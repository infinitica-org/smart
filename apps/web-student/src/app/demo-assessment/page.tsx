'use client';

import { useState } from 'react';
import {
  AppShell,
  Card,
  CardHeader,
  CardTitle,
  ConfidenceNote,
  Timer,
  CodeEditor,
  AudioRecorder,
  LevelStepper,
  TierTrail,
  Button,
  AssessmentHeader,
  QuestionCard,
  AnswerOption,
  ProgressIndicator,
  AssessmentNavigation,
} from '@smart/ui';
import type { ConfidenceNoteDto } from '@smart/contracts';

// Mock Data for Demo
const MOCK_NOTE: ConfidenceNoteDto = {
  trackCode: 'MBA_FINANCE',
  levelNumber: 1,
  calibrationStatus: 'NOT_CALIBRATED',
  sampleSize: 50,
  reliabilityCoefficient: 0.85,
  panelistCount: 3,
  calibrationEmployers: ['Google', 'Acme Corp'],
  noteText:
    'This score is backed by a panel of 3 practitioners from Google and Acme Corp. It has a high reliability coefficient (0.85).',
  downgraded: false,
  downgradeReason: null,
  placementCyclesObserved: 1,
  generatedAt: new Date().toISOString(),
};

const DOWNGRADED_NOTE: ConfidenceNoteDto = {
  ...MOCK_NOTE,
  reliabilityCoefficient: 0.55,
  noteText:
    'The assessment reliability is below the academic minimum. This score should be interpreted with caution.',
  downgraded: true,
  downgradeReason: 'Reliability coefficient (0.55) fell below the threshold of 0.70.',
};

export default function DemoAssessmentPage() {
  const [code, setCode] = useState('function calculateScore() {\n  return 100;\n}');
  const [expired, setExpired] = useState(false);
  const serverNow = new Date().toISOString();

  // Start the timer 5 minutes in the past, duration 35 minutes (30 minutes left)
  const startedAt = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  return (
    <AppShell
      productName="SMART Assessment Demo"
      title="Component Showcase"
      subtitle="Testing the UI components for S1-SV-03"
    >
      <div className="grid gap-8 max-w-4xl mx-auto pb-12 mt-8">
        {/* Assessment UI Primitives Demo */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Assessment UI Primitives</h2>
          <div className="border border-[var(--surface-border)] rounded-md overflow-hidden bg-[var(--surface-muted)]">
            <AssessmentHeader
              title="Frontend Developer Assessment"
              rightSlot={<Timer duration={3600} startedAt={startedAt} serverNow={serverNow} />}
            />
            <div className="p-6 bg-[var(--surface)]">
              <ProgressIndicator current={3} total={20} className="mb-4" />

              <QuestionCard questionText="Which statement about React hooks is correct?">
                <AnswerOption label="Hooks can be called conditionally." selected={false} />
                <AnswerOption
                  label="Hooks can only be called inside class components."
                  selected={false}
                />
                <AnswerOption
                  label="Hooks must be called at the top level of a component."
                  selected={true}
                />
                <AnswerOption
                  label="Hooks replace all uses of lifecycle methods and Redux."
                  selected={false}
                />
              </QuestionCard>

              <AssessmentNavigation className="mt-8" />
            </div>
          </div>
        </section>

        {/* Tier Trail & Level Stepper */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">
            1 & 2. Progression Tracking
          </h2>
          <Card className="p-6 space-y-8">
            <TierTrail
              tiers={[
                { level: 1, tier: 'SILVER' },
                { level: 2, tier: 'GOLD' },
              ]}
            />
            <LevelStepper current={3} unlockedThrough={3} />
          </Card>
        </section>

        {/* Confidence Note */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">3. Confidence Note</h2>
          <div className="grid gap-4">
            <ConfidenceNote note={MOCK_NOTE} />
            <ConfidenceNote note={DOWNGRADED_NOTE} />
          </div>
        </section>

        {/* Assessment Shell Demo (Timer, Code Editor, Audio Recorder) */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">
            4, 5 & 6. Assessment Tools
          </h2>
          <Card className="overflow-hidden">
            <CardHeader className="bg-[var(--surface-muted)] border-b px-6 py-4 flex flex-row items-center justify-between">
              <CardTitle>Q3. Implement calculateScore</CardTitle>
              <Timer
                duration={35 * 60} // 35 minutes
                startedAt={startedAt}
                serverNow={serverNow}
                onExpire={() => setExpired(true)}
              />
            </CardHeader>
            <div className="p-6 space-y-6">
              <p className="text-sm text-[var(--text-primary)]">
                Please write a function that calculates the candidate score based on their
                responses. Also, provide a brief audio explanation of your approach.
              </p>

              <CodeEditor
                language="javascript"
                value={code}
                onChange={setCode}
                disabled={expired}
                placeholder="Write your code here..."
              />

              <div className="flex items-center justify-between pt-4 border-t">
                <AudioRecorder onRecordStart={() => {}} onRecordStop={() => {}} />

                <Button variant="primary" disabled={expired}>
                  Submit Answer
                </Button>
              </div>
            </div>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
