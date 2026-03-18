#!/usr/bin/env bash
set -euo pipefail

BASE_DIR="/home/ubuntu/wedding-letter"
RUN_DIR="$BASE_DIR/run"
PID_FILE="$RUN_DIR/next.pid"

if [[ ! -f "$PID_FILE" ]]; then
  echo "next not running (pid file not found)"
  exit 0
fi

PID="$(cat "$PID_FILE")"
if [[ -z "${PID}" ]] || ! kill -0 "$PID" 2>/dev/null; then
  rm -f "$PID_FILE"
  echo "next not running (stale pid file removed)"
  exit 0
fi

kill "$PID"

for _ in $(seq 1 20); do
  if ! kill -0 "$PID" 2>/dev/null; then
    rm -f "$PID_FILE"
    echo "next stopped (pid=$PID)"
    exit 0
  fi
  sleep 1
done

kill -9 "$PID" 2>/dev/null || true
rm -f "$PID_FILE"
echo "next force stopped (pid=$PID)"
