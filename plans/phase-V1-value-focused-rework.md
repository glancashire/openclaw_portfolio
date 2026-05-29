# Phase V1 — Value-Focused End-to-End Rework

## Philosophy shift

The system was built around **allocation drift** as the primary signal: "how far are we from target weights?" That's an internal maintenance metric. The user cares about **value**: how much is the portfolio worth, how has it grown, what's each position contributing, and what should happen next to grow it further.

**Drift becomes a background constraint** (like a guardrail), not the headline. Value, profit, and growth become the primary language across all surfaces.

---

## What changes

### 1. Dashboard hierarchy (operator + console)

**Current order:** Status → Value snapshot → Profit/Loss → Allocation drift → Instrument queue → Safety → ...

**New order:**
1. **Portfolio value** — total, daily change, weekly change, all-time profit
2. **Holdings by value** — sorted by CHF value descending, with profit/loss per holding
3. **Performance** — simple time-series: since inception, MTD, YTD (when data allows)
4. **Next actions** — what to buy/sell and *why* (framed as "deploy cash" or "grow position X" rather than "fix drift")
5. **Allocation** — compact, de-emphasized, shown as a health check not the primary driver
6. **Operational** — broker status, safety, execution lifecycle (collapsed by default in rich surfaces)

### 2. Proposal engine language

**Current:** "Global equities drifted 1.83% over target → sell/rebalance"
**New:** "CHF 9'544 cash available for deployment → buy opportunities ranked by target gap and value contribution"

The proposal engine should frame actions as:
- **Deploy cash** — "you have uninvested capital, here's where it should go"
- **Grow underweight positions** — "these positions are below their intended size"
- **Trim overweight** — only when a position is materially outside bounds, framed as risk management not drift correction

### 3. Digest / email surfaces

**Current digest:** leads with drift status, allocation table, then mentions value.
**New digest:**
- Lead with: portfolio value, daily/weekly change, profit
- Middle: top movers (which holdings gained/lost most)
- End: any actions recommended (framed as opportunity, not correction)
- Allocation health as a one-line footnote: "All sleeves within target bands ✓"

### 4. Summary artifacts (summary.json, summary.html)

- Primary keys: `totalValueChf`, `profitChf`, `profitPct`, `dailyChangeChf`, `weeklyChangeChf`
- Holdings sorted by value contribution, not alphabetically
- Allocation section renamed from "Allocation Health" to "Balance check" and moved lower
- Remove `biggestDrift` from the "Why This Portfolio Looks This Way" explanation section; replace with `growthSummary` and `deploymentOpportunity`

### 5. Console dashboard (`show-dashboard.js`)

Restructure output:
```
📊 ETF Portfolio — CHF 72'274   (+0.25% all-time)

💰 Performance
  Today        +0.00 CHF  (0.00%)
  This week    +135.21 CHF  (+0.25%)
  All-time     +135.21 CHF  (+0.25%)

📈 Holdings (by value)
  SXR8    CHF 23'960  (33.1%)   -3.23  (-0.01%)
  EMUAA   CHF 12'340  (17.1%)  +121.25  (+0.99%)  ★ top gainer
  SPMCHA  CHF  8'262  (11.4%)     —
  SEC0    CHF  8'967  (12.4%)   +5.20  (+0.06%)
  CHSPI   CHF  6'165   (8.5%)   +9.11  (+0.15%)
  LCUJ    CHF  3'035   (4.2%)   +2.88  (+0.09%)

💵 Cash: CHF 9'544 (13.2%) — available for deployment

🎯 Balance: all sleeves on track ✓
  (Global 66.8%/65% · Swiss 20.0%/20% · Bonds+Cash 13.2%/15%)

👉 Next: Deploy cash into underweight positions (Bonds/cash-like sleeve has room)
```

### 6. Rebalance analyzer framing

- Rename internal concept from "drift rebalance" to "deployment opportunity" or "position sizing"
- When all sleeves are on-track, the recommendation should be "hold" or "deploy new cash" — not "refresh history and check drift"
- Remove the default recommendation "Refresh history snapshots and only open a new live basket when a real drift or cash-deployment reason exists" — replace with value-oriented language

### 7. Allocation analysis module

- Keep the math (it's correct and useful as a constraint)
- Change the *surfacing*: allocation status becomes a boolean health check, not a ranked priority
- Thresholds stay the same, but the language changes:
  - `on_track` → "✓" (no commentary needed)
  - `drifted` → "watching" (mentioned only if approaching action threshold)
  - `out_of_bounds` → "rebalance needed" (this is the only case where drift drives action)

### 8. Trade proposal framing

Current: "Instrument X has 0% allocation, target is 30% → buy"
New: "Deploy CHF Y into [instrument name] to build toward the 30% target position (currently CHF 0)"

Frame every trade as building value, not correcting error.

---

## What stays the same

- The underlying allocation math and thresholds (they're correct)
- Safety gates, approval workflow, execution lifecycle
- Broker integration, reconciliation, order submission
- The data model (holdings.md, trades.md, portfolio.md)
- Cost-basis computation (hybrid trades.md + IBKR fallback)
- Market calendar, contract intelligence
- Cron scheduling, health diagnostics

---

## Implementation plan

### Layer 1: Console dashboard + show-dashboard.js (quick win)
- Restructure output to value-first layout
- Sort holdings by value
- Add "available for deployment" framing for cash
- Compact allocation to one-line health check
- **Effort: S** — single file, no test changes needed

### Layer 2: Dashboard generator (dashboard.md)
- Reorder sections: value → holdings → profit → actions → allocation (de-emphasized)
- Change recommendation language from drift-oriented to value-oriented
- Remove "Allocation drift is tracked but de-emphasized" header (just make it naturally lower priority)
- **Effort: M** — dashboardGenerator.js + regenerate dashboard.md + update snapshot tests

### Layer 3: Digest email
- Lead with value + change, not drift
- Top movers section
- Allocation as footnote
- **Effort: M** — dashboardDigest.js + digest tests

### Layer 4: Summary artifacts + investor reports
- Reframe summary.json explanations section
- Sort holdings by value in HTML summary
- Rename "Allocation Health" → "Balance check"
- **Effort: M** — summaryArtifacts.js + investorReportingData.js + report tests

### Layer 5: Proposal engine language
- Change proposal descriptions from "fix drift" to "deploy/grow/trim"
- Update instrumentProposalEngine.js and tradeProposalEngine.js output strings
- **Effort: S-M** — string changes + test assertion updates

### Layer 6: Recommendation engine
- Replace default "check drift" recommendations with value-oriented next steps
- When cash > threshold and sleeves have room: "Deploy cash"
- When all positions are sized and on-track: "Hold — portfolio is performing as intended"
- When a position is materially overweight: "Consider trimming [X] to manage concentration risk"
- **Effort: M** — touches dashboardGenerator.js recommendation logic + summaryArtifacts.js

---

## Acceptance criteria

1. All user-facing surfaces (console, dashboard.md, digest email, summary HTML) lead with value/profit, not drift
2. Allocation drift is still computed and available but appears as a compact health-check, not the primary section
3. Recommendations use value-oriented language ("deploy", "grow", "hold") not drift language ("rebalance", "fix drift")
4. No changes to underlying math, safety gates, or execution workflow
5. All existing tests pass (with updated assertion strings where needed)
6. The system still correctly flags out-of-bounds allocations as requiring action

---

## Estimated total effort

~1-2 days of focused agent work across 6 layers. Layers 1-2 deliver the most visible impact and can ship independently.

---

## Risks

- Some tests assert exact dashboard/digest output strings — those need updating alongside the code
- Investor report recipients may notice the layout change — this is intentional and positive
- The "drift" concept is deeply threaded through ~52 files — we're changing *presentation*, not removing the underlying computation, so the blast radius is manageable
