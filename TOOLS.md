# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## What Goes Here

Things like:

- Camera names and locations
- SSH hosts and aliases
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

## Examples

```markdown
### Cameras

- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered

### SSH

- home-server → 192.168.1.100, user: admin

### TTS

- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: Kitchen HomePod
```

## IBKR Gotchas

- Native IBKR socket connectivity and Client Portal/browser-session login can diverge. Native quotes/orders/fills may still work while portal/secdef lookup is logged out.
- For IBKR conid discovery on UCITS ETFs, raw native `contractDetails` can be more trustworthy than simplified search wrappers. Preserve `contract.conId`, `symbol`, `localSymbol`, `primaryExch`, and `currency`.
- For conid-based native orders, prefer minimal contract metadata; forcing repo-side symbol/currency hints can cause IBKR contract conflicts.

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

---

Add whatever helps you do your job. This is your cheat sheet.
