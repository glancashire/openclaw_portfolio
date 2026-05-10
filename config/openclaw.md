# OpenClaw Portfolio Configuration Notes

## Purpose
Document portfolio-manager-specific OpenClaw configuration choices without storing secrets.

## Current guidance
- Keep broker credentials in environment variables or a secret store.
- Keep trading actions behind approval by default.
- Prefer scheduled sync/reporting over hidden background state.
- Follow `system-policy.md` as the canonical repo-local contract for instruction authority, automation limits, messaging behavior, and live-execution prerequisites.
