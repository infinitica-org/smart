# `.cursor/local/` — personal agent context (gitignored)

Not committed. Survives across agents/chats on **your** machine. Team KB stays under `.cursor/kb/` + `.cursor/rules/`.

## Setup (once)

```bash
cp .cursor/local/IDENTITY.example.md .cursor/local/IDENTITY.md
cp .cursor/local/preferences.example.md .cursor/local/preferences.md
cp .cursor/local/working-memory.example.md .cursor/local/working-memory.md
```

Edit all three. Agents are instructed to load them every session (`08-local-preferences.mdc`).

## Files

| File                 | Purpose                                                                                              |
| -------------------- | ---------------------------------------------------------------------------------------------------- |
| `IDENTITY.md`        | Who you are (name, initials, role)                                                                   |
| **`preferences.md`** | **Durable prefs across agents** — verbosity, ask-before-commit, quality gates, standing instructions |
| `working-memory.md`  | Ephemeral sprint/ticket scratch                                                                      |

## Rules of thumb

- Put anything you want **every** agent to remember about _you_ in `preferences.md`
- Put “what I’m doing this week” in `working-memory.md`
- Never put secrets here if the machine is shared; still do not commit this folder’s private files
