# n8n Browserless Script Workflow

This project contains a standalone Node.js script executed from n8n to drive Browserless/Playwright.

## Files

- `browserlessTest.js`: main script executed inside the n8n container.
- `scripts/mobilityLoginStart.js`: production login + Start-button automation script.
- `scripts/schemas/mobilityAutomation.schema.js`: Zod input contract for the production script.
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

Run production script locally with env-injected credentials:

```bash
MOBILITY_USERNAME='your-user' MOBILITY_PASSWORD='your-pass' npm run run:mobility
```

## What `npm run deploy` does

1. Copies `browserlessTest.js`, `scripts/`, `package.json`, `package-lock.json` to the server script folder.
2. Runs `npm ci` in `/files/n8n-scripts` inside `n8n_server`.
3. Executes:

```bash
docker exec n8n_server node /files/n8n-scripts/browserlessTest.js
```

To execute the production script with JSON payload:

```bash
./deploy-n8n.sh --script scripts/mobilityLoginStart.js --payload-json '{"runId":"manual-ui"}'
```

## n8n Workflow Usage

In your n8n setup, the `SSH` node executes commands on the remote host (`192.168.0.43`), not inside the container. Because of that, commands must use `docker exec` to run Node inside `n8n_server`.

Minimal command for this automation:

```bash
docker exec n8n_server node /files/n8n-scripts/scripts/mobilityLoginStart.js '{"username":"miq3l","password":"KKde vaca","retry":{"maxAttempts":1}}'
```

Example using n8n expressions from incoming item data:

```bash
docker exec n8n_server node /files/n8n-scripts/scripts/mobilityLoginStart.js '{{ JSON.stringify({ username: $json.username, password: $json.password, retry: { maxAttempts: 1 } }) }}'
```

The script accepts one JSON payload argument (`process.argv[2]`) and validates it with Zod before starting browser automation.

### Fields you can override

- `username` (required): login username.
- `password` (required): login password.
- `browserWSEndpoint`: Browserless/Playwright endpoint. Default: `ws://playwright_engine:3000`.
- `ignoreHTTPSErrors`: ignore invalid/self-signed HTTPS certificates in Playwright context. Default: `true`.
- `loginUrl`: login page URL. Default: `https://mobility.laguilar.es:9082/account/signin`.
- `postLoginUrl`: expected post-login URL prefix. Default: `https://mobility.laguilar.es:9082`.
- `timeoutMs`: timeout used for waits and page conditions. Default: `30000`.
- `retry`: retry/backoff configuration object for unstable navigation/actions:
  - `maxAttempts`: attempts per retried step (default `2`, allowed `1..5`).
  - `initialDelayMs`: first retry delay in ms (default `500`).
  - `factor`: exponential backoff multiplier (default `1.8`).
  - `maxDelayMs`: cap for retry delay in ms (default `2500`).
- `selectors`: selector override object in case the target DOM changes:
  - `usernameInput` (default `input[id="Input_UserName"]`)
  - `passwordInput` (default `input[id="Input_Password"]`)
  - `submitButton` (default `button[type="submit"]`)
  - `postLoginReady` (default `header`)
  - `startButton` (default `button[class="mb-1 btn btn-success btn-lg shadow-sm rounded-0"]`)
  - `startedSignal` (default `button[class="mb-1 mt-2 btn btn-danger btn-lg shadow-sm rounded-0"]`)

## Troubleshooting

- `Cannot find module 'playwright-core'`:
  - Ensure `npm run deploy` completed and `npm ci` ran successfully.
- Node cannot connect to Browserless:
  - Check `playwright_engine` container is running.
  - Confirm script target is `ws://playwright_engine:3000`.
- Repeated password prompts:
  - Configure SSH keys (`ssh-copy-id`) for passwordless deploy.
- `net::ERR_CERT_AUTHORITY_INVALID` on `page.goto`:
  - The script already defaults to ignoring invalid certs (`ignoreHTTPSErrors=true`).
  - You can override in payload if needed:
    - `{"ignoreHTTPSErrors":true}` to allow self-signed/invalid certs.
    - `{"ignoreHTTPSErrors":false}` to enforce strict cert validation.
  - You can also control this with env var:
    - `MOBILITY_IGNORE_HTTPS_ERRORS=true` or `MOBILITY_IGNORE_HTTPS_ERRORS=false`.

