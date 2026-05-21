# Phase 179D Plan — UBSPX Alternatives Decision Support

## Objectives
- Convert the prior alternative-ETF analysis into a durable repo artifact the operator can actually use.
- Focus on operational decision support, not just TER/replication facts.
- Capture candidate funds, exclusions, venue/operational-confidence notes, and clear replacement guidance for future approval workflows.

## Current state analysis
- The repo now has stronger venue/timing diagnostics, but the operator still lacks a committed decision artifact for replacing UBSPX if execution risk remains unacceptable.
- Prior live analysis identified strong candidates (iShares Core, Vanguard, Xtrackers 4C, SPDR) and excluded synthetic options, but that work is not yet codified in a maintained project artifact.
- This phase is mostly documentation/reporting and should not disturb execution safety gates.

## Risks / dependencies
- Market/fund details can age; the artifact should be framed as decision support captured on this date, not timeless truth.
- Overstating operational confidence without live routing validation would be misleading.
- The artifact should be easy to update later without duplicating logic across multiple docs.

## Actionable checklist
- [ ] Create a committed markdown artifact for UBSPX alternatives and replacement decision guidance.
- [ ] Include candidate list, exclusions, rationale, operational confidence, and recommended fallback ordering.
- [ ] Add tests or doc-contract checks if needed so the artifact remains present and structured.
- [ ] Run targeted checks and the broader repo verification suite.
- [ ] Commit and push the completed phase.

## Acceptance criteria
- A durable repo artifact exists for UBSPX replacement decision support.
- The artifact clearly separates fund-quality attributes from operational execution-confidence considerations.
- Exclusions and recommendation ordering are explicit.
- Targeted checks and broader verification pass.
