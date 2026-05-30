# Configuration Matrix

This document records the active configuration surface used by the portfolio-manager repo today.

## Precedence

Unless a component documents otherwise, effective configuration is resolved in this order:

1. process environment (`process.env`)
2. workspace `.env` values
3. checked-in/secret JSON config files used by that subsystem
4. code defaults

`src/shared/env.js` now exposes both:
- `readWorkspaceEnv()` — pure read, no mutation
- `loadWorkspaceEnv()` — backward-compatible helper that applies missing values into `process.env`

## Workspace environment file

Default path: `.env` at the repo root.

Supported generic behavior:
- blank lines and `#` comments are ignored
- quoted and unquoted values are accepted
- `loadWorkspaceEnv()` only fills missing/empty env keys; it does not overwrite an already-set process env value

## Interactive Brokers configuration

Primary loader: `src/brokers/interactive-brokers/config.js`

### Effective field precedence
For each field, the loader checks:
1. explicit `process.env.IBKR_*`
2. workspace `.env` `IBKR_*`
3. `secrets/interactive-brokers.json`
4. built-in defaults

### Built-in defaults
- `IBKR_MODE`: `native`
- `IBKR_RUNTIME`: `live`
- `IBKR_BASE_URL`: `https://localhost:5000/v1/api`
- `IBKR_HOST`: `127.0.0.1`
- native port by runtime:
  - `live` → `4001`
  - `paper` → `4002`
- `IBKR_CLIENT_ID`: `101`
- `IBKR_READONLY`: `true`

### Supported IBKR env keys
- `IBKR_MODE`
- `IBKR_RUNTIME`
- `IBKR_BASE_URL`
- `IBKR_HOST`
- `IBKR_PORT`
- `IBKR_CLIENT_ID`
- `IBKR_READONLY`
- `IBKR_USERNAME`
- `IBKR_PASSWORD`
- `IBKR_ACCOUNT_ID`

### Notes
- `readonly=true` is the fail-closed default.
- Native runtime defaults intentionally prefer loopback connectivity.
- `IBKR_PORT` overrides runtime-derived defaults when set explicitly.

## TLS behavior for IBKR HTTPS calls

`src/brokers/interactive-brokers/client.js` uses a scoped insecure HTTPS agent only for loopback HTTPS URLs.

Current guarded cases:
- `https://localhost:...`
- `https://127.0.0.1:...`

Non-loopback hosts must not inherit the relaxed TLS behavior.
No code should mutate global `NODE_TLS_REJECT_UNAUTHORIZED`.

## Operator-facing config inspection surfaces
- `scripts/check-interactive-brokers-config.js`
- `trade.js config`
- `src/execution/effectiveConfig.js`

These surfaces should stay aligned with the loader behavior above.
