# Phase 44 — Trade Execution Email Notifications

## Goal
Wire Mailgun email notifications into the trading workflow so that each completed trade triggers a nicely formatted HTML email showing trade details, resulting portfolio state, and any remaining open orders.

## Pre-requisites
- [x] Mailgun configured in `secrets/mailgun.json` (key, domain, sender)
- [x] `lib/mailgun.js` sendEmail helper exists
- [x] IB Gateway connected and API working
- [x] Trade proposal approved

## Checklist

### 1. Verify Mailgun sending
- [ ] Update `secrets/mailgun.json` with the sending key provided
- [ ] Send a test email to lancashire@swift.ch confirming delivery works

### 2. Build trade notification email template
- [ ] Create `lib/tradeNotificationEmail.js` with:
  - `buildTradeEmailHtml(trade, portfolio, openOrders)` — generates styled HTML
  - Shows: trade details (symbol, qty, price, fill, cost, fees)
  - Shows: resulting portfolio allocation table with drift
  - Shows: open orders still pending (if any)
  - Clean, professional HTML styling (inline CSS for email clients)

### 3. Send test email with mock trade data
- [ ] Create `scripts/test-trade-notification-email.js`
- [ ] Send a realistic mock trade notification to lancashire@swift.ch
- [ ] Verify it renders correctly

### 4. Wire into trading execution flow
- [ ] After each order fill confirmation, automatically send notification email
- [ ] Create `lib/tradeExecutionNotifier.js` that:
  - Accepts fill data + current portfolio state + open orders
  - Calls `buildTradeEmailHtml` and sends via Mailgun
  - Logs success/failure without blocking the trade flow
- [ ] Integrate into the execution script used for Phase 43 trades

### 5. Execute approved trades
- [ ] Place the 3 approved limit orders (SLICHA, EMUAA, CSPX)
- [ ] Monitor fills
- [ ] Send notification email on each fill
- [ ] Update portfolio state files after all fills complete

## Exit criteria
- Test email delivered successfully to lancashire@swift.ch
- Trade notification emails sent automatically on each fill
- Emails show trade details + portfolio state + open orders
- All 3 approved trades placed with limit orders
