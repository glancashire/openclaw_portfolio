#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_PATH="$ROOT/.env"
BACKUP_DIR="$ROOT/runtime/env-backups"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$BACKUP_DIR"
if [ ! -f "$ENV_PATH" ]; then
  echo "{\"ok\":false,\"reason\":\"env_missing\",\"envPath\":\"$ENV_PATH\"}" >&2
  exit 2
fi
cp -p "$ENV_PATH" "$BACKUP_DIR/.env.latest"
cp -p "$ENV_PATH" "$BACKUP_DIR/.env.$STAMP"
chmod 600 "$BACKUP_DIR/.env.latest" "$BACKUP_DIR/.env.$STAMP" || true
echo "{\"ok\":true,\"envPath\":\"$ENV_PATH\",\"latest\":\"$BACKUP_DIR/.env.latest\",\"timestamped\":\"$BACKUP_DIR/.env.$STAMP\"}"
