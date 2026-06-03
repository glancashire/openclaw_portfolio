'use strict';

/**
 * lib/ibkrDepositXls.js
 *
 * Reads the `Deposit` sheet of an IBKR transactions report (Excel 97-2003,
 * `.xls`) and returns normalized deposit entries.
 *
 * Implementation note: the file is BIFF, not XLSX, and we have a workspace
 * policy of "no new npm dependencies". Node has no built-in BIFF reader, so
 * we shell out to Python's `xlrd` package (installed at workspace-bootstrap
 * time, 2026-06-03). The Python invocation prints one JSON line per row.
 *
 * Returns an array of:
 *   {
 *     date: 'YYYY-MM-DD',          // normalized from "Date Received" cell
 *     direction: 'deposit',
 *     currency: 'CHF',
 *     amountChf: <number>,
 *     amountNative: <number>,
 *     fxToChf: 1,                  // CHF deposits only for now
 *     method: 'bank_transfer',
 *     reference: 'C107533357',
 *     notes: '',
 *   }
 *
 * Throws on:
 *   - missing python3
 *   - missing xlrd module
 *   - missing/malformed Deposit sheet
 *   - rows that aren't direction='deposit' shape
 */

const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

const PYTHON_SCRIPT = `
import json, sys, re
try:
    import xlrd
except ImportError:
    print(json.dumps({"error": "xlrd_missing"}))
    sys.exit(2)

xls_path = sys.argv[1]
try:
    wb = xlrd.open_workbook(xls_path, on_demand=True)
except Exception as e:
    print(json.dumps({"error": "open_failed", "detail": str(e)}))
    sys.exit(3)

sheet_name = None
for sn in wb.sheet_names():
    if sn.lower().startswith("deposit"):
        sheet_name = sn
        break
if sheet_name is None:
    print(json.dumps({"error": "no_deposit_sheet", "sheets": wb.sheet_names()}))
    sys.exit(4)

sh = wb.sheet_by_name(sheet_name)
if sh.nrows < 2:
    print(json.dumps({"error": "empty_sheet", "rows": sh.nrows}))
    sys.exit(5)

header = [str(c).strip() for c in sh.row_values(0)]
def col(name):
    name = name.lower()
    for i, h in enumerate(header):
        if str(h).strip().lower() == name:
            return i
    return -1

idx_date_received = col("Date Received")
idx_amount = col("Amount")
idx_method = col("Method")
idx_ref = col("Reference Number")
idx_status = col("Status")

if idx_date_received < 0 or idx_amount < 0 or idx_ref < 0:
    print(json.dumps({"error": "missing_columns", "header": header}))
    sys.exit(6)

amount_re = re.compile(r"([A-Z]{3})\\s*([0-9.,'\\s-]+)")

out = []
for r in range(1, sh.nrows):
    row = sh.row_values(r)
    raw_date = row[idx_date_received] if idx_date_received < len(row) else ""
    raw_amount = row[idx_amount] if idx_amount < len(row) else ""
    raw_method = row[idx_method] if 0 <= idx_method < len(row) else ""
    raw_ref = row[idx_ref] if idx_ref < len(row) else ""
    raw_status = row[idx_status] if 0 <= idx_status < len(row) else ""

    date = ""
    if isinstance(raw_date, (int, float)):
        date_tuple = xlrd.xldate_as_tuple(raw_date, wb.datemode)
        date = "%04d-%02d-%02d" % date_tuple[:3]
    else:
        s = str(raw_date).strip()
        if re.match(r"^\\d{4}-\\d{2}-\\d{2}$", s):
            date = s

    currency = ""
    amount = 0.0
    s = str(raw_amount).strip()
    m = amount_re.search(s)
    if m:
        currency = m.group(1)
        cleaned = re.sub(r"[\\s,']", "", m.group(2))
        try:
            amount = float(cleaned)
        except ValueError:
            amount = 0.0
    elif isinstance(raw_amount, (int, float)):
        amount = float(raw_amount)

    method_norm = str(raw_method).strip().lower().replace(" ", "_")

    out.append({
        "date": date,
        "currency": currency,
        "amount": amount,
        "method": method_norm,
        "reference": str(raw_ref).strip(),
        "status": str(raw_status).strip(),
    })

print(json.dumps({"ok": True, "rows": out}))
`;

function parseDepositXls(xlsPath, options = {}) {
  if (!fs.existsSync(xlsPath)) {
    throw new Error(`xls not found: ${xlsPath}`);
  }
  const python = options.python || process.env.PYTHON || 'python3';
  const result = spawnSync(python, ['-c', PYTHON_SCRIPT, path.resolve(xlsPath)], {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error) {
    throw new Error(`python invocation failed: ${result.error.message}`);
  }
  if (result.status !== 0) {
    let detail = '';
    try {
      const parsed = JSON.parse(result.stdout || result.stderr || '{}');
      detail = parsed.error || parsed.detail || '';
    } catch (_e) {
      detail = (result.stdout || result.stderr || '').slice(0, 200);
    }
    throw new Error(`python xlrd reader failed (exit ${result.status}): ${detail}`);
  }
  let parsed;
  try {
    parsed = JSON.parse(result.stdout.trim());
  } catch (e) {
    throw new Error(`python xlrd reader emitted non-JSON: ${result.stdout.slice(0, 200)}`);
  }
  if (!parsed || !parsed.ok) {
    throw new Error(`python xlrd reader reported error: ${parsed && parsed.error}`);
  }

  const rows = Array.isArray(parsed.rows) ? parsed.rows : [];
  return rows
    .filter((row) => row.date && row.amount && row.reference)
    .map((row) => ({
      date: row.date,
      direction: 'deposit', // The IBKR Deposit sheet only contains deposits
      currency: row.currency || 'CHF',
      amountChf: row.currency === 'CHF' || !row.currency ? row.amount : null,
      amountNative: row.amount,
      fxToChf: row.currency === 'CHF' || !row.currency ? 1 : null,
      method: row.method || 'bank_transfer',
      reference: row.reference,
      notes: row.status && row.status.toLowerCase() !== 'available' ? row.status : '',
    }));
}

module.exports = { parseDepositXls };
