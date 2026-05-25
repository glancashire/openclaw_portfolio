# Phase 57 — Native IBKR Startup Hardening

## Goal
Restore and harden the native IB Gateway startup path so the repository's native IBKR readiness flow targets a working, reproducible local API listener again.

## Why this phase exists
Recent live-trade execution did not fail because market timing was wrong; it failed because broker readiness failed closed before submission. The last known-good execution path was native IB Gateway over a local socket, but the current native startup chain is broken. We already identified concrete launcher faults in the IBC wrapper; this phase hardens that path until native startup is reliable enough for readiness checks.

## Scope
- native launch wrapper only
- native config alignment only
- read-only verification only
- no safety relaxation, no live order writes

## Actionable checklist
- [ ] Record the current native startup blockers and target path
- [ ] Fix the native launcher script so IBC starts the staged offline Gateway correctly
- [ ] Verify the launcher reaches Gateway/IBC runtime without immediate argument/layout failures
- [ ] Identify the next startup blocker after launcher repair (login/config/2FA/socket binding)
- [ ] Harden config/path assumptions so the blocker is explicit and reproducible
- [ ] Run native readiness verification steps
- [ ] Iterate until the phase acceptance criteria pass
- [ ] Commit and push

## Acceptance criteria
- `start-ibc.sh` no longer fails from invalid IBC argument format
- `start-ibc.sh` no longer fails from wrong install-root assumptions
- `start-ibc.sh` no longer fails from wrong java-path assumptions
- native startup reaches a stable post-launch state with a clear next blocker or a bound local API socket
- repo native readiness checks target the correct local port
- all tests/checks in this phase pass

## Verification commands
- `bash /home/ubuntu/ibgateway-native/start-ibc.sh`
- `ss -ltnp | grep -E ':4000|:4001|:4002|:7496|:7497'`
- `node scripts/check-interactive-brokers-readiness.js portfolio/etf`
- `python3 skills/ibkr/scripts/ibkr_cli.py account-summary --host 127.0.0.1 --port 4000 --readonly --json`

## Notes
If the API socket still does not bind after launcher fixes, the remaining blocker should be captured precisely (for example config dialog, login state, or second-factor wait) rather than guessed.
