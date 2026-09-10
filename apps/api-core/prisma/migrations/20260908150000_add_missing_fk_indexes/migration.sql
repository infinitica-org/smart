-- Infra scalability review: Postgres does not auto-index foreign key columns
-- (unlike MySQL), and these had none. Adds indexes for FK/lookup columns that
-- were relying on a seq scan or an unusable trailing position in a composite
-- index. No column, constraint, or table changes -- index-only migration.

CREATE INDEX "items_competency_id_idx" ON "items"("competency_id");

CREATE INDEX "panelists_panel_id_idx" ON "panelists"("panel_id");

CREATE INDEX "angoff_estimates_panel_id_idx" ON "angoff_estimates"("panel_id");

CREATE INDEX "responses_item_id_idx" ON "responses"("item_id");

CREATE INDEX "certificates_track_id_idx" ON "certificates"("track_id");

CREATE INDEX "job_descriptions_track_id_idx" ON "job_descriptions"("track_id");

CREATE INDEX "placement_records_jd_id_idx" ON "placement_records"("jd_id");

CREATE INDEX "integrity_events_attempt_id_idx" ON "integrity_events"("attempt_id");

CREATE INDEX "ai_evaluation_audits_response_id_idx" ON "ai_evaluation_audits"("response_id");
