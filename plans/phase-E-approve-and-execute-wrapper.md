# Phase E plan — approve-and-execute wrapper

## Why
Phase D enforces the gate but doesn't *create* the intent artefact.
Today, an operator would have to write `runtime/approval-intent/<id>.json`
by hand. The wrapper closes that gap: parse the operator's approval
message, verify it contains the safe-word or PIN, write the artefact,
and invoke the existing runner.

This is also the place to assert basic policy invariants (proposal
freshness, approvalId existence, market state) that today are split
across the runner.

## Design

New script `scripts/approve-and-execute.js`:

```
node scripts/approve-and-execute.js \
  --approval-id=<id> \
  --secret=<safeword-or-pin> \
  [--portfolio=etf] \
  [--scope=basket-execute] \
  [--issued-at=<iso>]            # default: now
  [--dry-run]                    # write intent + skip transmit
```

Behaviour:
1. Validate `--approval-id` and `--secret` are non-empty.
2. Match `--secret` against `OPENCLAW_APPROVAL_SAFEWORD` and
   `OPENCLAW_APPROVAL_PIN`; if neither matches, exit 2 with
   `secret_mismatch`. (No echoing the secret.)
3. Determine which env field matched, then call
   `writeApprovalIntent({ approvalId, rootDir, scope, safeWord,
   pin, issuedAt })`. Pass only the field that matched, not the
   unsupplied one.
4. If `--dry-run`, log intent path and exit 0.
5. Otherwise, `spawn` the existing runner
   (`scripts/execute-approved-basket-end-to-end.js`) with the
   resolved portfolio + approvalId, inheriting stdio. Forward
   its exit code.

The wrapper does NOT take a "raw message" arg — parsing the
operator's chat message is the agent's job; the wrapper just
enforces the secret-vs-env check at the script boundary so
even a manual operator can't bypass the safe-word.

## Risks / dependencies
- Spawning a subprocess vs requiring the runner module: spawn
  is cleaner (no shared state, stdout pass-through, easy CI),
  matches existing CLI ergonomics.
- The wrapper must NOT log the secret. Use a redacted summary
  ("safeWord matched env" or "pin matched env"). Use process.argv
  carefully — secret arrives as `--secret=...` and we MUST NOT
  echo argv unfiltered anywhere.
- Tests must spawn the wrapper in subprocess form to exercise
  argv parsing and exit codes; cannot just import.

## Actionable checklist
- [ ] `scripts/approve-and-execute.js` (CLI, argv parse, env match,
      writeApprovalIntent, optional spawn of runner, secret hygiene).
- [ ] `scripts/test-approve-and-execute.js`:
      - happy path with safe-word → intent on disk + no secret in stdout
      - happy path with PIN → same
      - secret_mismatch → exit 2, no intent written
      - missing approvalId → exit 1
      - missing secret → exit 1
      - --dry-run path skips runner spawn
      - argv hygiene: stdout / stderr never contain the secret token
- [ ] Wire into `src/reporting/verifyRepoChecks.js`.
- [ ] Update `docs/setup/approval-gate.md` to reference the wrapper
      as the canonical operator entry point.
- [ ] Commit + push.

## Acceptance criteria
- Operator can run `node scripts/approve-and-execute.js --approval-id=X
  --secret=Y` and (a) get a fresh intent on disk and (b) have the runner
  invoked with the gate passing.
- Wrong secret → exit code 2, no intent file written, no secret echoed.
- Tests assert NO appearance of the secret string in captured stdout/stderr.
- Adjacent suites still green.
