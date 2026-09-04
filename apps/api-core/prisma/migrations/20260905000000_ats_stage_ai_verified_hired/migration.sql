-- CO-T02/CO-T05: add the AI-Verified and Hired kanban columns to the ATS
-- pipeline, closing the gap between the contract enum and the PRD's stage
-- list (New Matches -> Shortlisted -> AI-Verified -> Interviewing -> Offer ->
-- Hired/Rejected).
ALTER TYPE "AtsStage" ADD VALUE IF NOT EXISTS 'AI_VERIFIED';
ALTER TYPE "AtsStage" ADD VALUE IF NOT EXISTS 'HIRED';
