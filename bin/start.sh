#!/usr/bin/env bash
set -euo pipefail

BASE_DIR="/home/ubuntu/wedding-letter"
JAR_FILE="${JAR_FILE:-$BASE_DIR/wedding-letter.jar}"
CONFIG_DIR="${CONFIG_DIR:-$BASE_DIR/config}"
SPRING_PROFILE="${SPRING_PROFILE:-prod}"
LOG_DIR="$BASE_DIR/logs"
RUN_DIR="$BASE_DIR/run"
PID_FILE="$RUN_DIR/wedding-letter.pid"
NOHUP_LOG="$LOG_DIR/backend.out"
JAVA_OPTS="${JAVA_OPTS:--Xms128m -Xmx256m -XX:MaxMetaspaceSize=128m -XX:+UseSerialGC -XX:+ExitOnOutOfMemoryError}"

mkdir -p "$LOG_DIR" "$RUN_DIR"

if [[ ! -f "$JAR_FILE" ]]; then
  echo "JAR not found: $JAR_FILE"
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

if [[ -f "$CONFIG_DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$CONFIG_DIR/.env"
  set +a
fi

nohup java $JAVA_OPTS -jar "$JAR_FILE" \
  --spring.profiles.active="$SPRING_PROFILE" \
  --spring.config.additional-location="file:$CONFIG_DIR/" \
  >> "$NOHUP_LOG" 2>&1 &

NEW_PID=$!
echo "$NEW_PID" > "$PID_FILE"

sleep 1
if kill -0 "$NEW_PID" 2>/dev/null; then
  echo "started (pid=$NEW_PID)"
  echo "nohup log: $NOHUP_LOG"
else
  echo "failed to start. check log: $NOHUP_LOG"
  exit 1
fi
