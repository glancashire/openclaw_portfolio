## [LRN-20260513-001] best_practice

**Logged**: 2026-05-13T16:35:00Z
**Priority**: high
**Status**: pending
**Area**: backend

### Summary
Separate IBKR native market-data request ids from live order ids seeded by `nextValidId`.

### Details
The native client had been using one shared counter for both request ids and order ids. After tightening live-order safety to require `nextValidId`, quote and contract-detail paths started failing too because they also consumed that same counter. The correct split is: request ids can be local/incrementing, while order ids must be seeded from IBKR `nextValidId`.

### Suggested Action
Keep `nextRequestId()` and `nextOrderId()` separate, and add regression tests covering both quote paths and order placement safety.

### Metadata
- Source: conversation
- Related Files: src/brokers/interactive-brokers/nativeClient.js,scripts/test-native-separate-request-and-order-ids.js,scripts/test-native-place-order-requires-nextvalidid.js
- Tags: ibkr,native-client,order-ids,market-data
- Pattern-Key: harden.ibkr_native_id_domains
- Recurrence-Count: 1
- First-Seen: 2026-05-13
- Last-Seen: 2026-05-13

---

## [LRN-20260513-002] best_practice

**Logged**: 2026-05-13T16:35:00Z
**Priority**: high
**Status**: pending
**Area**: backend

### Summary
Conid-based native orders should use minimal contract metadata unless IBKR-confirmed fields are known.

### Details
Live orders were bouncing `Inactive` with broker error 478 because the repo forced repo-side symbol/currency hints onto conid-based orders. IBKR returned a contradictory resolved contract (`requested symbol UBSSLI, in contract CHSPI`). Removing forced symbol/currency from the conid order path allowed IBKR to resolve the contract correctly and the orders then submitted/fillled.

### Suggested Action
For conid-based orders, default to minimal contract fields plus only clearly safe venue hints like `primaryExch` when validated.

### Metadata
- Source: conversation
- Related Files: src/brokers/interactive-brokers/nativeClient.js,scripts/test-native-conid-order-minimal-contract.js
- Tags: ibkr,conid,orders,contract-resolution
- Pattern-Key: harden.ibkr_conid_minimal_contract
- Recurrence-Count: 1
- First-Seen: 2026-05-13
- Last-Seen: 2026-05-13

---

## [LRN-20260513-003] best_practice

**Logged**: 2026-05-13T16:35:00Z
**Priority**: high
**Status**: pending
**Area**: backend

### Summary
Native holdings sync must ignore zero-quantity FX helper rows and derive fallback price/value from `avgCost`.

### Details
After live fills, holdings sync wrote an `EUR.CHF` helper row as if it were a portfolio holding and zeroed invested value because the native position stream did not provide market price/value for every row. Filtering zero-quantity FX helper rows and falling back to `avgCost` restored truthful holdings snapshots and proposal generation.

### Suggested Action
Preserve the helper-row filter in holdings sync and keep normalization fallback logic for native positions. Add regression tests for both behaviors.

### Metadata
- Source: conversation
- Related Files: src/brokers/interactive-brokers/holdingsSync.js,src/brokers/interactive-brokers/types.js,scripts/test-holdings-sync-normalization.js
- Tags: holdings-sync,ibkr,native-positions,portfolio-truth
- Pattern-Key: harden.ibkr_holdings_sync_native_positions
- Recurrence-Count: 1
- First-Seen: 2026-05-13
- Last-Seen: 2026-05-13

---

## [LRN-20260513-004] best_practice

**Logged**: 2026-05-13T16:35:00Z
**Priority**: medium
**Status**: pending
**Area**: docs

### Summary
Raw native contract details for UCITS ETFs can contain the conid even when simplified repo debug scripts accidentally drop it.

### Details
The existing debug scripts for ISIN search were producing rows with `conid: null`, which made native gateway contract discovery look broken. A direct raw `contractDetails` inspection showed the conids were present on `details.contract.conId`, including multiple tradable variants for the same ISIN (currency/venue-specific). The simplified script shape was the problem, not IBKR.

### Suggested Action
Add a raw-detail regression or utility that preserves `contract.conId`, `symbol`, `localSymbol`, `primaryExch`, and `currency` for ISIN-based discovery.

### Metadata
- Source: conversation
- Related Files: scripts/debug-native-contract-isin.js,src/brokers/interactive-brokers/nativeClient.js
- Tags: ibkr,contract-discovery,conid,ucits-etf
- Pattern-Key: harden.ibkr_raw_contract_details_preservation
- Recurrence-Count: 1
- First-Seen: 2026-05-13
- Last-Seen: 2026-05-13

---
