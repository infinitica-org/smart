-- SA-T08 Void Cert / Work-Ex — adds an immutable terminal VOIDED state to both
-- verification-status enums. Reachable only through the admin void action;
-- every transition into it is paired with an audit_logs row (actor, reason, time).

ALTER TYPE "WorkExperienceVerificationStatus" ADD VALUE 'VOIDED';
ALTER TYPE "CandidateCertificateStatus" ADD VALUE 'VOIDED';
