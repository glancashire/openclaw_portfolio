#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CLI="$SCRIPT_DIR/ibkr_cli.py"
VENV_PYTHON="$SKILL_DIR/.venv/bin/python"
PYTHON_BIN="${IBKR_PYTHON:-}"

if [[ -z "$PYTHON_BIN" ]]; then
  if [[ -x "$VENV_PYTHON" ]]; then
    PYTHON_BIN="$VENV_PYTHON"
  else
    PYTHON_BIN="python3"
  fi
fi

if [[ $# -eq 0 ]]; then
  cat <<EOF
Usage: ibkr.sh <command> [args]

Commands:
  account              account summary + positions
  account-summary      raw account summary tags
  positions            open positions
  portfolio            portfolio with pnl fields
  pnl                  account pnl snapshot
  quote                quote snapshot
  historical           historical bars
  place-order          place order
  cancel-order         cancel order by id
  open-orders          list open orders
  executions           list executions/fills
  contract-details     lookup contract metadata
  scanner              run scanner query

Python:
  $PYTHON_BIN

Examples:
  ibkr.sh account --account DU123456
  ibkr.sh quote --symbol AAPL --sec-type STK --market-data-type 3
  ibkr.sh historical --symbol EURUSD --sec-type CASH --duration "7 D" --bar-size "1 hour"
  ibkr.sh place-order --symbol AAPL --action BUY --quantity 10 --order-type LMT --limit-price 150
EOF
  exit 1
fi

cmd="$1"
shift

run_cli() {
  "$PYTHON_BIN" "$CLI" "$@"
}

case "$cmd" in
  account)
    run_cli account-summary "$@"
    run_cli positions "$@"
    ;;
  account-summary|positions|portfolio|pnl|quote|historical|place-order|cancel-order|open-orders|executions|contract-details|scanner)
    run_cli "$cmd" "$@"
    ;;
  *)
    echo "Unknown command: $cmd" >&2
    exit 2
    ;;
esac
