#!/usr/bin/env bash
set -euo pipefail

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_DIR="$BASE_DIR/run"
PID_FILE="$RUN_DIR/wedding-letter.pid"

if [[ ! -f "$PID_FILE" ]]; then
  echo "not running (pid file not found)"
  exit 0
fi

PID="$(cat "$PID_FILE")"
if [[ -z "${PID}" ]] || ! kill -0 "$PID" 2>/dev/null; then
  rm -f "$PID_FILE"
  echo "not running (stale pid file removed)"
  exit 0
fi

kill "$PID"

for _ in $(seq 1 20); do
  if ! kill -0 "$PID" 2>/dev/null; then
    rm -f "$PID_FILE"
    echo "stopped (pid=$PID)"
    exit 0
  fi
  sleep 1
done

kill -9 "$PID" 2>/dev/null || true
rm -f "$PID_FILE"
echo "force stopped (pid=$PID)"
