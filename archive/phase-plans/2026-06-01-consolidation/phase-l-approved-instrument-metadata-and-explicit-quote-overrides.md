# Phase L — Approved-instrument metadata parsing and explicit quote overrides

## Objective
Finish the quote-identity reconciliation lane by making approved-instrument metadata authoritative for reporting-time external quote resolution. In practice this means parsing richer identity metadata from `portfolio.md` notes and supporting an explicit quote-symbol override so holdings like EMUAA can resolve to the correct Yahoo venue symbol (`EMUAA.SW`) instead of falling back to stale holdings snapshots.

## Risks / dependencies
- Must stay conservative: explicit override beats heuristics; do not introduce aggressive symbol guessing.
- Approved-instrument metadata parsing is shared infrastructure, so changes must not break existing conid/symbol/fx extraction.
- External Yahoo fetches must remain optional fallbacks, not hard requirements.

## Action checklist
- [ ] Extend approved-instrument parsing to retain `ibkr_primary_exchange` and a new explicit external quote symbol override from notes metadata.
- [ ] Update quote-resolution mapping to prefer explicit override over venue heuristics.
- [ ] Add regression tests covering metadata parsing and EMUAA-style explicit override behavior.
- [ ] Regenerate dashboard artifacts and confirm EMUAA resolves away from `holdings_snapshot` when override is present.
- [ ] Re-run focused tests, safe lane, and broader test suite as appropriate.

## Acceptance criteria
- Approved-instrument records expose parsed primary-exchange metadata consistently.
- Quote resolution prefers an explicit metadata override (for example `external_quote_symbol=EMUAA.SW`) when present.
- EMUAA no longer depends on stale holdings snapshot pricing if the explicit override is configured.
- Verification is green and the updated dashboard truth is regenerated from artifacts.
