# Evaluation Module

**Owner:** Ramansh  
**Reviewer:** Tino (@brittytino)

## Purpose & Boundary

Produces raw scores and interview verdicts. LLM traffic goes only through `AiGatewayService`.
Does not write `SkillClaim` status (assessment / VB).

## SE-T02

- `POST /api/v1/evaluation/skill-interview/questions` — three questions (`skill-interview-examiner@1`)
- `POST /api/v1/evaluation/skill-interview/grade` — pass/fail + one-line why (`skill-interview-grader@1`)
- Unit tests stub the gateway; adapters are never called in CI.

## SE-T04

- `GET /api/v1/evaluation/cognitive-profile` — own snapshot
- `POST /api/v1/evaluation/cognitive-profile/refresh` — `cognitive-comm-profile@1` via P3_BATCH
- Input is onboarding education/experience/preferences, never skill claims
- Demo seed writes fixture rows for `student@smart.local`
