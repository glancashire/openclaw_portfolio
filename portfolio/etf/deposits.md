# Deposits: etf

Cash deposits and withdrawals into/out of the broker account associated with the
**etf** portfolio. Used by reporting to compute total return = `current value − net deposits`.

## Conventions

- **Direction**: `deposit` (cash in) or `withdrawal` (cash out).
- **Currency**: native deposit currency. CHF amount is the same when the deposit is in CHF; otherwise convert at the FX rate on the date of receipt.
- **Date** is the *date received* by the broker (i.e. when the cash hit the account), not the date the bank-transfer request was placed.
- **Reference**: broker transaction reference (IBKR `Reference Number` from the deposit/withdrawal report).
- **Method**: e.g. `bank_transfer`, `internal_transfer`, `wire`, `cash`.
- Entries are append-only. To correct a mistake, add a new row (including a negative-direction reversal if needed) rather than editing history.

## Source

Imported from IBKR transactions report (`transactions-bd83440c-4fef-4964-b80a-e66bd10c0873.xls`, sheet `Deposit`) on 2026-06-03.
Account: `U25624150` (Graham Lancashire).

## Ledger

| Date | Direction | Currency | Amount native | FX to CHF | Amount CHF | Method | Reference | Notes |
|---|---|---|---:|---:|---:|---|---|---|
| 2026-04-27 | deposit | CHF | 5000.00 | 1 | 5000.00 | bank_transfer | 515348135 | Initial deposit |
| 2026-05-20 | deposit | CHF | 5000.00 | 1 | 5000.00 | bank_transfer | C106411275 | |
| 2026-05-21 | deposit | CHF | 20000.00 | 1 | 20000.00 | bank_transfer | 524372950 | |
| 2026-05-22 | deposit | CHF | 20000.00 | 1 | 20000.00 | bank_transfer | C106636056 | |
| 2026-05-28 | deposit | CHF | 20000.00 | 1 | 20000.00 | bank_transfer | C107059786 | |
| 2026-05-29 | deposit | CHF | 20000.00 | 1 | 20000.00 | bank_transfer | C107183510 | |
| 2026-06-01 | deposit | CHF | 10000.00 | 1 | 10000.00 | bank_transfer | C107346207 | |
| 2026-06-02 | deposit | CHF | 20000.00 | 1 | 20000.00 | bank_transfer | C107533357 | |

## Totals (computed)

- Cumulative deposits CHF: **120000.00**
- Cumulative withdrawals CHF: **0.00**
- **Net deposited CHF: 120000.00**
- Last update: 2026-06-03 (imported from IBKR transactions report)
