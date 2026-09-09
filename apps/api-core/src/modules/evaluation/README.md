# Evaluation Module

**Owner:** Ramansh  
**Reviewer:** Tino (@brittytino)

## Purpose & Boundary

Produces raw scores and interview verdicts. LLM traffic goes only through `AiGatewayService`.
Does not write `SkillClaim` status (assessment / VB).

## SE-T02

- `POST /api/v1/evaluation/skill-interview/questions` — three questions (`skill-interview-examiner@1`)
- `POST /api/v1/evaluation/skill-interview/grade` — pass/fail + one-line why (`skill-interview-grader@1`)
- `POST /api/v1/evaluation/skill-form/run-code` — simulate compile/run vs visible examples (`sde-skill-code-runner@1`); no marks
- Unit tests stub the gateway; adapters are never called in CI.
