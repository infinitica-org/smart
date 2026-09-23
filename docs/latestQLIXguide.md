## Plagiarism & Code Provenance QLIX API

Client Integration Guide

Submit software projects, receive an AI-verified originality review, add optional SMART competency assessment, and export client-ready evidence through one asynchronous

API.

|                    | Current contract                                        |
| ------------------ | ------------------------------------------------------- |
| API base           | https://qlix.exora.solutions/api/v1                     |
| Primary use        | GitHub, ZIP/project, document, and pasted-text checks   |
| Final state        | completed, after mandatory AI verification              |
| Optional extension | SMART competency assessment for GitHub and ZIP projects |
| Schema basis       | Live OpenAPI 1.0.0 retrieved 16 September 2026          |

Prepared for client integration and sales discussions. Secrets, internal test identifiers, debugging notes, and implementation-only details are intentionally excluded.

## 1. What QLIX Provides

QLIX fingerprints submitted code or text, searches public and workspace sources, measures overlap, evaluates provenance and repository history, and sends the engine draft through a mandatory AI review before publishing a final report.

- \- Similarity and provenance findings, with cited material reported separately.

- \- Evidence clusters that avoid treating mirrors or vendored copies as separate incidents.

- \- Commit-history signals for GitHub submissions when history is available.

- \- AI-authorship likelihood kept separate from source-reuse findings.

- \- Optional SMART assessment against a supplied competency blueprint.

- \- Exports in Markdown, HTML, PDF, JSON, and SARIF.

## 2. Recommended Integration Flow

| Step                                                                                                                                               | Client action                                                  | QLIX response                               |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------- |
| 1                                                                                                                                                  | Submit exactly one source: text, githubUrl, or multipart file. | 202 with checkId and queued.                |
| 2                                                                                                                                                  | Poll every 5-10 seconds or read /activity incrementally.       | Partial evidence and progress.              |
| 3                                                                                                                                                  | Stop on completed or failed.                                   | Only completed is publishable.              |
| 4                                                                                                                                                  | Read detail, /skills, or export.                               | Use JSON/SARIF for systems; PDF for people. |
| 5                                                                                                                                                  | Optionally request SMART reassessment.                         | Poll smartAssessmentStatus separately.      |
| queued -> running -> engine_complete -> ai_verifying -> completed                                                                                  |                                                                |                                             |
|                                                                                                                                                    |                                                                | \-> failed                                  |
| Important: engine_complete and ai_verifying are draft states. A report is final only when status is completed and agentReview.status is completed. |                                                                |                                             |

Important: engine_complete and ai_verifying are draft states. A report is final only when status is completed and agentReview.status is completed.

## 3. Authentication and Scopes

Use either header form. A key is organization-bound, so request bodies do not carry orgId.

Authorization: Bearer qlix_live_your_key

\# Alternative

X-Api-Key: qlix_live_your_key

| Scope            | Operations                                                                  |
| ---------------- | --------------------------------------------------------------------------- |
| plagiarism:read  | List/read checks, activity, skills, and exports.                            |
| plagiarism:write | Submit/delete/redo, AI review, SMART assessment, match review, and sharing. |

## 4. Submit a Check

POST /plagiarism/checks accepts application/json for text or GitHub submissions and multipart/form-data for a document or ZIP archive up to 2 GB. Supply exactly one of text, githubUrl, or file.

Use Idempotency-Key (maximum 255 characters). Reusing a key returns the original check and its current status instead of creating or billing a duplicate.

## Submission fields

| Field             | Type / limit              | Meaning                                                                         |
| ----------------- | ------------------------- | ------------------------------------------------------------------------------- |
| text              | string, 1-2,000,000 chars | Pasted source or prose. Mutually exclusive with githubUrl and file.             |
| githubUrl         | string                    | Repository URL. Snapshot is pinned to a commit; external discovery is always    |
|                   |                           | enabled.                                                                        |
| file              | binary, multipart         | Document or ZIP/project archive, up to 2 GB.                                    |
| title             | string, max 300           | Client-facing title.                                                            |
| contentType       | text                      | code                                                                            | How the submission should be analyzed. |
| language          | string, max 40            | Optional language hint.                                                         |
| sensitivity       | low                       | balanced                                                                        | high                                   | Detection threshold; default balanced. |
| baselineUrl       | string                    | Known upstream GitHub repository for direct comparison.                         |
| externalDiscovery | boolean                   | Search GitHub/public web. Always true for githubUrl.                            |
| archive           | boolean                   | Add to workspace comparison archive; default true.                              |
| smartContext      | object, max 256 KiB       | Optional competency assessment request; GitHub or ZIP only.                     |
| reviewModel       | string, max 200           | Optional tool-capable reviewer model. Omit for Claude Haiku 4.5; invalid values |
|                   |                           | return invalid_review_model.                                                    |

## Accepted response

{

"checkId": "generated_check_id",

"status": "queued",

"reviewModel": null

}

## 5. Submission Examples

## GitHub repository

```
curl -sS -X POST "\$BASE/plagiarism/checks" \
-H "Authorization: Bearer $QLIX_API_KEY" \
-H "Content-Type: application/json" \
-H "Idempotency-Key: $PROJECT_ID:$SKILL" \
-d '{
"githubUrl": "https://github.com/owner/repo",
"title": "owner/repo",
"contentType": "code",
"sensitivity": "balanced",
"archive": true,
"reviewModel": "anthropic/claude-haiku-4.5"
}'
```

## ZIP or project archive

```
curl -sS -X POST "\$BASE/plagiarism/checks" \
-H "Authorization: Bearer $QLIX_API_KEY" \
-H "Idempotency-Key: zip-check-001" \
-F "file=@./submission.zip" \
-F "title=Student submission A" \
-F "contentType=code" \
-F "sensitivity=balanced" \
-F "externalDiscovery=true" \
-F "archive=true"
```

For multipart SMART submissions, send smartContext as a JSON-serialized form field. ZIP uploads may lack Git history; present that as unavailable evidence, not as proof of a clean history.

## Pasted text

```
curl -sS -X POST "\$BASE/plagiarism/checks" \
-H "Authorization: Bearer $QLIX_API_KEY" \
-H "Content-Type: application/json" \
-d '{
"text": "content to evaluate",
"title": "Essay draft",
"contentType": "text",
"language": "en",
"archive": false
}'
```

## 6. Poll and Read the Final Result

curl -sS "\$BASE/plagiarism/checks/\$CHECK_ID" \

-H "Authorization: Bearer \$QLIX_API_KEY"

The current detail response exposes the most useful fields at the top level and also includes check, which carries the full PlagiarismCheck record and engine report. Do not assume the entire response is wrapped inside check.

| Field                    | Meaning                                                                                 |
| ------------------------ | --------------------------------------------------------------------------------------- |
| checkId                  | Identifier used by every check-specific endpoint.                                       |
| status                   | queued, running, engine_complete, ai_verifying, completed, or failed.                   |
| similarityIndex          | Primary 0-100 share found elsewhere; common code is excluded for code checks.           |
| similarityExcludingCited | Similarity after cited/attributed passages are excluded.                                |
| confidence               | low, medium, high, or null until available.                                             |
| aiLikelihood             | Machine-authorship estimate, independent of source reuse and SMART.                     |
| agentReview              | Mandatory review status, model, attempt, errorMessage, and verdict.                     |
| clientRef                | Private SMART correlation identifiers; omitted from public shares.                      |
| smartAssessmentStatus    | null, pending, evidence_ready, completed, or failed.                                    |
| smartAssessment          | SMART scores, ceiling, observations, qualitySignals, and gaps.                          |
| previousSmartAssessment  | Prior filed result retained only while a SMART re-run is pending.                       |
| report.provenance        | Convenience view of history and provenance axes.                                        |
| check                    | Full check record: matches, report, hashes, budget, errors, dates, and source metadata. |

## Agent verdict fields

agentReview.status

agentReview.model

agentReview.attempt

agentReview.errorMessage

agentReview.verdict.summary

agentReview.verdict.suspicionLevel

agentReview.verdict.engineAgreement

agentReview.verdict.independentFindings[]

agentReview.verdict.recommendedActions[]

## 7. Choose the Review Model

Add reviewModel to the JSON request body. The selection is stored on the check and reused for later reviews of that check. Leave it out to use the current default, Claude Haiku 4.5.

| Endpoint                                           | When to use reviewModel                                  |
| -------------------------------------------------- | -------------------------------------------------------- |
| POST /plagiarism/checks                            | Choose the model when submitting a new check.            |
| POST /plagiarism/checks/{checkId}/smart-assessment | Choose the model for a SMART re-assessment.              |
| POST /plagiarism/checks/{checkId}/agent-review     | Choose the model when re-running the originality review. |

## Accepted names

- \- Full OpenRouter ID, such as openai/gpt-4.1 or anthropic/claude-sonnet-4.5. The openrouter/ prefix is optional.

- \- Short name, such as gpt-4.1. QLIX resolves it against the OpenRouter catalogue and prefers OpenAI when more than one provider matches.

- \- Exora model name using the exora/... namespace.

## Submission example

```
curl -sS -X POST "\$BASE/plagiarism/checks" \
-H "Authorization: Bearer $QLIX_API_KEY" \
-H "Content-Type: application/json" \
-d '{
"githubUrl": "https://github.com/owner/repo",
"contentType": "code",
"reviewModel": "anthropic/claude-haiku-4.5"
}'
```

## Re-run the originality review

```
curl -sS -X POST \
"$BASE/plagiarism/checks/$CHECK_ID/agent-review" \
-H "Authorization: Bearer $QLIX_API_KEY" \
-H "Content-Type: application/json" \
-d '{"reviewModel":"openai/gpt-4.1"}'
```

The selected model must support tool calling because the reviewer files its result through a tool. Otherwise the API returns 400 invalid_review_model.

Current validation caveat: exora/... names are accepted without catalogue validation, so even an unknown name may be accepted and start a run. Clients should use configured Exora model IDs only; server-side validation should be tightened before exposing free-form Exora model selection broadly.

Bring-your-own-provider credentials are not supported by this field. Allowing clients to supply their own provider and API key requires separate product work and secure client-secret storage, access controls, and rotation.

## 8. JavaScript Example

```
const BASE = "https://qlix.exora.solutions/api/v1";
const API_KEY = process.env.QLIX_API_KEY;
async function qlix(path, options = {}) {
const res = await fetch(`${BASE}${path}`, {
...options,
headers: {
Authorization: `Bearer ${API_KEY}`,
...(options.headers || {}),
},
});
const text = await res.text();
const body = text ? JSON.parse(text) : null;
if (!res.ok) {
throw new Error(`${res.status}: ${body?.error?.message || text}`);
}
return body;
}
async function runRepoCheck(githubUrl) {
const submit = await qlix("/plagiarism/checks", {
method: "POST",
headers: {
"Content-Type": "application/json",
"Idempotency-Key": crypto.randomUUID(),
},
body: JSON.stringify({
githubUrl,
title: githubUrl.replace("https://github.com/", ""),
contentType: "code",
sensitivity: "balanced",
archive: true,
}),
});
while (true) {
const result = await qlix(`/plagiarism/checks/${submit.checkId}`);
if (result.status === "completed") return result;
if (result.status === "failed") {
throw new Error(result.check?.errorMessage ||
result.agentReview?.errorMessage || "Check failed");
}
await new Promise((resolve) => setTimeout(resolve, 7000));
}
}
```

This example reads result.status and result.similarityIndex from the top level. The full engine record remains available as result.check.

## 9. Python Example

```
import os, time, uuid, requests
BASE = "https://qlix.exora.solutions/api/v1"
headers = {"Authorization": f"Bearer {os.environ['QLIX_API_KEY']}"}
submit = requests.post(
f"{BASE}/plagiarism/checks",
headers={
**headers,
"Content-Type": "application/json",
"Idempotency-Key": str(uuid.uuid4()),
},
json={
"githubUrl": "https://github.com/owner/repo",
"title": "owner/repo",
"contentType": "code",
"sensitivity": "balanced",
"archive": True,
},
timeout=30,
)
submit.raise_for_status()
check_id = submit.json()["checkId"]
while True:
response = requests.get(
f"{BASE}/plagiarism/checks/{check_id}",
headers=headers,
timeout=30,
)
response.raise_for_status()
result = response.json()
if result["status"] == "completed":
print(result["similarityIndex"])
print(result["agentReview"]["verdict"]["summary"])
break
if result["status"] == "failed":
detail = result.get("check") or {}
review = result.get("agentReview") or {}
raise RuntimeError(
detail.get("errorMessage")
or review.get("errorMessage")
or "Check failed"
)
time.sleep(7)
```

## 10. Endpoint Quick Reference

| Method | Path after /api/v1                                    | Scope | Purpose                               |
| ------ | ----------------------------------------------------- | ----- | ------------------------------------- |
| GET    | /plagiarism/checks?limit=25                           | read  | List newest checks; limit 1-100.      |
| POST   | /plagiarism/checks                                    | write | Submit text, GitHub URL, document,    |
|        |                                                       |       | or ZIP.                               |
| GET    | /plagiarism/checks/{checkId}                          | read  | Read top-level result and full nested |
|        |                                                       |       | check.                                |
| DELETE | /plagiarism/checks/{checkId}                          | write | Delete check and withdraw archived    |
|        |                                                       |       | passages.                             |
| GET    | /plagiarism/checks/{checkId}/activity?after=-1        | read  | Read progress events; fetch           |
|        |                                                       |       | incrementally by seq.                 |
| GET    | /plagiarism/checks/{checkId}/skills                   | read  | Read language, library, and quality   |
|        |                                                       |       | signals.                              |
| GET    | /plagiarism/checks/{checkId}/export?format=md         | read  | Export md, html, pdf, json, or sarif. |
| POST   | /plagiarism/checks/{checkId}/redo                     | write | Queue a fresh check from the stored   |
|        |                                                       |       | source.                               |
| POST   | /plagiarism/checks/{checkId}/agent-review             | write | Start/retry AI review; optionally     |
|        |                                                       |       | choose model.                         |
| POST   | /plagiarism/checks/{checkId}/smart-assessment         | write | Assess/reassess stored project        |
|        |                                                       |       | competencies.                         |
| POST   | /plagiarism/checks/{checkId}/share                    | write | Create public report link after       |
|        |                                                       |       | completion.                           |
| DELETE | /plagiarism/checks/{checkId}/share                    | write | Revoke public share link.             |
| POST   | /plagiarism/checks/{checkId}/matches/{matchId}/review | write | Confirm/dismiss/open a match and      |
|        |                                                       |       | rescore.                              |

The former GET /plagiarism/reviewer-agent route is not present in the current public OpenAPI contract and is intentionally omitted.

## Source of truth

Interactive API reference: https://qlix.exora.solutions/docs/api

Raw OpenAPI: https://qlix.exora.solutions/api/v1/openapi.json

## 11. Endpoint Behavior and Status Codes

| Endpoint                       | Success | Important conditions                                                      |
| ------------------------------ | ------- | ------------------------------------------------------------------------- |
| POST /checks                   | 202     | 400 invalid_body, invalid_smart_context, invalid_review_model, or         |
|                                |         | plagiarism_invalid_input.                                                 |
| GET /checks/{id}               | 200     | 404 when unknown; exposes top-level summary plus check.                   |
| DELETE /checks/{id}            | 200     | Returns deleted and passagesWithdrawn.                                    |
| GET /activity                  | 200     | after is highest seq already consumed; default -1.                        |
| GET /skills                    | 200     | 409 no_code_analysis for pasted text/single file.                         |
| GET /export                    | 200     | 409 not_ready until status completed; 400 for invalid format.             |
| POST /redo                     | 202     | 400 if active or no stored source. GitHub is re-read at current revision. |
| POST /agent-review             | 202     | 400 until engine evidence is ready. Body may contain reviewModel.         |
| POST /smart-assessment         | 200/202 | 409 not_ready, no_code_analysis, or smart_assessment_in_progress.         |
| POST /share                    | 201     | 409 until completed. Anyone holding the URL can read content/report.      |
| DELETE /share                  | 200     | 404 if check/share is unavailable.                                        |
| POST /matches/{matchId}/review | 200     | reviewState: confirmed, dismissed, or open; rescores similarity.          |

## Common error envelope

```
{
"error": {
"code": "not_ready",
"message": "The report is not ready to export."
}
}
```

All routes may return 401 unauthorized, 403 insufficient_scope, or 429 rate_limited. API keys are limited to 300 requests per minute unless the deployment is configured differently.

## 12. Exports, Sharing, Deletion, and Match Review

## Exports

| format | Content type           | Best use                                   |
| ------ | ---------------------- | ------------------------------------------ |
| md     | text/markdown          | Human-readable text pipelines; default.    |
| html   | text/html              | Browser/client rendering.                  |
| pdf    | application/pdf        | Human-facing review packet.                |
| json   | application/json       | Stable machine-readable evidence contract. |
| sarif  | application/sarif+json | Code-scanning and security workflows.      |

Prefer JSON or SARIF exports over parsing check.report directly. The internal report shape follows engineVersion and is not separately versioned.

## Sharing

```
curl -X POST "\$BASE/plagiarism/checks/\$CHECK_ID/share" \
-H "Authorization: Bearer $QLIX_API_KEY"
curl -X DELETE "$BASE/plagiarism/checks/$CHECK_ID/share" \
-H "Authorization: Bearer $QLIX_API_KEY"
```

A share link is public to anyone who holds it and may expose submitted content. clientRef remains private and is not included in public share responses.

## Human match review

```
curl -X POST "\$BASE/plagiarism/checks/\$CHECK_ID/matches/\$MATCH_ID/review" \
-H "Authorization: Bearer $QLIX_API_KEY" \
-H "Content-Type: application/json" \
-d '{"reviewState":"dismissed","note":"Known template code"}'
```

Reviewing one match changes its reviewState and recalculates the check similarity figures.

## Deletion

DELETE /checks/{checkId} deletes the check and withdraws its passages from the workspace comparison archive. The response includes deleted and passagesWithdrawn.

## 13. Codebase Skills Analysis

GET /plagiarism/checks/{checkId}/skills returns deterministic repository/ZIP measurements. It is evidence, not a proficiency decision.

| Field          | Meaning                                                                                          |
| -------------- | ------------------------------------------------------------------------------------------------ |
| basis          | repository_analysis.                                                                             |
| engineVersion  | Analysis engine version, nullable.                                                               |
| totals         | analyzedFiles, analyzedTokens, analyzedCharacters, languageCount.                                |
| languages[]    | language, token percentage, tokens, files, filePercentage, averageTokensPerFile, testTokenShare, |
|                | observations.                                                                                    |
| libraries[]    | name, ecosystem, and manifest. Ecosystems: npm, pypi, go, rust, maven, composer, rubygems.       |
| qualitySignals | hasTestsDir, hasCiConfig, hasDockerfile, testTokenShare, primaryLanguages.                       |
| limitations[]  | Plain-language interpretation constraints.                                                       |

## Availability

- \- GitHub and ZIP/project submissions are supported.

- \- Pasted text and single-file checks return 409 no_code_analysis.

- \- Data is available after engine file analysis; overall completion is not required.

- \- Generated, vendored, bundled, and unsupported files are excluded.

## Example response

```
{
"checkId": "...",
"status": "completed",
"basis": "repository_analysis",
"engineVersion": "provenance-1.0.0",
"totals": {
"analyzedFiles": 54,
"analyzedTokens": 48213,
"analyzedCharacters": 391007,
"languageCount": 3
},
"languages": [{
"language": "typescript", "percentage": 71.4,
"tokens": 34424, "files": 38, "filePercentage": 70.4,
"averageTokensPerFile": 906, "testTokenShare": 18.2,
"observations": []
}],
"libraries": [{
"name": "express", "ecosystem": "npm", "manifest": "package.json"
}],
"qualitySignals": {
"hasTestsDir": true, "hasCiConfig": true,
"hasDockerfile": false, "testTokenShare": 18.2,
"primaryLanguages": ["typescript"]
}
}
```

## 14. SMART Assessment Overview

SMART adds competency evidence to a GitHub or ZIP check. It does not replace originality analysis and does not change similarity or provenance. smartContext may be supplied during the initial check, or the same stored snapshot may be reassessed later with POST /smart-assessment.

## SMART state machine

null (not requested) -> pending -> evidence_ready -> completed

\-> failed

If SMART fails, smartAssessmentError explains why. The returned assessment lists every requested competency as NOT_TESTED with LOW confidence and a null proficiency ceiling when no assessment could be made.

## smartContext rules

- \- Required groups: clientRef, projectBrief, skillMapping, competencyContext.

- \- Maximum serialized size is 256 KiB; additional properties are rejected.

- \- clientRef.skillCode must match competencyContext.skillCode.

- \- competencyId values must be unique; 1-100 competencies are allowed.

| Object            | Required fields                                           | Optional fields                          |
| ----------------- | --------------------------------------------------------- | ---------------------------------------- |
| clientRef         | projectId UUID; studentId UUID; skillCode max 200         | skillClaimId UUID                        |
| projectBrief      | problem 20-8000; approach 20-8000; stack 2-1000; outcome  | loomUrl URI; liveUrl URI                 |
|                   | 20-8000                                                   |                                          |
| skillMapping      | specificContribution max 4000                             | componentWorkedOn max 1000;              |
|                   |                                                           | actionsPerformed[30]; decisionsMade[20]; |
|                   |                                                           | constraintsHandled[20]                   |
| competencyContext | skillCode max 200; skillName max 500; competencies[1-100] | None                                     |

SMART is supported only when repository-level code evidence exists. Text and single-file submissions cannot produce a SMART assessment.

## 15. SMART Competencies and Output

## Competency request fields

| Field                | Required | Contract                                                       |
| -------------------- | -------- | -------------------------------------------------------------- |
| competencyId         | Yes      | UUID.                                                          |
| capability           | Yes      | String, max 2000.                                              |
| difficulty           | Yes      | BEGINNER, INTERMEDIATE, PROFICIENT, ADVANCED, or PROFESSIONAL. |
| role                 | Yes      | core, supporting, or critical.                                 |
| observableBehaviours | No       | Up to 50 strings, each max 1000.                               |
| assessmentCriteria   | No       | Up to 50 strings, each max 1000.                               |

## smartAssessment output

| Field                     | Meaning                                                              |
| ------------------------- | -------------------------------------------------------------------- |
| schemaVersion             | smart-assessment-1.0.                                                |
| rubricVersion             | smart-rubric-1.0.                                                    |
| relevanceScore            | 0-100 or null; reviewer-derived.                                     |
| qualityScore              | 0-100 or null; deterministic engine measurement.                     |
| authenticityScore         | 0-100 or null; deterministic engine measurement.                     |
| appliedProficiencyCeiling | BEGINNER, INTERMEDIATE, PROFICIENT, ADVANCED, PROFESSIONAL, or null. |
| competencyObservations[]  | Exactly one item per requested competencyId, in request order.       |
| qualitySignals            | Tests, CI, Dockerfile, test-token share, and primary languages.      |
| gaps[]                    | Up to 10 reviewer-identified gaps.                                   |

## Observation contract

| Field              | Values / rules                                                                 |
| ------------------ | ------------------------------------------------------------------------------ |
| status             | NOT_TESTED, NOT_DEMONSTRATED, UNCERTAIN, PARTIALLY_DEMONSTRATED, DEMONSTRATED. |
| confidence         | LOW, MEDIUM, or HIGH.                                                          |
| evidenceSnippets   | Up to 3 verified repository citations; empty for NOT_TESTED.                   |
| authenticityWeight | Number from 0 to 1.                                                            |

The proficiency ceiling cannot exceed the hardest demonstrated or partially demonstrated competency and is lowered below an unmet critical competency.

## 16. Submit with SMART Context

```
{
"githubUrl": "https://github.com/owner/repo",
"title": "Project assessment",
"contentType": "code",
"sensitivity": "balanced",
"archive": true,
"smartContext": {
"clientRef": {
"projectId": "11111111-1111-4111-8111-111111111111",
"studentId": "22222222-2222-4222-8222-222222222222",
"skillCode": "PYTHON_BACKEND",
"skillClaimId": "33333333-3333-4333-8333-333333333333"
},
"projectBrief": {
"problem": "Build a reliable API for the client workflow.",
"approach": "Implemented routes, validation, persistence, and tests.",
"stack": "Python, FastAPI, PostgreSQL, pytest",
"outcome": "Delivered a tested service with deployment automation.",
"liveUrl": "https://example.com"
},
"skillMapping": {
"specificContribution": "Implemented API and database layers.",
"componentWorkedOn": "backend service",
"actionsPerformed": ["Built endpoints", "Added integration tests"],
"decisionsMade": ["Used async database access"],
"constraintsHandled": ["Kept migrations backward compatible"]
},
"competencyContext": {
"skillCode": "PYTHON_BACKEND",
"skillName": "Python Backend Development",
"competencies": [{
"competencyId": "44444444-4444-4444-8444-444444444444",
"capability": "Build tested REST APIs",
"observableBehaviours": ["Implements validated endpoints"],
"difficulty": "INTERMEDIATE",
"role": "core",
"assessmentCriteria": ["Routes have automated tests"]
}]
}
}
}
```

Poll status and smartAssessmentStatus independently. A check may be ai_verifying while SMART is already evidence_ready, but the originality report is not final until status is completed.

## 17. SMART Re-assessment

Use POST /plagiarism/checks/{checkId}/smart-assessment after the check is completed when the competency blueprint, skill mapping, project brief, or review model changes. The stored repository snapshot is re-read; originality analysis is not rerun and the published similarity verdict is unchanged.

## Request

```
curl -sS -X POST \
"$BASE/plagiarism/checks/$CHECK_ID/smart-assessment?waitSeconds=0" \
-H "Authorization: Bearer $QLIX_API_KEY" \
-H "Content-Type: application/json" \
-d @reassess.json
```

The body requires projectBrief, skillMapping, and competencyContext. clientRef is optional; when omitted, the check's existing clientRef is retained. reviewModel is also optional.

## waitSeconds

| Value       | Behavior                                                                             |
| ----------- | ------------------------------------------------------------------------------------ |
| 0 (default) | Return 202 immediately while assessment runs.                                        |
| 1-150       | Hold the request open; return 200 if completed/failed before timeout, otherwise 202. |

## Poll

```
while true; do
R=$(curl -sS -H "Authorization: Bearer $QLIX_API_KEY" \
"$BASE/plagiarism/checks/$CHECK_ID")
S=$(printf '%s' "$R" | jq -r '.smartAssessmentStatus')
echo "SMART: $S"
[ "$S" = "completed" ] && break
[ "$S" = "failed" ] && break
sleep 8
done
```

During a re-run, previousSmartAssessment preserves the last filed result. When the new run finishes, previousSmartAssessment becomes null and the replacement appears in smartAssessment.

Do not use reassessment when the repository code changed. Submit a new check so the source snapshot, similarity analysis, provenance, and SMART evidence all reflect the new revision.

## 18. Present Results Responsibly

Use the result as evidence and reviewer guidance, not as a legal accusation.

| Use this wording                                 | Avoid this wording                             |
| ------------------------------------------------ | ---------------------------------------------- |
| 30.9% matched published code.                    | 30.9% plagiarized.                             |
| Two evidence clusters need review.               | Eleven sources means eleven copying incidents. |
| Machine-authorship estimate: 41/100.             | The student definitely used AI.                |
| Commit history was unavailable.                  | No commit-history issues were found.           |
| SMART competency status: partially demonstrated. | The score proves professional proficiency.     |

## 19. Production Checklist

- \- Use keys with plagiarism:read and plagiarism:write as required.

- \- Store checkId and send a stable Idempotency-Key on submission retries.

- \- Submit exactly one source: text, githubUrl, or multipart file.

- \- Poll every 5-10 seconds and stop on completed or failed.

- \- Publish only after status and agentReview.status are both completed.

- \- Keep aiLikelihood separate from similarity and SMART authenticityScore.

- \- Group mirrored/vendored sources into evidence clusters in the UI.

- \- Surface coverage warnings, repository-history availability, and quality-signal limitations.

- \- Prefer stable JSON/SARIF exports over parsing the internal report object.

- \- Treat public share URLs as sensitive and revoke them when no longer needed.

- \- Use reassessment for changed competency context; use a new check for changed code.

Contract note: This edition was rebuilt from the live OpenAPI 3.0.3 document (API version 1.0.0) retrieved from the production endpoint on 16 September 2026. Recheck the raw schema before deploying long-lived generated clients.
