#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

OUTPUT_TAR="${1:-next-standalone.tar.gz}"
DEPLOY_DIR="deploy"
TEMP_ENV_SUFFIX=".deploy.bak"
LOCAL_ENV_FILES=(".env.local" ".env.production.local")

restore_local_env_files() {
  for env_file in "${LOCAL_ENV_FILES[@]}"; do
    backup_file="${env_file}${TEMP_ENV_SUFFIX}"
    if [[ -f "$backup_file" ]]; then
      mv "$backup_file" "$env_file"
    fi
  done
}

trap restore_local_env_files EXIT

echo "[1/6] install dependencies"
npm ci

echo "[2/6] disable local env overrides for production build"
for env_file in "${LOCAL_ENV_FILES[@]}"; do
  if [[ -f "$env_file" ]]; then
    mv "$env_file" "${env_file}${TEMP_ENV_SUFFIX}"
    echo "  - temporarily moved $env_file"
  fi
done

echo "[3/6] build next.js (standalone)"
NODE_ENV=production npm run build

echo "[4/6] assemble deploy directory"
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR/.next"

# Use '/.' so hidden directories and files are copied correctly.
cp -R .next/standalone/. "$DEPLOY_DIR/"
cp -R .next/static "$DEPLOY_DIR/.next/static"

if [[ -d public ]]; then
  cp -R public "$DEPLOY_DIR/public"
fi

if [[ -f .env.production ]]; then
  cp .env.production "$DEPLOY_DIR/.env.production"
fi

echo "[5/6] reduce package size"
find "$DEPLOY_DIR" -name "*.map" -type f -delete

echo "[6/6] create archive: $OUTPUT_TAR"
rm -f "$OUTPUT_TAR"
tar -czf "$OUTPUT_TAR" -C "$DEPLOY_DIR" .

echo
echo "Done"
echo "- archive: $SCRIPT_DIR/$OUTPUT_TAR"
du -sh "$OUTPUT_TAR" "$DEPLOY_DIR"
