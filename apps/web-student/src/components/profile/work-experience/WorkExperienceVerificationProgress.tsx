'use client';

import { Check, Circle, Clock } from 'lucide-react';
import type { WorkExperienceDto } from '@smart/contracts';

import { summarizeWorkExperienceDocumentCheck } from '@/lib/work-experience-document-check';

import { workExperienceRuleCheck } from './work-experience-presenters';

type StepState = 'complete' | 'active' | 'pending' | 'warning';

type Step = {
  key: string;
  label: string;
  detail: string;
  state: StepState;
};

function StepIcon({ state }: { state: StepState }) {
  if (state === 'complete') {
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--ds-green-soft)] text-[var(--ds-green)]">
        <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
      </span>
    );
  }
  if (state === 'active') {
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[var(--ds-green)] bg-[var(--ds-surface)] text-[var(--ds-green)]">
        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
    );
  }
  if (state === 'warning') {
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-full border border-amber-300 bg-amber-50 text-amber-800">
        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
    );
  }
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-[var(--ds-border)] bg-[var(--ds-surface)] text-[var(--ds-text-muted)]">
      <Circle className="h-3 w-3" aria-hidden="true" />
    </span>
  );
}

function connectorClass(left: StepState, right: StepState): string {
  if (left === 'complete' && (right === 'complete' || right === 'active' || right === 'warning')) {
    return 'bg-[var(--ds-green)]';
  }
  if (left === 'complete') return 'bg-[var(--ds-green)]/40';
  return 'border-t border-dashed border-[var(--ds-border)] bg-transparent';
}

export function WorkExperienceVerificationProgress({
  exp,
  validationResults,
  managerEndorsementStatus,
}: {
  exp: WorkExperienceDto;
  validationResults: Record<
    string,
    { validationStatus: string; rejectionReason?: string | null; reasonCode?: string | null }
  >;
  managerEndorsementStatus: string | null;
}) {
  const ruleCheck = workExperienceRuleCheck(exp);
  const docs = exp.documents ?? [];
  const documentCheck = summarizeWorkExperienceDocumentCheck({
    documents: docs,
    validationResults,
  });

  const proofState: StepState = ruleCheck.valid ? 'complete' : 'warning';
  const proofDetail = ruleCheck.valid ? 'Complete' : 'Action required';

  let checkState: StepState = 'pending';
  if (documentCheck.tag === 'Complete') checkState = 'complete';
  else if (documentCheck.tag === 'Missing' || documentCheck.tag === 'Rejected')
    checkState = 'warning';
  else if (documentCheck.tag === 'Review Flagged') checkState = 'warning';
  else if (docs.length > 0) checkState = 'active';

  let employerState: StepState = 'pending';
  let employerDetail = 'Not started';
  if (exp.status === 'VERIFIED') {
    employerState = 'complete';
    employerDetail = 'Complete';
  } else if (exp.status === 'PENDING_EMPLOYER') {
    employerState = 'active';
    employerDetail = 'Pending';
  } else if (exp.status === 'EXPIRED') {
    employerState = 'warning';
    employerDetail = 'Expired';
  } else if (exp.verifierEmail && ruleCheck.valid) {
    employerState = 'active';
    employerDetail = 'Pending';
  } else if (exp.verifierEmail) {
    employerDetail = 'Pending';
  }

  const steps: Step[] = [
    {
      key: 'proof',
      label: 'Document Proof',
      detail: proofDetail,
      state: proofState,
    },
    {
      key: 'check',
      label: 'Document Review',
      detail: documentCheck.tag,
      state: checkState,
    },
    {
      key: 'employer',
      label: 'Employer Verification',
      detail: employerDetail,
      state: employerState,
    },
  ];

  if (managerEndorsementStatus) {
    const endorsed =
      managerEndorsementStatus === 'VERIFIED' || managerEndorsementStatus === 'APPROVED';
    steps.push({
      key: 'manager',
      label: 'Manager Endorsement',
      detail: endorsed
        ? 'Complete'
        : managerEndorsementStatus === 'PENDING'
          ? 'Pending'
          : managerEndorsementStatus,
      state: endorsed ? 'complete' : managerEndorsementStatus === 'PENDING' ? 'active' : 'pending',
    });
  }

  return (
    <section
      className="border-t border-[var(--ds-border-subtle)] pt-5"
      aria-label="Verification progress"
    >
      <h5 className="text-xs font-semibold text-[var(--ds-text)]">Verification progress</h5>
      <ol className="mt-4 flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-2">
        {steps.map((step, index) => (
          <li
            key={step.key}
            className="flex min-w-0 flex-1 flex-col sm:items-center sm:text-center"
          >
            <div className="flex w-full items-center gap-3 sm:flex-col sm:gap-2">
              <StepIcon state={step.state} />
              <div className="min-w-0 flex-1 sm:flex-none">
                <p className="text-xs font-medium text-[var(--ds-text)]">{step.label}</p>
                <p className="text-[11px] text-[var(--ds-text-muted)]">{step.detail}</p>
              </div>
            </div>
            {index < steps.length - 1 ? (
              <div
                className={`mt-3 hidden h-px w-full sm:mt-4 sm:block ${connectorClass(step.state, steps[index + 1]?.state ?? 'pending')}`}
                aria-hidden="true"
              />
            ) : null}
          </li>
        ))}
      </ol>
      <p className="mt-3 text-[11px] leading-relaxed text-[var(--ds-text-muted)]">
        {exp.isCurrent ? 'Offer letter required' : 'Offer and relieving letter required'} ·{' '}
        {docs.length > 0
          ? `${docs.length} proof file(s) attached`
          : 'Upload offer or relieving letter'}
      </p>
    </section>
  );
}
