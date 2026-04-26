#!/usr/bin/env bash
set -euo pipefail

# Local-to-server deploy helper for n8n script testing.
# Usage:
#   ./deploy-n8n.sh
#   ./deploy-n8n.sh --skip-install
#   ./deploy-n8n.sh --script scripts/mobilityLoginStart.js --payload-json '{"runId":"manual"}'

SERVER_USER="miq3l"
SERVER_HOST="192.168.0.43"
REMOTE_DIR="/home/miq3l/projects/dockge/n8n-scripts"
CONTAINER_NAME="n8n_server"
CONTAINER_DIR="/files/n8n-scripts"

SKIP_INSTALL="false"
SCRIPT_PATH="browserlessTest.js"
PAYLOAD_JSON=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-install)
      SKIP_INSTALL="true"
      shift
      ;;
    --script)
      SCRIPT_PATH="${2:-}"
      shift 2
      ;;
    --payload-json)
      PAYLOAD_JSON="${2:-}"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1"
      exit 1
      ;;
  esac
done

echo "==> Copying files to ${SERVER_USER}@${SERVER_HOST}:${REMOTE_DIR}"
scp -r "browserlessTest.js" "scripts" "package.json" "package-lock.json" \
  "${SERVER_USER}@${SERVER_HOST}:${REMOTE_DIR}/"

if [[ "${SKIP_INSTALL}" != "true" ]]; then
  echo "==> Running npm ci inside container"
  ssh "${SERVER_USER}@${SERVER_HOST}" \
    "docker exec ${CONTAINER_NAME} sh -lc 'cd ${CONTAINER_DIR} && npm ci'"
else
  echo "==> Skipping npm ci (--skip-install)"
fi

echo "==> Executing script inside container"
if [[ -n "${PAYLOAD_JSON}" ]]; then
  ssh "${SERVER_USER}@${SERVER_HOST}" \
    "docker exec ${CONTAINER_NAME} node ${CONTAINER_DIR}/${SCRIPT_PATH} '${PAYLOAD_JSON}'"
else
  ssh "${SERVER_USER}@${SERVER_HOST}" \
    "docker exec ${CONTAINER_NAME} node ${CONTAINER_DIR}/${SCRIPT_PATH}"
fi

echo "==> Deploy and test completed."
