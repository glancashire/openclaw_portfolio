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
