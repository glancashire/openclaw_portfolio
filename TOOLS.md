# TOOLS.md - Local Notes

Things that matter in this setup:

### IBKR native gateway recovery
- Known-good native path: `/home/ubuntu/ibgateway-native/start-ibc.sh`
- That wrapper must use the pinned install4j runtime:
  - `/home/ubuntu/.local/share/i4j_jres/Oda-jK0QgTEmVssfllLP/17.0.16.0.101-zulu_64/bin/java`
- Do not let IB Gateway fall back to system Java (it broke the launcher and produced `NoClassDefFoundError: javafx/scene/Parent` / headless splash failures).
- Known-good gateway config expects the API socket on `127.0.0.1:4001`.
- `jts.ini` is at `/home/ubuntu/Jts/jts.ini`.
- The launcher may expose only the IBC command port (`7462`) until the GUI login / 2FA step is completed.
- If readiness says `connect ECONNREFUSED 127.0.0.1:4001`, the wrapper started but the gateway has not completed login and exposed the API port yet.
- Last verified launch display: `:99` via Xvfb.
- The practical finish step is completing the IB Gateway login / second-factor approval on that display, then rerunning `node scripts/check-interactive-brokers-readiness.js`.
