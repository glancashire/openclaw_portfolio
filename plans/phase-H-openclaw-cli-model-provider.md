# Phase H plan — Use OpenClaw CLI as the default model provider

## Why
Graham's "OPENAI_API_KEY is already known to you" actually points to
`openclaw capability model run` — the host CLI is auth'd via myclaw and
will route to whichever upstream provider the OpenClaw catalog selects
(currently `myclaw/claude-opus-4.7`). Setting `OPENAI_API_KEY` in raw
env is unnecessary when this routing already exists.

## Design
Extend `lib/modelClient.js` to support a third provider, `openclaw`,
that shells out to `openclaw capability model run --prompt <text>
--json`. Auto-selection order:

1. `openclaw` — if `OPENCLAW_BIN` env or a `openclaw` binary on PATH
   exists.
2. `anthropic` — if `ANTHROPIC_API_KEY` is set.
3. `openai`    — if `OPENAI_API_KEY` is set.
4. none.

Override: pass `{ provider: 'openai' }` to `createModelClient` to force.

The CLI provider:
- Spawns `openclaw capability model run --json --prompt <combined-prompt>`.
- Combines `system` + `user` into a single prompt (CLI doesn't expose a
  system/user split today; injects `[SYSTEM]\n…\n\n[USER]\n…`).
- Parses the JSON output: `{ ok, outputs: [{ text }] }`.
- Honours `timeoutMs` via process-kill on timer.
- Honours `--model` via `cfg.openclawModel` if set; otherwise lets the
  CLI pick its default.

## Risks
- Subprocess spawn cost: ~200ms-2s per call. The daily digest is
  invoked once per day so this is fine.
- No streaming. Acceptable for digest narration (short paragraph).
- Stdout may include log noise in non-JSON mode; we always pass `--json`.

## Tests
- Stub `openclaw` via PATH override (same pattern as Phase G's cron
  cache test). Cover happy path, exit-code-non-zero, malformed JSON,
  empty outputs, timeout (via a stub that sleeps).
- Adjust auto-selection test: when both `openclaw` (PATH) and an env
  key are present, openclaw wins.

## Acceptance
- New `openclaw` provider passes its own assertions.
- `narrateAssessment` routes through the CLI by default.
- Existing Anthropic/OpenAI HTTP paths still pass.
- Digest end-to-end test still green (uses an injected stub client).
