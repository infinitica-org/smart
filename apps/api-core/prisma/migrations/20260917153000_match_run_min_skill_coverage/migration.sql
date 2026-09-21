-- Persist MatchRequest.minSkillCoverage on async match runs (replay + student fit parity).
ALTER TABLE "match_runs"
  ADD COLUMN IF NOT EXISTS "min_skill_coverage" DECIMAL(4, 3);
