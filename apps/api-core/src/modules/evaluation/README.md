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

## SE-T03

Project verify never auto-rejects; low confidence → `UNDER_REVIEW`.
Uses `@smart/contracts` `ProjectGithubSnapshot` / report DTOs from the contracts PR — do not add a parallel type.

- Heuristic: duplicate-text Jaccard + tech-age + stack/language mismatch
- LLM: `project-verify@1` via gateway (`P2_ASYNC_EVAL`)
- Persist: existing `projects` / `project_verification_reports`

## VV handoff (do not implement Octokit here)

Prisma (VV-only migrations): encrypted GitHub **repo-read** token (login OAuth is not enough);
`project_github_snapshots` JSON (`ProjectGithubSnapshot`); optional `project_repos`;
report columns `confidence`, `quality_score`, `duplicate_score`, `flags`, `prompt_ref`, `audit_id`.
