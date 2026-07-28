# D1 / L2 codebase map

## 1. FX handling

### FX sources and storage
- **Approved-instrument static FX hints from `portfolio.md`** are parsed in `src/analysis/approvedInstruments.js:46-79`:
  > `fxToChfHint: metadata.fx_to_chf ? Number(metadata.fx_to_chf) : null`
  
  This is the portfolio-contract source of truth for static `fx_to_chf` metadata.

- **Envelope-time FX in basket proposal sizing** is applied in `src/execution/basketProposalGenerator.js:139-148`:
  > `const fxToChf = target.fxToChf || 1;`
  > `const gapNative = target.gapChf / fxToChf;`
  > `const estChf = qty * limitNative * fxToChf;`
  
  This is where CHF sizing is converted into native-currency order quantities before approval; effectively the **envelope-time FX** path.

- **Broker/live FX from IBKR ledger** is extracted in `src/brokers/interactive-brokers/holdingsSync.js:243-253`:
  > `if (!entry || String(entry.tag || '') !== 'ExchangeRate') continue;`
  > `rates[currency] = value;`
  
  These rates are not persisted in a dedicated runtime file; they are threaded into holdings sync and then materialized per-holding as `fxRateToChf` in `holdings.md`.

- **Per-holding stored FX** is written into holdings rows by `src/brokers/shared/holdingsSnapshot.js:22-25`:
  > `| ... | ${holding.currency || 'CHF'} | ${fx ?? ''} | ${resolvedValueChf(holding)} |`
  
  and resolved via `src/brokers/shared/holdingsSnapshot.js:5-18`:
  > `const explicit = Number(holding?.fxRateToChf);`
  > `const hint = Number(holding?.matchedFxToChfHint);`
  > `return String(holding?.currency || 'CHF').toUpperCase() === 'CHF' ? 1 : null;`

### Where FX is applied
- **Holdings sync live-FX application**: `src/brokers/interactive-brokers/holdingsSync.js:43-93`.
  Key flow:
  > `const liveFxRates = extractFxRatesToChf(ledger);`
  > `const foreignChfBudget = netLiq - cash.value - chfInvested;`
  > `const seedRate = liveFxRates[ccy] || fxHintsByCurrency[ccy] || 1;`
  > `const effectiveRate = Number((group.seedRate * scaleFactor).toFixed(6));`
  > `for (const h of group.holdings) h.fxRateToChf = effectiveRate;`
  
  This is the main CHF conversion path for holdings totals.

- **Fallback holdings FX**: `src/brokers/interactive-brokers/holdingsSync.js:87-92`:
  > `if (liveFxRates[ccy] != null) h.fxRateToChf = liveFxRates[ccy];`

- **Reporting/cost basis CHF math** still relies on hints or holding-row FX, e.g. `src/reporting/costBasis.js:134-143`:
  > `agg.fxToChf = ... ? Number(fxHint) : (agg.currency === 'CHF' ? 1 : null);`
  > `agg.totalCostChf = ... Number((agg.totalCostNative * agg.fxToChf).toFixed(2))`

- **Investor reporting parser** expects explicit FX columns in artifacts in `src/reporting/investorReportingData.js:47-48`:
  > `const fxToChf = parseNumber(...['FX rate to CHF', 'FX rate']) || (currency === 'CHF' ? 1 : null);`

### Envelope-time FX vs transmit-time FX
- **Envelope-time FX** = proposal/approval sizing from `basketProposalGenerator.js:139-148`, using `target.fxToChf` (ultimately from approved-instrument hints / quote resolution), before the basket is approved.
- **Transmit-time FX** = execution safeguards and daily-cap evaluations accept an injected `fxLookup`, but `basketExecutionRunner.js:103-107` and `139-144` default to a stub:
  > `fxLookup: fxLookup || (() => 1)`
  
  So unless callers provide a real `fxLookup`, execution-time guards treat all legs as CHF. That is the current gap between envelope-time and transmit-time FX.

### Current cash reconciliation
- **Statement inbox ingestion** is only for deposits, via `scripts/process-ibkr-statement-inbox.js:5-17,72-110`:
  > `Scans an inbox directory for IBKR statement XLS files, imports each one via importDeposits()`
  
  It archives files after import, but this script itself does not reconcile FX cash balances.

- **Broker cash extraction is CHF-only** in `src/brokers/interactive-brokers/holdingsSync.js:256-290`:
  > `const chfRows = ledger.filter((entry) => entry && entry.currency === 'CHF');`
  > `const preferred = ['CashBalance', 'SettledCash', 'TotalCashValue', 'AvailableFunds'];`
  
  Non-CHF cash balances are ignored here.

- **Holdings snapshot cash section is also CHF-only** in `src/brokers/shared/holdingsSnapshot.js:131-145`:
  > `| Portfolio | CHF | ... | 1 | ... |`
  > `| Broker account | CHF | ${cashChf} | 1 | ${cashChf} | ${cashBasis} |`

- **Computed totals** come from holdings snapshot in `src/brokers/shared/holdingsSnapshot.js:98-100`:
  > `const invested = normalized.reduce((sum, holding) => sum + resolvedValueChf(holding), 0);`
  > `const total = invested + Number(cashChf || 0);`

### Concrete D1 gap
FX cash reconciliation would need to add a portfolio-visible reconciliation path for **non-CHF cash sleeves**. Today the code:
1. reads foreign-security FX rates,
2. converts holdings to CHF,
3. but **collapses cash to CHF-only broker rows** (`extractCashChf`) and does not preserve per-currency cash balances,
4. has no reconciliation artifact comparing statement cash, broker ledger cash, and portfolio-local cash by currency.

Integration points for D1:
- extend `src/brokers/interactive-brokers/holdingsSync.js:243-290` to retain all ledger currencies, not just CHF cash;
- extend `src/brokers/shared/holdingsSnapshot.js:131-145` / totals at `98-100` to show and sum multi-currency cash with explicit FX;
- likely extend statement import flow starting from `scripts/process-ibkr-statement-inbox.js:72-110` to persist per-currency cash/deposit reconciliation evidence instead of only deposit import side effects.

## 2. Basket execution entry

### Entry point and signature
- `src/execution/basketExecutionRunner.js:92-93`:
  > `async function executeApprovedBasket({ portfolioDir, approvalId, rootDir = process.cwd(), now = new Date(), submitLeg = null, fetchLiveQuote = null, fxLookup = null, tickResolverFn = null, safeguardConfig = {} } = {})`

- Envelope and run-state load happen immediately in `src/execution/basketExecutionRunner.js:93-95`:
  > `const { envelope } = loadApprovalEnvelope({ portfolio, approvalId, rootDir, now });`
  > `const { path: statePath, state } = loadOrCreateRunState({ portfolio, approvalId, rootDir, now });`

### Safeguards integration
- Whole-basket safeguard evaluation is the first preflight block in `src/execution/basketExecutionRunner.js:97-126`:
  > `const { evaluateBasketSafeguards } = require('./orderSafeguards');`
  > `const guardResult = await evaluateBasketSafeguards({ envelope, fetchLiveQuote, fxLookup: fxLookup || (() => 1), config: safeguardConfig })`

- Guard config defaults live in `src/execution/orderSafeguards.js:51-58`:
  > `maxLegChf: 25000`
  > `maxBasketChf: 50000`
  > `maxBuyDailyMovePct: 3.0`

### Existing daily transmit cap (analog for L2.B)
- The current analogous gate is the **daily transmit cap** block in `src/execution/basketExecutionRunner.js:129-182`:
  > `const { evaluateDailyTransmitCap } = require('./dailyTransmitCap');`
  > `const dailyResult = evaluateDailyTransmitCap({ portfolio, rootDir, envelope, fxLookup: fxLookup || (() => 1), now, capChf })`

- `src/execution/dailyTransmitCap.js:11-18` shows the data source:
  > `Reads runtime/basket-runs/<portfolio>/*.json`
  > `Defaults to CHF 50k`

- Aggregate scan logic is in `src/execution/dailyTransmitCap.js:57-119`:
  > `const dir = path.join(rootDir, 'runtime', 'basket-runs', portfolio);`
  > `const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'))`
  > `const ts = Date.parse(raw.updatedAt || raw.createdAt || '') || fs.statSync(file).mtimeMs;`
  > `if (leg.status === 'blocked') continue;`
  > `const price = Number(leg.avgFillPrice || leg.limitPrice || 0);`
  > `const qty = Number(leg.fillQuantity || leg.quantity || 0);`

- Requested-basket CHF is computed in `src/execution/dailyTransmitCap.js:156-164`:
  > `const chf = price * qty * fxRate;`

### Where L2.B daily-loss circuit breaker should slot in
Best slot: **immediately after the current daily transmit cap check and before per-leg execution loop**, i.e. between `basketExecutionRunner.js:183` and `185`. That preserves the existing “block the whole basket before any wire activity” pattern.

For parity with L1.B, a new module could read `runtime/basket-runs/<portfolio>/*.json` and/or mirrored fill/trade evidence to compute realized or mark-to-market daily loss, then return a blocker object shaped like `evaluateDailyTransmitCap()`.

## 3. Approval gate

### Intent gate location and behavior
- `src/execution/approvalGate.js:50-57` defines the API:
  > `function requireApprovalIntent({ approvalId, rootDir, env = process.env, scriptName, scope, maxAgeMinutes = DEFAULT_MAX_AGE_MIN, logger = console.warn } = {})`

- Intent file location is `src/execution/approvalGate.js:27-29`:
  > `return path.join(rootDir, 'runtime', 'approval-intent', `${approvalId}.json`);`

- Valid scopes are `src/execution/approvalGate.js:24-25`:
  > `const DEFAULT_MAX_AGE_MIN = 30;`
  > `const VALID_SCOPES = new Set(['basket-execute', 'trades-execute']);`

### Intent file schema
- `writeApprovalIntent()` in `src/execution/approvalGate.js:143-167` writes:
  > `const payload = { approvalId, scope, issuedAt };`
  > `if (safeWord) payload.safeWord = String(safeWord);`
  > `if (pin) payload.pin = String(pin);`

So the current schema is effectively:
```json
{ "approvalId": "...", "scope": "basket-execute|trades-execute", "issuedAt": "ISO", "safeWord"?: "...", "pin"?: "..." }
```

- Validation is in `src/execution/approvalGate.js:106-133`:
  > `if (String(artefact.approvalId || '') !== String(approvalId))`
  > `if (String(artefact.scope || '') !== scope)`
  > `const issuedAt = Date.parse(String(artefact.issuedAt || ''));`
  > `const intentSafeWord = String(artefact.safeWord || '').trim();`
  > `const intentPin = String(artefact.pin || '').trim();`

### Where multi-party approval (L2.C) would integrate
The cleanest integration point is **inside `requireApprovalIntent()`**, because it is already the code-level “must present fresh approval evidence” gate. Extending the JSON schema from one credential holder to multiple attestations would keep all live-transmit authorization logic centralized.

Secondary integration point: basket approval envelope loading in `basketExecutionRunner.js:93-95` if the threshold depends on basket notional in the approved envelope.

### Basket notional threshold (> CHF 25k)
- Basket legs already carry estimated CHF in proposals via `src/execution/basketProposalGenerator.js:148-158,201-219`:
  > `const estChf = qty * limitNative * fxToChf;`
  > `estimatedChf: Number(estChf.toFixed(2)),`

- Basket summary text includes total deployment in `src/execution/basketProposalGenerator.js:188-189`:
  > `summary: ... total CHF ${totalChf.toFixed(2)} ... deploying CHF ...`

- Safeguards recompute basket CHF from raw legs in `src/execution/orderSafeguards.js:238-260`:
  > `let totalChf = 0;`
  > `totalChf += Number(result.legChf || 0);`

For L2.C, the >CHF 25k threshold should likely use the same CHF notional math as safeguards (or the envelope’s per-leg `estimatedChf` when present), then require a second attestation from a different channel before `requireApprovalIntent()` returns success.

## 4. File signing / boot check

### How portfolio.md is read as fact
Representative readers:
- `src/execution/portfolioExecution.js:116-132`:
  > `const portfolioText = fs.readFileSync(portfolioPath, 'utf8');`
  > `approvedInstruments: readApprovedInstruments(portfolioPath)`
  
- `src/analysis/approvedInstruments.js:46-48`:
  > `const text = fs.readFileSync(portfolioPath, 'utf8');`

- `src/brokers/shared/holdingsSnapshot.js:83-85`:
  > `const portfolioPath = path.join(portfolioDir, 'portfolio.md');`
  > `const approved = fs.existsSync(portfolioPath) ? readApprovedInstruments(portfolioPath) : [];`

There is no single boot-time trust wrapper; modules read `portfolio.md` directly.

### Existing integrity / signing utilities
- No existing signing or tamper-check path was found for `portfolio.md` / `memory/*.md`.
- The closest existing integrity primitive is **hash-gated artifact writing**, tested in `scripts/test-artifact-hash-gate.js:4-17,73-84`:
  > `regression test for artifact hash-gate (writeTextIfChanged / writeJsonIfChanged)`
  > `assert.strictEqual(rawWrites, 0, ... summaryArtifacts.js ...)`
  
  This is write-noise suppression, not trust verification.

- Another unrelated hash use is email dedupe in `src/reporting/emailDedup.js:46`:
  > `crypto.createHash('sha256').update(...).digest('hex')`

### Where a boot tamper check could live
Because execution and reporting paths independently read `portfolio.md`, a tamper-check hook would be most effective in one of these chokepoints:
1. **a shared portfolio reader/parser** (currently missing), or
2. **execution preflight/context builders**, especially `src/execution/portfolioExecution.js:116-132`, before safety and approval decisions are made, and
3. **readiness/authority checks**, which already load portfolio policy before live action.

There is no current hook around `memory/*.md`; that would need to be added outside this repo’s existing execution modules.

## 5. Test conventions

### Discovery and manifest
- `scripts/discover-test-suites.js:4-15` defines the convention:
  > `Discover and categorise every test-*.js file under scripts/ and tests/`
  > `write docs/operations/test-manifest.json`

- Scan/classify logic is in `scripts/discover-test-suites.js:60-113`:
  > `if (!/^test-.*\.js$/.test(entry)) continue;`
  > `safe = pure assert-style unit test`
  > `integration = default: needs filesystem / portfolio fixtures`

- Manifest structure is in `docs/operations/test-manifest.json:1-19`:
  > `"lanes": ["safe", "integration", "live-smoke", "external"]`
  > `"counts": { "total": 352, "safe": 267, ... }`

### Safe-lane / verifyRepoChecks conventions
- `scripts/discover-test-suites.js:115-126` ties into curated checks:
  > `const { checks } = require('../src/reporting/verifyRepoChecks');`

- `src/reporting/verifyRepoChecks.js` is referenced by the manifest and repo checks; grep output confirms curated test registrations such as:
  > `['test:artifact-hash-gate', ['scripts/test-artifact-hash-gate.js']]`
  > `['test:trade-notify-action-currency-normalization', ['scripts/test-trade-notify-action-currency-normalization.js']]`

### `__test__` export pattern
- Example in `src/reporting/dashboardGenerator.js:1033`:
  > `module.exports = { ..., __test__: { summarizeProviderHealth,ProviderHealthLines } };`

This pattern is used when internal helpers need direct test access without becoming public API.

### Representative existing tests to match
- **Execution safeguard unit style**: `tests/test-orderSafeguards.js:6-22,95-129`
  > `const test = require('node:test');`
  > `const assert = require('node:assert/strict');`
  > direct function imports, table-free targeted assertions.

- **Approval gate unit style**: `scripts/test-approval-gate.js:13-18,44-49,51-56`
  > tmpdir fixtures, plain `assert`, console JSON result at end.

- **Basket execution runner unit style**: `scripts/test-basket-execution-runner.js:16-27,35-55`
  > writes temp approval envelope, injects `submitLeg`, asserts run-state JSON outcomes.

- **FX reconciliation-style fixture test**: `scripts/test-holdings-fx-reconciliation.js:17-37`
  > writes temp portfolio, runs snapshot writer, asserts CHF totals and explanatory warnings.

## 6. Config surface

### Existing safeguard tunables
- Hard defaults live in `src/execution/orderSafeguards.js:51-58`:
  > `maxLegChf: 25000`
  > `maxBasketChf: 50000`
  > `maxLegsPerBasket: 10`
  > `maxBuyDailyMovePct: 3.0`

- `basketExecutionRunner.js:92` accepts `safeguardConfig`, and merges it into basket safeguards via `103-107`:
  > `config: safeguardConfig`

- Daily cap override follows the same convention in `src/execution/basketExecutionRunner.js:134-146`:
  > `safeguardConfig.dailyTransmitCapChf`
  > `safeguardConfig.skipDailyTransmitCap`

### Portfolio.md policy surface
- Execution policy reads portfolio markdown directly in `src/execution/portfolioExecution.js:123-130`:
  > `requireFirstTradeConfirmation: parseBooleanLine(portfolioText, 'Require confirmation before first live trade')`
  > `requireFirstPurchaseApproval: parseBooleanLine(portfolioText, 'Require user approval for first purchase')`
  > `requireSalesApproval: parseBooleanLine(portfolioText, 'Require user approval for sales')`

- `orderSafeguards.js:47-48` explicitly documents that per-portfolio overrides are intended to come from:
  > `` `portfolio.md` Safety Controls section keys ``

### Recommended config placement for new features
To match current conventions:
- **L2.B daily-loss circuit breaker threshold** should live beside existing safeguard tunables, i.e. parsed from portfolio `Safety Controls` / `Risk Limits` into a `safeguardConfig` field (parallel to `dailyTransmitCapChf`). Runtime override path already exists via `executeApprovedBasket(... safeguardConfig ...)`.
- **L2.C multi-party approval threshold** should live in portfolio policy / automation controls (or safety controls) and be enforced in `approvalGate.js`, with a default constant nearby if needed. Threshold should be expressed in CHF notional, consistent with `maxLegChf` and `maxBasketChf`.

## Highest-leverage integration points summary
1. **D1 FX cash reconciliation**: `src/brokers/interactive-brokers/holdingsSync.js:243-290` and `src/brokers/shared/holdingsSnapshot.js:98-145`.
2. **L2.B daily-loss breaker**: add a new whole-basket preflight in `src/execution/basketExecutionRunner.js` immediately after the current daily transmit cap block (`129-182`).
3. **L2.C multi-party approval**: extend `src/execution/approvalGate.js:50-167` intent schema/validation, using basket CHF notional from proposal/safeguard math.
4. **L2.A signing/tamper detection**: introduce a shared trusted-reader or preflight check around direct `portfolio.md` reads, especially `src/execution/portfolioExecution.js:116-132`.
