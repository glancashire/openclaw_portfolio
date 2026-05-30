# Phase L2 — Complete explicit quote override wiring

## Objective
Finish the partially landed explicit quote-override lane by promoting approved-instrument `external_quote_symbol` metadata into the top-level parsed instrument contract and verifying that reporting-time quote resolution actually consumes it. Close the EMUAA stale-snapshot gap end-to-end and preserve the already-landed account-vs-holdings P&L/reporting work.

## Risks / dependencies
- Approved-instrument parsing is shared infrastructure, so promotion changes must not break existing metadata consumers.
- Artifact regeneration will touch generated files; stage only the files needed for this reporting phase.
- External fallback remains best-effort; tests must tolerate Yahoo unavailability while still proving mapping behavior.

## Action checklist
- [ ] Promote `external_quote_symbol` metadata to a top-level `externalQuoteSymbol` field in approved-instrument parsing.
- [ ] Add regression coverage proving explicit override promotion and precedence over venue heuristics.
- [ ] Re-run quote-resolution and reporting-focused tests.
- [ ] Regenerate summary/dashboard artifacts and verify EMUAA resolves with `externalSymbol=EMUAA.SW` and no longer depends on stale snapshot fallback when Yahoo responds.
- [ ] Re-run safe lane and broader verification.
- [ ] Commit and push Phase L completion.

## Acceptance criteria
- `readApprovedInstruments()` exposes `externalQuoteSymbol` when configured in notes metadata.
- `mapExternalQuoteSymbol()` prefers the explicit override over heuristic venue suffix mapping.
- EMUAA resolves through the explicit override path in live artifact generation.
- Focused tests, safe lane, and broader verification are green.
