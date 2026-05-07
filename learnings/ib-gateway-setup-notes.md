# IB Gateway Setup Notes

## Current state (2026-05-07)

### What's installed
- IB Gateway 10.45 (stable) at `~/ibgateway-native/stage-stable/ibgateway/`
- IBC 3.23.0 at `/opt/ibc/` (configured with credentials, command port 7462)
- Xvfb available and working on `:99`
- Java 21 (OpenJDK)
- All Chromium dependencies present (libatk, libnss3, libgbm, etc.)
- systemd unit at `/etc/systemd/system/ibgateway.service` (container doesn't use systemd)
- IBC config at `/opt/ibc/config.ini` (permissions 600, has credentials)

### What works
- IB Gateway launches and renders a login window under Xvfb
- IBC can start Gateway, detect config, start CommandServer on port 7462
- Previous session (Apr 29 - May 2) was successfully authenticated and trading

### What doesn't work (yet)
- IBC cannot detect/interact with the new JxBrowser (Chromium-based) login dialog in IB Gateway 10.30+
- IBC keeps waiting for a Swing dialog that no longer exists in newer Gateway versions
- The Gateway shows the login page but IBC can't type credentials into it
- Session token from May 2 has expired; fresh 2FA authentication required

### The blocker
IB Gateway 10.45 uses a web-based login (JxBrowser = embedded Chromium). IBC 3.23 claims to support it but isn't successfully interacting with the login form in this container environment. The login requires:
1. Typing username/password into the embedded web form
2. 2FA via IBKR Mobile app
3. Both happen in a GUI that's running on a virtual display

### Options to fix
1. **VNC into the container**: Install x11vnc, Graham connects via VNC, logs in once manually. After that, IBC can handle auto-restarts (session persists ~24h with auto-restart).
2. **Use IB Client Portal API**: Separate REST-based gateway from IB that might handle auth differently.
3. **Downgrade to IB Gateway 10.19**: The last version with traditional Swing login that IBC handles perfectly.
4. **Use a different container image**: Pre-built Docker images like `ghcr.io/gnzsnz/ib-gateway` handle the headless login flow.

### Recommended approach
Option 1 (VNC) is quickest: install x11vnc → Graham VNCs in once → login → IBC manages restarts thereafter.
