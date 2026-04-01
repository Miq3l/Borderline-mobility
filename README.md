# n8n Browserless Script Workflow

This project contains a standalone Node.js script executed from n8n to drive Browserless/Playwright.

## Files

- `browserlessTest.js`: main script executed inside the n8n container.
- `deploy-n8n.sh`: helper script to copy files to server, install dependencies, and run a test execution.
- `package.json` / `package-lock.json`: dependency metadata for reproducible `npm ci` installs.

## Current Setup

- Local development machine: edits code and runs deploy commands.
- Remote server: `192.168.0.43` (user `miq3l`).
- Remote scripts folder: `/home/miq3l/projects/dockge/n8n-scripts`.
- n8n container name: `n8n_server`.
- Browserless container name: `playwright_engine`.

## n8n Docker Notes

The n8n service should include:

- `N8N_ENABLE_EXECUTE_COMMAND=true`
- Volume mount: `/home/miq3l/projects/dockge/n8n-scripts:/files/n8n-scripts`

## Local Commands

Install dependencies locally (optional):

```bash
npm install
```

Deploy, install in container, and run script:

```bash
npm run deploy
```

Fast deploy (skip `npm ci` in container):

```bash
npm run deploy:fast
```

## What `npm run deploy` does

1. Copies `browserlessTest.js`, `package.json`, `package-lock.json` to the server script folder.
2. Runs `npm ci` in `/files/n8n-scripts` inside `n8n_server`.
3. Executes:

```bash
docker exec n8n_server node /files/n8n-scripts/browserlessTest.js
```

## n8n Workflow Usage

If `Execute Command` is not available in your n8n UI, use the `SSH` node:

- Host: `192.168.0.43`
- User: `miq3l`
- Resource: `Command`
- Operation: `Execute`
- Command:

```bash
docker exec n8n_server node /files/n8n-scripts/browserlessTest.js
```

## Troubleshooting

- `Cannot find module 'playwright-core'`:
  - Ensure `npm run deploy` completed and `npm ci` ran successfully.
- Node cannot connect to Browserless:
  - Check `playwright_engine` container is running.
  - Confirm script target is `ws://playwright_engine:3000`.
- Repeated password prompts:
  - Configure SSH keys (`ssh-copy-id`) for passwordless deploy.
