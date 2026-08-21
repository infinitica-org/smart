# Local preferences (example — copy to preferences.md)

Agents **must** read `.cursor/local/preferences.md` when present and follow it for this developer across all chats.

```yaml
# Communication
verbosity: concise          # concise | normal | thorough
explain_before_big_edits: true
ask_before_commit: true
ask_before_push: true
ask_before_pr: false        # false = open PR when work is shippable (still follow team workflow)

# Engineering style
prefer_small_prs: true
run_quality_gates: always   # always | before_pr | ask
default_test_scope: affected # affected | full | ask
notes_style: bullets

# Backend (example — tailor to your role)
prisma_migrations: only_if_i_am_vv
redis_ttl_required: true
never_direct_llm_sdk: true

# Tools / env
shell: powershell           # powershell | bash
os: windows
package_manager: pnpm

# Standing instructions (freeform — agents treat as durable)
standing:
  - Prefer fixing root cause over band-aids
  - Do not invent scope outside the ticket
  - Update working-memory.md when sprint focus changes
```
