# Phase D plan — Mailgun inbound infrastructure enablement

## Objectives
- Convert the Mailgun inbound lane from vague blocked work into an execution-ready enablement checklist.
- Identify the exact external prerequisites and the repo-side verification steps that follow once access exists.
- Keep the implementation boundary clear: code is already present; infrastructure is what remains.

## Risks / dependencies
- This phase is externally blocked: no real completion is possible without Mailgun route setup and a reachable HTTPS endpoint.
- Partial setup without signed end-to-end verification would create false confidence.
- Secrets/config changes must go through the proper config path when the time comes.

## Actionable checklist
- [ ] Inspect current inbound handler/config touchpoints.
- [ ] Write a precise external dependency checklist.
- [ ] Write the repo-side verification and test sequence for once infra is ready.
- [ ] Add/adjust any small supporting docs for operator handoff.
- [ ] Commit and push the enablement package.

## Acceptance criteria
- [ ] A future operator can execute the infra setup without rediscovering the required steps.
- [ ] The verification sequence is explicit and testable.
- [ ] The lane is clearly marked blocked on external access rather than unfinished repo implementation.
