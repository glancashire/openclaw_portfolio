# Archive — 2026-06-04 G2 + J batch

Two phases shipped autonomously in the afternoon batch on 2026-06-04. Both green, tests passing 254/254 at handoff. Plans archived after delivery.

| File | Phase | Commit | Tests |
|---|---|---|---|
| `phase-g2-deposits-cron-wiring.md` | G2 — deposits inbox into daily-sync cron | `467fc05` | 30 assertions |
| `phase-j-second-pass-autofix.md` | J — targeted second-pass autofix | `d49af30` | 56 assertions |

Follow-up sentry work (resolveIssue helper) shipped in `0a294ce`. Closes the loop on D-1, D-2, D-3, D-4 — see commit messages and `docs/decisions-pending.md` history for context.
