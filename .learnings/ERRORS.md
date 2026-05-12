## [ERR-20260504-001] exec-git-allowlist-miss

**Logged**: 2026-05-04T09:42:00Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
Git inspection/commit/push attempts from this session are blocked because the available exec path rejects git commands with `exec denied: allowlist miss`.

### Error
```
exec denied: allowlist miss
```

### Context
- Command attempted: `git -C /home/ubuntu/.openclaw/workspace status --short && git -C /home/ubuntu/.openclaw/workspace branch --show-current && git -C /home/ubuntu/.openclaw/workspace remote -v`
- Need: verify repo state and perform commit/push directly from the agent session
- Observed mismatch: prior sessions successfully pushed, but this session's command path blocks git inspection through exec.

### Suggested Fix
- Use an exec mode/path that includes git in the allowlist, or provide a first-class git tool.
- Promote a tooling note so future sessions treat this as a tooling-path issue rather than a repo issue.

### Metadata
- Reproducible: yes
- Related Files: /home/ubuntu/.openclaw/workspace/.learnings/ERRORS.md

---

## [ERR-20260506-002] dashboard-observability-null-arg

**Logged**: 2026-05-06T13:39:00Z
**Priority**: medium
**Status**: pending
**Area**: tests

### Summary
New dashboard observability helper assumed `observability` was always non-null and broke an existing dashboard summary regression test.

### Error
```
TypeError: Cannot read properties of null (reading 'recentSummary')
    at formatObservabilityStatus (.../src/reporting/dashboardGenerator.js:170:32)
```

### Context
- Command attempted: `npm run verify:execution`
- Failing test: `scripts/test-dashboard-execution-summary.js`
- Cause: helper used `observability.recentSummary` while some direct `generateDashboard()` callers pass `null`

### Suggested Fix
- Keep new report/dashboard observability sections null-safe.
- Preserve backward compatibility for direct test/helper callers that omit new optional inputs.

### Metadata
- Reproducible: yes
- Related Files: /home/ubuntu/.openclaw/workspace/src/reporting/dashboardGenerator.js

---

## [ERR-20260511-003] ibkr-native-startup-auth-exit

**Logged**: 2026-05-11T06:18:00Z
**Priority**: high
**Status**: in_progress
**Area**: infra

### Summary
IBKR native gateway startup currently fails to reach a resident API-listening session because the login flow stops around second-factor authentication and the launcher exits before any native socket binds.

### Error
```
2026-05-11 06:14:36 IBC: Second Factor Authentication initiated
2026-05-11 06:16:27 IBC: detected dialog entitled: Second Factor Authentication; event=Closed
IBC returned exit status 143
Gateway finished
```

### Context
- Command attempted: `bash /home/ubuntu/ibgateway-native/start-ibc.sh`
- Prior blocker fixed in same session: brittle exact Java vendor-string check in `start-ibc.sh`
- After that fix, IBC launched correctly, reached the 2FA dialog, but still did not expose port `4000` or `4001`
- Port `5000` (Client Portal gateway) remained up, which is not sufficient for native order execution

### Suggested Fix
- Treat the primary outage as an auth/session-persistence problem, not an OpenClaw gateway failure.
- Confirm whether 2FA approval is completing successfully and whether the process is being terminated externally after dialog closure.
- Harden the native startup/recovery workflow around 2FA and post-login session persistence.
- Resolve canonical port truth (`4000` vs `4001`) after a stable post-login session exists.

### Metadata
- Reproducible: yes
- Related Files: /home/ubuntu/ibgateway-native/start-ibc.sh, /opt/ibc/config.ini, /home/ubuntu/Jts/jts.ini, /home/ubuntu/.openclaw/workspace/phase-123-ibkr-gateway-recovery-and-execution-enablement-plan.md


## [ERR-20260511-004] ibkr-native-nextvalidid-timeout-flake

**Logged**: 2026-05-11T06:49:10Z
**Priority**: high
**Status**: pending
**Area**: backend

### Summary
Interactive Brokers native auth can intermittently time out waiting for `nextValidId` even when canonical preflight passes and the socket is reachable.

### Error
```
Timed out waiting for nextValidId
```

### Context
- Command/operation attempted: `node scripts/test-interactive-brokers-auth.js`
- Environment: native IBKR mode, host `127.0.0.1`, port `4001`, readonly `false`
- Observed alongside: `node scripts/trade.js preflight portfolio/etf --json` returning `ok: true`
- Impact: canonical surfaces can disagree immediately before live submission, creating uncertainty during open-time execution

### Suggested Fix
Investigate native client handshake timing/race conditions around `nextValidId`, and make auth/readiness surfaces converge on a single stable probe or shared session strategy before first live transmission.

### Metadata
- Reproducible: yes
- Related Files: src/brokers/interactive-brokers/nativeClient.js,src/brokers/interactive-brokers/readiness.js,src/execution/executionAuthority.js,scripts/test-interactive-brokers-auth.js
- See Also: ERR-20260511-003

---
