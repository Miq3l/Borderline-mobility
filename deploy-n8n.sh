#!/usr/bin/env bash
set -euo pipefail

# Local-to-server deploy helper for n8n script testing.
# Usage:
#   ./deploy-n8n.sh
#   ./deploy-n8n.sh --skip-install

SERVER_USER="miq3l"
SERVER_HOST="192.168.0.43"
REMOTE_DIR="/home/miq3l/projects/dockge/n8n-scripts"
CONTAINER_NAME="n8n_server"
CONTAINER_DIR="/files/n8n-scripts"

SKIP_INSTALL="false"
if [[ "${1:-}" == "--skip-install" ]]; then
  SKIP_INSTALL="true"
fi

echo "==> Copying files to ${SERVER_USER}@${SERVER_HOST}:${REMOTE_DIR}"
scp "browserlessTest.js" "package.json" "package-lock.json" \
  "${SERVER_USER}@${SERVER_HOST}:${REMOTE_DIR}/"

if [[ "${SKIP_INSTALL}" != "true" ]]; then
  echo "==> Running npm ci inside container"
  ssh "${SERVER_USER}@${SERVER_HOST}" \
    "docker exec ${CONTAINER_NAME} sh -lc 'cd ${CONTAINER_DIR} && npm ci'"
else
  echo "==> Skipping npm ci (--skip-install)"
fi

echo "==> Executing script inside container"
ssh "${SERVER_USER}@${SERVER_HOST}" \
  "docker exec ${CONTAINER_NAME} node ${CONTAINER_DIR}/browserlessTest.js"

echo "==> Deploy and test completed."
