# Python environment setup

This project uses Node.js for all orchestration, but relies on ib_insync (Python) for IBKR connectivity via the `skills/ibkr/` ib_insync skill.

## Initial setup

```bash
# ib_insync is already installed via pip/the IBKR skill.
# Silence the ib_insync tzdata warning that appears during FX execution-detail parsing:
pip install --user --break-system-packages tzdata
# Verify:
python3 -c "import tzdata; print('OK:', tzdata.__file__)"
```

> **Why tzdata?** ib_insync parses IBKR execution timestamps using `US/Eastern` timezone.  
> Without `tzdata`, Python 3.12 raises `ModuleNotFoundError: No module named 'tzdata'`  
> on every FX execution-detail parse. The error is non-fatal (execution succeeds)  
> but pollutes the log with red-herring tracebacks.  
> First observed: 2026-05-26, basket-etf-20260526T0944 execution.

## Environment path (as of 2026-05-26)
- System python3: `/usr/bin/python3` (Python 3.12.3)
- User site-packages: `/home/ubuntu/.local/lib/python3.12/site-packages/`
- tzdata installed: 2026.2
