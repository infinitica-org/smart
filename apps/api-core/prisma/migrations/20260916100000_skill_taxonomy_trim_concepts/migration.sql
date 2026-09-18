-- skill@1 trim: remove 14 concept entries and rename 67 skill display names.
-- Codes are unchanged; categories unchanged.

DO $$
DECLARE
  removed text[] := ARRAY[
    'DISTRIBUTED_SYSTEMS_DESIGN',
    'MICROSERVICES_ARCHITECTURE_SERVICE_DECOMPOSITION',
    'EVENT_DRIVEN_ARCHITECTURE',
    'SCALABLE_SYSTEM_HIGH_AVAILABILITY_ARCHITECTURE',
    'DOMAIN_DRIVEN_DESIGN_DDD',
    'DESIGN_PATTERNS_CLEAN_ARCHITECTURE',
    'MULTI_CLOUD_HYBRID_CLOUD_STRATEGY',
    'SERVERLESS_ARCHITECTURE',
    'SITE_RELIABILITY_ENGINEERING_SRE',
    'DATA_WAREHOUSING',
    'DATA_LAKE_LAKEHOUSE_ARCHITECTURE',
    'DATA_GOVERNANCE_QUALITY_ENGINEERING',
    'COMPLIANCE_RISK_MANAGEMENT',
    'EDGE_COMPUTING'
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

UPDATE skills SET name = 'Python' WHERE code = 'PYTHON_APPLICATION_BACKEND_DEVELOPMENT';
UPDATE skills SET name = 'Java' WHERE code = 'JAVA_ENTERPRISE_APPLICATION_DEVELOPMENT';
UPDATE skills SET name = 'JavaScript / TypeScript' WHERE code = 'JAVASCRIPT_TYPESCRIPT_FULL_STACK_DEVELOPMENT';
UPDATE skills SET name = 'Go' WHERE code = 'GO_GOLANG_FOR_HIGH_PERFORMANCE_SERVICES';
UPDATE skills SET name = 'C# / .NET' WHERE code = 'C_NET_ENTERPRISE_DEVELOPMENT';
UPDATE skills SET name = 'C++' WHERE code = 'C_SYSTEMS_PERFORMANCE_ENGINEERING';
UPDATE skills SET name = 'Rust' WHERE code = 'RUST_FOR_SYSTEMS_RELIABILITY_ENGINEERING';
UPDATE skills SET name = 'Kotlin' WHERE code = 'KOTLIN_FOR_ANDROID_BACKEND_SERVICES';
UPDATE skills SET name = 'Swift' WHERE code = 'SWIFT_FOR_IOS_MACOS_DEVELOPMENT';
UPDATE skills SET name = 'SQL' WHERE code = 'SQL_QUERY_OPTIMIZATION';
UPDATE skills SET name = 'R' WHERE code = 'R_FOR_STATISTICAL_COMPUTING';
UPDATE skills SET name = 'Scala' WHERE code = 'SCALA_FOR_DISTRIBUTED_DATA_SYSTEMS';
UPDATE skills SET name = 'API Design' WHERE code = 'RESTFUL_GRAPHQL_API_DESIGN';
UPDATE skills SET name = 'Algorithms & Performance' WHERE code = 'ALGORITHMIC_COMPLEXITY_PERFORMANCE_OPTIMIZATION';
UPDATE skills SET name = 'Service Mesh & API Gateway' WHERE code = 'API_GATEWAY_SERVICE_MESH_MANAGEMENT';
UPDATE skills SET name = 'AWS' WHERE code = 'AMAZON_WEB_SERVICES_AWS_ARCHITECTURE';
UPDATE skills SET name = 'Azure' WHERE code = 'MICROSOFT_AZURE_CLOUD_ENGINEERING';
UPDATE skills SET name = 'Google Cloud (GCP)' WHERE code = 'GOOGLE_CLOUD_PLATFORM_GCP_ENGINEERING';
UPDATE skills SET name = 'FinOps' WHERE code = 'CLOUD_COST_OPTIMIZATION_FINOPS';
UPDATE skills SET name = 'Infrastructure as Code' WHERE code = 'INFRASTRUCTURE_AS_CODE_IAC';
UPDATE skills SET name = 'CI/CD' WHERE code = 'CI_CD_PIPELINE_ENGINEERING';
UPDATE skills SET name = 'Containers & Kubernetes' WHERE code = 'CONTAINERIZATION_ORCHESTRATION';
UPDATE skills SET name = 'Observability' WHERE code = 'OBSERVABILITY_MONITORING';
UPDATE skills SET name = 'Configuration Management' WHERE code = 'CONFIGURATION_MANAGEMENT_AUTOMATION';
UPDATE skills SET name = 'GitOps' WHERE code = 'GITOPS_CONTINUOUS_DELIVERY';
UPDATE skills SET name = 'Relational Databases' WHERE code = 'RELATIONAL_DATABASE_DESIGN_ADMINISTRATION';
UPDATE skills SET name = 'NoSQL Databases' WHERE code = 'NOSQL_DATABASE_ENGINEERING';
UPDATE skills SET name = 'Data Modeling' WHERE code = 'DATA_MODELING_NORMALIZATION';
UPDATE skills SET name = 'Database Performance Tuning' WHERE code = 'DATABASE_PERFORMANCE_TUNING_INDEXING';
UPDATE skills SET name = 'ETL / ELT' WHERE code = 'ETL_ELT_PIPELINE_DEVELOPMENT';
UPDATE skills SET name = 'Big Data Processing' WHERE code = 'BIG_DATA_PROCESSING_FRAMEWORKS';
UPDATE skills SET name = 'Stream Processing' WHERE code = 'STREAM_PROCESSING_MESSAGING_SYSTEMS';
UPDATE skills SET name = 'Machine Learning' WHERE code = 'MACHINE_LEARNING_MODEL_DEVELOPMENT_DEPLOYMENT';
UPDATE skills SET name = 'Deep Learning' WHERE code = 'DEEP_LEARNING_NEURAL_NETWORK_ENGINEERING';
UPDATE skills SET name = 'NLP' WHERE code = 'NATURAL_LANGUAGE_PROCESSING_NLP';
UPDATE skills SET name = 'LLM Engineering' WHERE code = 'LARGE_LANGUAGE_MODEL_LLM_APPLICATION_ENGINEERING';
UPDATE skills SET name = 'MLOps' WHERE code = 'MLOPS_MODEL_LIFECYCLE_MANAGEMENT';
UPDATE skills SET name = 'Computer Vision' WHERE code = 'COMPUTER_VISION_ENGINEERING';
UPDATE skills SET name = 'Statistics & A/B Testing' WHERE code = 'STATISTICAL_ANALYSIS_EXPERIMENTATION';
UPDATE skills SET name = 'Application Security' WHERE code = 'APPLICATION_SECURITY_APPSEC';
UPDATE skills SET name = 'Cloud Security' WHERE code = 'CLOUD_SECURITY_ENGINEERING';
UPDATE skills SET name = 'Identity & Access Management' WHERE code = 'IDENTITY_ACCESS_MANAGEMENT_IAM';
UPDATE skills SET name = 'Penetration Testing' WHERE code = 'PENETRATION_TESTING_VULNERABILITY_ASSESSMENT';
UPDATE skills SET name = 'Security Operations' WHERE code = 'SECURITY_OPERATIONS_INCIDENT_RESPONSE';
UPDATE skills SET name = 'Test Automation' WHERE code = 'TEST_AUTOMATION_ENGINEERING';
UPDATE skills SET name = 'Performance Testing' WHERE code = 'PERFORMANCE_LOAD_TESTING';
UPDATE skills SET name = 'Quality Engineering' WHERE code = 'CONTINUOUS_TESTING_QUALITY_ENGINEERING';
UPDATE skills SET name = 'API Testing' WHERE code = 'API_CONTRACT_TESTING';
UPDATE skills SET name = 'Android Development' WHERE code = 'NATIVE_ANDROID_DEVELOPMENT';
UPDATE skills SET name = 'iOS Development' WHERE code = 'NATIVE_IOS_DEVELOPMENT';
UPDATE skills SET name = 'Cross-Platform Mobile' WHERE code = 'CROSS_PLATFORM_MOBILE_DEVELOPMENT';
UPDATE skills SET name = 'Frontend Frameworks' WHERE code = 'MODERN_FRONTEND_FRAMEWORKS';
UPDATE skills SET name = 'Frontend Performance' WHERE code = 'FRONTEND_PERFORMANCE_ENGINEERING';
UPDATE skills SET name = 'State Management' WHERE code = 'STATE_MANAGEMENT_COMPONENT_ARCHITECTURE';
UPDATE skills SET name = 'Accessibility (a11y)' WHERE code = 'ACCESSIBILITY_ENGINEERING_A11Y';
UPDATE skills SET name = 'Networking' WHERE code = 'NETWORK_ARCHITECTURE_PROTOCOLS';
UPDATE skills SET name = 'Linux Administration' WHERE code = 'LINUX_SYSTEMS_ADMINISTRATION';
UPDATE skills SET name = 'Virtualization' WHERE code = 'VIRTUALIZATION_HYPERVISOR_MANAGEMENT';
UPDATE skills SET name = 'Blockchain Development' WHERE code = 'BLOCKCHAIN_SMART_CONTRACT_DEVELOPMENT';
UPDATE skills SET name = 'IoT Development' WHERE code = 'INTERNET_OF_THINGS_IOT_ENGINEERING';
UPDATE skills SET name = 'AR / VR Development' WHERE code = 'AUGMENTED_VIRTUAL_REALITY_DEVELOPMENT';
UPDATE skills SET name = 'Agile Delivery' WHERE code = 'AGILE_DELIVERY_LEADERSHIP';
UPDATE skills SET name = 'Technical Project Management' WHERE code = 'TECHNICAL_PROGRAM_PROJECT_MANAGEMENT';
UPDATE skills SET name = 'Git & Version Control' WHERE code = 'VERSION_CONTROL_CODE_COLLABORATION';
UPDATE skills SET name = 'Technical Documentation' WHERE code = 'TECHNICAL_DOCUMENTATION_KNOWLEDGE_MANAGEMENT';
UPDATE skills SET name = 'Stakeholder Collaboration' WHERE code = 'CROSS_FUNCTIONAL_STAKEHOLDER_COLLABORATION';
UPDATE skills SET name = 'Technical Leadership' WHERE code = 'MENTORSHIP_TECHNICAL_LEADERSHIP';
