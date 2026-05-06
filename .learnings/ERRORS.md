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
