-- skill@1 trim: remove 16 process/soft-skill entries that are not certifiable technical skills.
-- Codes removed from packages/contracts skill-taxonomy (51 skills remain).

DO $$
DECLARE
  removed text[] := ARRAY[
    'ACCESSIBILITY_ENGINEERING_A11Y',
    'AGILE_DELIVERY_LEADERSHIP',
    'CONFIGURATION_MANAGEMENT_AUTOMATION',
    'CROSS_PLATFORM_MOBILE_DEVELOPMENT',
    'CLOUD_COST_OPTIMIZATION_FINOPS',
    'IDENTITY_ACCESS_MANAGEMENT_IAM',
    'INFRASTRUCTURE_AS_CODE_IAC',
    'SECURITY_OPERATIONS_INCIDENT_RESPONSE',
    'API_GATEWAY_SERVICE_MESH_MANAGEMENT',
    'CROSS_FUNCTIONAL_STAKEHOLDER_COLLABORATION',
    'STREAM_PROCESSING_MESSAGING_SYSTEMS',
    'TECHNICAL_DOCUMENTATION_KNOWLEDGE_MANAGEMENT',
    'MENTORSHIP_TECHNICAL_LEADERSHIP',
    'TECHNICAL_PROGRAM_PROJECT_MANAGEMENT',
    'TEST_AUTOMATION_ENGINEERING',
    'VIRTUALIZATION_HYPERVISOR_MANAGEMENT'
  ];
BEGIN
  DELETE FROM job_opening_skills
  WHERE skill_id IN (SELECT id FROM skills WHERE code = ANY (removed));

  DELETE FROM skill_claims
  WHERE skill_id IN (SELECT id FROM skills WHERE code = ANY (removed));

  DELETE FROM candidate_certificate_skills
  WHERE skill_code = ANY (removed);

  DELETE FROM project_skill_mappings
  WHERE skill_code = ANY (removed);

  DELETE FROM student_capabilities
  WHERE skill_code = ANY (removed);

  UPDATE work_experience_responsibilities
  SET skill_code = NULL
  WHERE skill_code = ANY (removed);

  UPDATE evidence_artifacts
  SET related_skill_code = NULL
  WHERE related_skill_code = ANY (removed);

  UPDATE career_domains
  SET skill_codes = COALESCE(
    (SELECT array_agg(value ORDER BY value)
     FROM unnest(skill_codes) AS value
     WHERE value <> ALL (removed)),
    '{}'::text[]
  );

  UPDATE target_roles
  SET
    recommended_skill_codes = COALESCE(
      (SELECT array_agg(value ORDER BY value)
       FROM unnest(recommended_skill_codes) AS value
       WHERE value <> ALL (removed)),
      '{}'::text[]
    ),
    optional_skill_codes = COALESCE(
      (SELECT array_agg(value ORDER BY value)
       FROM unnest(optional_skill_codes) AS value
       WHERE value <> ALL (removed)),
      '{}'::text[]
    );

  UPDATE candidate_evidence_profiles
  SET selected_skill_codes = COALESCE(
    (SELECT array_agg(value ORDER BY value)
     FROM unnest(selected_skill_codes) AS value
     WHERE value <> ALL (removed)),
    '{}'::text[]
  );

  UPDATE evidence_records
  SET related_skill_codes = COALESCE(
    (SELECT array_agg(value ORDER BY value)
     FROM unnest(related_skill_codes) AS value
     WHERE value <> ALL (removed)),
    '{}'::text[]
  );

  UPDATE professional_credentials
  SET covered_skill_codes = COALESCE(
    (SELECT array_agg(value ORDER BY value)
     FROM unnest(covered_skill_codes) AS value
     WHERE value <> ALL (removed)),
    '{}'::text[]
  );

  DELETE FROM skills WHERE code = ANY (removed);
END $$;
