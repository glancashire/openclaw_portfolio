# Basket Envelope Schema

_Reference for the proposal / approval / reproposal envelope used by the basket execution pipeline. Reflects phases 184–200._

## Top-level fields (proposal + approval + reproposal)

| Field | Type | Required | Added | Description |
|---|---|---|---|---|
| `schemaVersion` | string | yes | 184 | Always `"1.0"`. Bump only on breaking schema change. |
| `approvalId` | string | yes | 184 | Globally unique id; format `basket-<portfolio>-<YYYYMMDDTHHMM>` or `…-reproposal-<n>`. |
| `parentApprovalId` | string \| null | reproposals only | 190 | Approval id of the basket whose cancelled legs this envelope reproposes. |
| `reproposalVersion` | number | reproposals only | 190 | Monotonic counter per parent (`1, 2, 3…`). |
| `promotedFromProposal` | string | approvals only | 196 | Path to the proposal envelope that was promoted to this approval. |
| `portfolio` | string | yes | 184 | Portfolio id (e.g., `etf`). |
| `createdAt` | ISO timestamp | yes | 184 | When the envelope was generated. |
| `expiresAt` | ISO timestamp | yes | 184 | After this time, runner refuses to execute. Default 4h after creation. |
| `approvedAt` | ISO timestamp | approvals | 196 | When the envelope was promoted from proposal to approved. |
| `status` | enum | yes | 184 | `pending_user_approval` \| `approved` \| `submitted` \| `filled` \| `cancelled` \| `partial`. |
| `executionPolicy` | object | yes | 184 | `{ continueOnIndependentFailure, requireCompactReapprovalOnPriceDrift, substitutionAllowed }`. |
| `legs` | array | yes | 184 | See leg schema below. |
| `summary` | string | yes | 184 | One-line human description. |
| `source` | string | proposals | 195 | E.g., `auto_generated_proposal`. |
| `requiresOperatorAttention` | boolean | proposals | 200 | True if any leg has degraded quote quality. |
| `quoteQualitySummary` | object | proposals | 200 | `{ tiers: { live, one_sided, stale_only, unknown }, attentionLegIds }`. |

## Leg schema

| Field | Type | Required | Added | Description |
|---|---|---|---|---|
| `legId` | string | yes | 184 | `leg-1`, `leg-2`, …. Stable within an envelope. |
| `instrument` | string | yes | 184 | ISIN. |
| `ibkrSymbol` | string | yes | 184 | Broker symbol (e.g., `SPMCHA`). |
| `conid` | string \| number | yes | 184 | IBKR contract id. |
| `action` | enum | yes | 184 | `BUY` \| `SELL` (sell not yet implemented). |
| `quantity` | number | yes | 184 | Shares. |
| `limitPrice` | number | yes | 184 | Limit price in `currency`. |
| `currency` | string | yes | 184 | E.g., `CHF`, `EUR`. |
| `exchange` | string | yes | 184 | E.g., `SMART`. |
| `primaryExchange` | string | yes | 184 | E.g., `EBS`. |
| `maxAttempts` | number | yes | 184 | 1 (single-attempt; reproposal is the retry mechanism). |
| `retryPolicy` | enum | yes | 184 | `none`. |
| `allowSubstitution` | boolean | yes | 184 | False (substitution not implemented). |
| `status` | enum | yes | 184 | `pending_user_approval` \| `approved` \| `submitted` \| `filled` \| `cancelled` \| `needs_manual_review`. |
| `estimatedChf` | number | proposals | 195 | qty × limit × fxToChf. |
| `referenceAsk` | number \| null | proposals | 195 | Ask used for sizing, if available. |
| `referenceClose` | number \| null | proposals | 195 | Close used for sizing fallback. |
| `quoteQuality` | object \| null | proposals | 200 | `{ tier, missingFields, observedFields }`. |
| `previousLimit` | number | reproposals | 190 | Limit of the cancelled leg this reproposes. |
| `quoteAsk` | number \| null | reproposals | 190 | Ask at reproposal time. |
| `quoteLastClose` | number \| null | reproposals | 190 | Close at reproposal time. |
| `reason` | string | reproposals | 190 | Why this leg is being reproposed. |

## Quote-quality tiers

| Tier | Severity | Meaning |
|---|---|---|
| `live` | ok | Ask + last with recent timestamp present. |
| `one_sided` | warning | Either ask OR live last present, not both. |
| `stale_only` | attention | Only close available (no live trades / no two-sided quote). |
| `unknown` | critical | No usable quote data. |

## Runtime state files

| Path | Content |
|---|---|
| `runtime/basket-proposals/<portfolio>/` | Active proposal envelopes. |
| `runtime/approved-order-baskets/<portfolio>/` | Approved baskets (the canonical execution input). |
| `runtime/basket-reproposals/<portfolio>/` | Active reproposal envelopes. Older versions auto-archived to `.superseded/`. |
| `runtime/basket-runs/<portfolio>/` | Per-approval execution state (legs, broker order ids, terminal statuses). |
| `runtime/circuit-breakers/<portfolio>/` | Tripped circuit breakers (Phase 199). |

## Related code

- `src/execution/basketApprovalStore.js` — schema validation for approval envelopes.
- `src/execution/basketProposalGenerator.js` — produces proposals from live holdings/cash.
- `src/execution/basketReproposalBuilder.js` — produces reproposals from cancelled legs.
- `src/execution/basketReproposalPromoter.js` — promotes a reproposal envelope into an approved basket.
- `src/execution/basketExecutionRunner.js` — transmits + monitors + reconciles.
- `src/execution/basketLifecycle.js` — orchestration around runner (monitor + reconcile + mirror + notify + resync + reproposal).
- `src/execution/cancelLoopBreaker.js` — circuit breaker over the lineage.
- `src/execution/quoteQuality.js` — classifies snapshot shapes into tiers.
