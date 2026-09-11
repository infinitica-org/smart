/**
 * Kafka topic registry.
 *
 * A topic has exactly ONE producer-owner (TEAM.md §3.3). Consuming is free;
 * changing a payload is a `@smart/contracts` PR that must name every consumer
 * in the body so nobody is surprised at integration time.
 *
 * Owner: Tino (System Architect).
 */

export const SMART_TOPICS = {
  userCreated: 'smart.user.created',
  userUpdated: 'smart.user.updated',
  assessmentStarted: 'smart.assessment.started',
  assessmentSubmitted: 'smart.assessment.submitted',
  evalRequested: 'smart.eval.requested',
  evalCompleted: 'smart.eval.completed',
  trackUpdated: 'smart.track.updated',
  certificateIssued: 'smart.certificate.issued',
  placementMatched: 'smart.placement.matched',
  applicationStageChanged: 'smart.application.stage_changed',
  invitationSent: 'smart.invitation.sent',
  skillVerificationCompleted: 'smart.skill.verification.completed',
  auditRecorded: 'smart.audit.recorded',
  aiCompletionRecorded: 'smart.ai.completion.recorded',
  rateLimitExceeded: 'smart.rate_limit.exceeded',
  projectSubmitted: 'smart.project.submitted',
  projectSnapshotReady: 'smart.project.snapshot.ready',
  projectVerifyCompleted: 'smart.project.verify.completed',
  proctoringSnapshotReady: 'smart.proctoring.snapshot.ready',
  candidateSkillsDiscovered: 'smart.candidate.skills_discovered',
  signalEncoded: 'smart.signal.encoded',
  corroborationUpdated: 'smart.corroboration.updated',
} as const;

export type SmartTopic = (typeof SMART_TOPICS)[keyof typeof SMART_TOPICS];

export interface TopicSpec {
  readonly topic: SmartTopic;
  /** The single engineer accountable for this payload shape. */
  readonly producerOwner: string;
  readonly producerModule: string;
  readonly consumerModules: readonly string[];
  readonly partitions: number;
  readonly retentionHours: number;
  /** Partition key so ordering is preserved where it matters. */
  readonly partitionKey: string;
  readonly purpose: string;
}

/**
 * Partition keys are chosen so that events for one entity land on one partition
 * and stay ordered — e.g. all events for an attempt are ordered relative to each
 * other, which is what makes "submitted then evaluated" safe to reason about.
 */
export const TOPIC_SPECS: readonly TopicSpec[] = [
  {
    topic: SMART_TOPICS.userCreated,
    producerOwner: 'Vishal V',
    producerModule: 'auth',
    consumerModules: ['analytics'],
    partitions: 3,
    retentionHours: 168,
    partitionKey: 'userId',
    purpose: 'New identity provisioned via SSO or invitation.',
  },
  {
    topic: SMART_TOPICS.userUpdated,
    producerOwner: 'Vishal V',
    producerModule: 'users',
    consumerModules: ['analytics'],
    partitions: 3,
    retentionHours: 168,
    partitionKey: 'userId',
    purpose: 'Profile or track enrolment change.',
  },
  {
    topic: SMART_TOPICS.assessmentStarted,
    producerOwner: 'Vishal Bharath R',
    producerModule: 'assessment',
    consumerModules: ['analytics', 'catalog'],
    partitions: 12,
    retentionHours: 72,
    partitionKey: 'attemptId',
    purpose: 'Attempt opened; drives item-exposure tracking and live dashboards.',
  },
  {
    topic: SMART_TOPICS.assessmentSubmitted,
    producerOwner: 'Vishal Bharath R',
    producerModule: 'assessment',
    consumerModules: ['evaluation', 'platform', 'analytics'],
    partitions: 12,
    retentionHours: 168,
    partitionKey: 'attemptId',
    purpose:
      'THE handoff from delivery to grading. This event is the only coupling between ' +
      'assessment and evaluation — no direct service call in either direction.',
  },
  {
    topic: SMART_TOPICS.evalRequested,
    producerOwner: 'Ramansh',
    producerModule: 'evaluation',
    consumerModules: ['ai-gateway'],
    partitions: 12,
    retentionHours: 72,
    partitionKey: 'responseId',
    purpose: 'One rubric-scored response queued for LLM grading.',
  },
  {
    topic: SMART_TOPICS.evalCompleted,
    producerOwner: 'Ramansh',
    producerModule: 'evaluation',
    consumerModules: ['certificate', 'placement', 'analytics'],
    partitions: 12,
    retentionHours: 336,
    partitionKey: 'attemptId',
    purpose: 'Level scored and tier assigned; triggers certificate and match recomputation.',
  },
  {
    topic: SMART_TOPICS.trackUpdated,
    producerOwner: 'Vedika G',
    producerModule: 'calibration',
    consumerModules: ['platform', 'certificate', 'catalog'],
    partitions: 3,
    retentionHours: 720,
    partitionKey: 'trackCode',
    purpose: 'Cut scores or rubrics republished; invalidates cut-score and item caches.',
  },
  {
    topic: SMART_TOPICS.certificateIssued,
    producerOwner: 'Vishal Bharath R',
    producerModule: 'certificate',
    consumerModules: ['webhooks', 'analytics', 'platform', 'notifications'],
    partitions: 6,
    retentionHours: 720,
    partitionKey: 'certificateId',
    purpose: 'Certificate live; fans out to institutional ERP webhooks and refreshes verify cache.',
  },
  {
    topic: SMART_TOPICS.placementMatched,
    producerOwner: 'Vedika G',
    producerModule: 'placement',
    consumerModules: ['webhooks', 'analytics', 'notifications'],
    partitions: 6,
    retentionHours: 336,
    partitionKey: 'jdId',
    purpose: 'Shortlist generated; fans out to employer webhooks.',
  },
  {
    topic: SMART_TOPICS.applicationStageChanged,
    producerOwner: 'Vishal Bharath R',
    producerModule: 'placement',
    consumerModules: ['placement', 'platform', 'users', 'notifications'],
    partitions: 6,
    retentionHours: 168,
    partitionKey: 'applicationId',
    purpose: 'ATS column change; candidate My Applications stays in sync (idempotent).',
  },
  {
    topic: SMART_TOPICS.invitationSent,
    producerOwner: 'Vishal V',
    producerModule: 'invitations',
    consumerModules: ['notifications'],
    partitions: 3,
    retentionHours: 168,
    partitionKey: 'invitationId',
    purpose: 'Invitation email queued; consumer writes in-app notification and BullMQ email job.',
  },
  {
    topic: SMART_TOPICS.skillVerificationCompleted,
    producerOwner: 'Vishal Bharath R',
    producerModule: 'assessment',
    consumerModules: ['notifications'],
    partitions: 6,
    retentionHours: 168,
    partitionKey: 'claimId',
    purpose: 'Skill claim status finalized; consumer notifies student of pass/fail/lock.',
  },
  {
    topic: SMART_TOPICS.auditRecorded,
    producerOwner: 'Vishal V',
    producerModule: 'platform',
    consumerModules: ['platform'],
    partitions: 3,
    retentionHours: 720,
    partitionKey: 'resourceId',
    purpose: 'Admin audit trail; consumer persists to audit_logs.',
  },
  {
    topic: SMART_TOPICS.aiCompletionRecorded,
    producerOwner: 'Ramansh',
    producerModule: 'ai-gateway',
    consumerModules: ['ai-gateway'],
    partitions: 6,
    retentionHours: 168,
    partitionKey: 'responseId',
    purpose: 'LLM completion audit; consumer persists to ai_evaluation_audits.',
  },
  {
    topic: SMART_TOPICS.rateLimitExceeded,
    producerOwner: 'Vishal V',
    producerModule: 'rate-limit',
    consumerModules: ['observability', 'assessment'],
    partitions: 6,
    retentionHours: 72,
    partitionKey: 'identifier',
    purpose: 'Throttle violation; feeds abuse alerting and session integrity logging.',
  },
  {
    topic: SMART_TOPICS.projectSubmitted,
    producerOwner: 'Vishal V',
    producerModule: 'platform',
    consumerModules: ['platform', 'evaluation'],
    partitions: 6,
    retentionHours: 168,
    partitionKey: 'projectId',
    purpose: 'CN-T08 project row created; VV fetches a GitHub snapshot. Not smart.eval.*.',
  },
  {
    topic: SMART_TOPICS.projectSnapshotReady,
    producerOwner: 'Vishal V',
    producerModule: 'platform',
    consumerModules: ['evaluation'],
    partitions: 6,
    retentionHours: 168,
    partitionKey: 'projectId',
    purpose: 'Snapshot JSON is in Postgres; evaluation may score. Payload is not on the bus.',
  },
  {
    topic: SMART_TOPICS.projectVerifyCompleted,
    producerOwner: 'Ramansh',
    producerModule: 'evaluation',
    consumerModules: ['analytics', 'platform'],
    partitions: 6,
    retentionHours: 336,
    partitionKey: 'projectId',
    purpose: 'SE-T03 report written. Never auto-rejects. Do not treat as a cert tier.',
  },
  {
    topic: SMART_TOPICS.proctoringSnapshotReady,
    producerOwner: 'Ramansh',
    producerModule: 'proctoring',
    consumerModules: ['proctoring'],
    partitions: 6,
    retentionHours: 24,
    partitionKey: 'attemptId',
    purpose: 'Webcam checkpoint object is ready for the CV sidecar. Not continuous video.',
  },
  {
    topic: SMART_TOPICS.candidateSkillsDiscovered,
    producerOwner: 'Vishal V',
    producerModule: 'users',
    consumerModules: ['assessment', 'signal-encoder'],
    partitions: 3,
    retentionHours: 168,
    partitionKey: 'userId',
    purpose:
      'CN-T01 candidate confirmed GitHub-derived skill suggestions at onboarding completion; ' +
      'consumer best-effort matches languages against the Software & IT catalog and auto-declares ' +
      'BEGINNER SkillClaims tagged source=GITHUB_DERIVED. Never overwrites an existing claim.',
  },
  {
    topic: SMART_TOPICS.signalEncoded,
    producerOwner: 'Ramansh',
    producerModule: 'signal-encoder',
    consumerModules: ['corroboration', 'analytics'],
    partitions: 3,
    retentionHours: 168,
    partitionKey: 'userId',
    purpose:
      'Passive signal vectorized from external platform data. Observability + downstream fuse.',
  },
  {
    topic: SMART_TOPICS.corroborationUpdated,
    producerOwner: 'Ramansh',
    producerModule: 'corroboration',
    consumerModules: ['analytics'],
    partitions: 3,
    retentionHours: 168,
    partitionKey: 'userId',
    purpose:
      'Trust-weighted competency readout refreshed. Never promotes SkillClaim status; may carry review flags.',
  },
] as const;

export function getTopicSpec(topic: SmartTopic): TopicSpec {
  const found = TOPIC_SPECS.find((spec) => spec.topic === topic);
  if (!found) {
    throw new Error(`Topic ${topic} is not registered in TOPIC_SPECS.`);
  }
  return found;
}

/** Consumer group naming: `smart.<module>.<topic-suffix>` — stable across deploys. */
export function consumerGroupFor(module: string, topic: SmartTopic): string {
  return `smart.${module}.${topic.replace(/^smart\./, '')}`;
}

/** Dead-letter topic convention. Every consumer registers one. */
export function deadLetterTopicFor(topic: SmartTopic): string {
  return `${topic}.dlq`;
}
