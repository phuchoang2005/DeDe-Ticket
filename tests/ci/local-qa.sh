#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo "== backend: mvn verify =="
if command -v mvn >/dev/null 2>&1; then
  (
    cd "${ROOT_DIR}/backend"
    mvn verify
  )
elif command -v docker >/dev/null 2>&1; then
  docker run --rm \
    -v "${ROOT_DIR}/backend:/app" \
    -v "${HOME}/.m2:/root/.m2" \
    -w /app \
    maven:3.9.6-eclipse-temurin-21 \
    mvn verify
else
  echo "Neither mvn nor docker is available for backend QA." >&2
  exit 1
fi

echo "== frontend: npm test + build =="
if command -v npm >/dev/null 2>&1; then
  (
    cd "${ROOT_DIR}/frontend"
    npm ci
    npm run test
    npm run build
  )
elif command -v docker >/dev/null 2>&1; then
  docker run --rm \
    -v "${ROOT_DIR}/frontend:/app" \
    -v "${ROOT_DIR}/tests:/tests:ro" \
    -w /app \
    node:20-alpine \
    sh -lc 'npm ci && npm run test && npm run build'
else
  echo "Neither npm nor docker is available for frontend QA." >&2
  exit 1
fi

echo "Local QA passed."
