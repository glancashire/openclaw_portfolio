# Phase Cleanup-1G — Deprecated config key migration (NO-OP)

**Date:** 2026-06-01 21:10 UTC
**Status:** closed without changes
**Tranche:** 1

## Verdict

Verified the previously-noted "`messages.groupChat.visibleReplies` deprecated" warning is no longer present after the OpenClaw `2026.5.6 → 2026.5.28` update applied during Phase UX-1.

## Evidence

- `gateway config.schema.lookup messages.groupChat.visibleReplies` returns:
  - `title: "Group Visible Replies"`
  - `enum: ["automatic", "message_tool"]` (or boolean)
  - `tags: ["advanced"]`
  - **No deprecation flag.**
- `gateway config.get messages.groupChat.visibleReplies` (full config dump) shows:
  - `valid: true`
  - `issues: []`
  - `warnings: []`
  - `legacyIssues: []`
- `openclaw doctor` warnings: only `plaintext secret-bearing config` and `Gateway bound to "lan"` — no field-level deprecations.

## Outcome

- No config edit required.
- The earlier "deprecated field" note in `memory/2026-06-01.md` was stale (carry-over from before the daemon picked up the new schema).
- `CURRENT_PLAN.md` will tick off 1G; future config tidy is unnecessary unless OpenClaw deprecates the path again.
