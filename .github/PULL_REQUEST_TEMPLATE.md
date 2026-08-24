name: Pull Request
description: Open a change against dev (default). Promote qa/main separately.
body:

- type: markdown
  attributes:
  value: |
  Owner is defined by CODEOWNERS / TEAM.md. Tino reviews every PR.
- type: input
  id: ticket
  attributes:
  label: Ticket
  placeholder: S1-VV-04
  validations:
  required: true
- type: textarea
  id: summary
  attributes:
  label: What changed, and why
  validations:
  required: true
- type: checkboxes
  id: dod
  attributes:
  label: Definition of Done
  options: - label: Contracts updated if a DTO/event/route changed - label: Tests cover the promise this PR makes - label: Rate limit / RBAC declared for any new route - label: No secrets committed
