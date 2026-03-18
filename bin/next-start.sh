#!/usr/bin/env bash
set -euo pipefail

BASE_DIR="/home/ubuntu/wedding-letter"
APP_DIR="${APP_DIR:-$BASE_DIR/frontend/standalone}"
PORT="${PORT:-9000}"
LOG_DIR="$BASE_DIR/logs"
RUN_DIR="$BASE_DIR/run"
PID_FILE="$RUN_DIR/next.pid"
NOHUP_LOG="$LOG_DIR/next.out.log"

mkdir -p "$LOG_DIR" "$RUN_DIR"

if [[ ! -d "$APP_DIR" ]]; then
  echo "Next app directory not found: $APP_DIR"
  exit 1
fi

if [[ ! -f "$APP_DIR/server.js" ]]; then
  echo "server.js not found: $APP_DIR/server.js"
  exit 1
fi

if [[ -f "$PID_FILE" ]]; then
  OLD_PID="$(cat "$PID_FILE")"
  if [[ -n "${OLD_PID}" ]] && kill -0 "$OLD_PID" 2>/dev/null; then
    echo "already running (pid=$OLD_PID)"
    exit 1
  fi
  rm -f "$PID_FILE"
fi

cd "$APP_DIR"

nohup env NODE_ENV=production PORT="$PORT" node server.js \
  >> "$NOHUP_LOG" 2>&1 &

NEW_PID=$!
echo "$NEW_PID" > "$PID_FILE"

sleep 1
if kill -0 "$NEW_PID" 2>/dev/null; then
  echo "next started (pid=$NEW_PID, port=$PORT)"
  echo "nohup log: $NOHUP_LOG"
else
  echo "failed to start next. check log: $NOHUP_LOG"
  exit 1
fi
