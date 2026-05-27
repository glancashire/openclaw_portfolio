# Wave plan — Outstanding-work closeout (2026-05-27)

- **Status:** active
- **Owner:** bb8 (autonomous implementation per Graham's 07:52 UTC directive)
- **Started:** 2026-05-27
- **Last updated:** 2026-05-27
- **Slug:** wave-plan-2026-05-27-closeout
- **Pattern:** combine-harvester (this file is working memory across sessions)

## Summary

_(Fill in when status = done.)_

## Instructions

### Goal

Close out every open lane surfaced in the 07:30 UTC overview, in autonomous
wave-by-wave fashion: plan → commit-plan → implement → test → commit → push,
then move on. No user prompts between waves. This file is the source of truth.

### Operator decisions captured (07:52 UTC)

| Lane | Decision |
|---|---|
| Mailgun inbound (F) | **Drop.** Console = trusted approval channel. |
| Historical roadmap docs (B) | **Move to `archive/`** (not annotate). |
| Cron consolidation (C) | **Autonomous cleanup.** |
| Health/self-heal (D) | **Tighten** + proceed per bb8's recommendation (i.e. promote safe steps cautiously, gated on soak evidence — implement the tighten step now). |
| Runtime churn (E) | **Identify 3–5 noisiest files and hash-gate their writes.** |
| Rollup F | **Closing pass.** |
| Spec §1 / cancel-portfolio-order | **Do Phase S2.5 — broker-only fallback.** |
| Post-MVP candidates | **All 5 added** to this plan as later waves. |
| SPMCHA over-allocation | **Leave** (no action). |

### Success criteria

- [ ] W1 — Roll-up B + F: historical docs archived; rollup B/F items checked
- [ ] W2 — Roll-up C: cron policy alignment pass, every job matches `docs/operations/cron.md`
- [ ] W3 — Roll-up D: tightened escalation/synth wording in health monitor + regression test
- [ ] W4 — Roll-up E: 3–5 noisiest runtime files gated by content-hash; regression test
- [ ] W5 — Spec §1 / Phase S2.5: `cancel-portfolio-order --broker-only` shipped + tested
- [ ] W6 — Post-MVP #3: Native contract intelligence (4-ISIN sentinel resolved or documented)
- [ ] W7 — Post-MVP #1: Portfolio health model + bounded self-healing (`trade health` / `trade self-heal --dry-run`)
- [ ] W8 — Post-MVP #2: Approval lifecycle UX hardening
- [ ] W9 — Post-MVP #4: Recovery playbooks as executable guidance
- [ ] W10 — Post-MVP #5: Automated verification lanes

Each wave: plan committed → implementation → tests → suite green → commit + push → progress summary → next wave.

### Constraints

- Tests must run continuously; iterate until green before committing the wave.
- `npm test` must exit 0 at the end of every wave.
- No new strategy logic in W1–W5 (closeout). New capability only in W6+ post-MVP waves.
- Don't touch active runtime artifacts (basket-proposals, market-calendar, execution-state) outside of explicit hash-gating work.
- Respect cron invariants in `TOOLS.md` — sandbox mode stays `off`, `bestEffort:true` on every job.

### Out of scope

- Mailgun inbound route work (dropped).
- SPMCHA unwind (Graham chose keep).
- New feature work outside the 10 enumerated waves.

## Progress

_(Newest first. Each wave entry: plan link, commits, test counts, blockers.)_

### Pending start: W1 — Roll-up B + F (doc archive + rollup closing pass)

Plan to write next. Will land:
- `tasks/wave-plan-2026-05-27-closeout.md` (this file) committed
- `phase-W1-doc-archive-and-rollup-closeout-plan.md` committed
- Move misleading historical roadmaps under `archive/`
- Tick Roll-up B and F items in `ROLLUP_OUTSTANDING_PLAN.md`
- Update `scripts/test-repo-root-cleanliness.js` allowlist if needed
- `npm test` green
- Commit + push

## Next

1. Commit this wave-plan file.
2. Start W1: write `phase-W1-doc-archive-and-rollup-closeout-plan.md`, commit, then implement.
3. Iterate W1 → W10 without prompting.

### Open questions

_(None — Graham's 07:52 directive answered all open decisions.)_

### Blockers

_(None.)_
