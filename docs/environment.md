# Environment (Borderline mobility)

## Local Development
- OS: Linux
- Local role: edit scripts and run deploy commands from development laptop
- Remote hosting: Docker containers managed via Dockge
- Private connectivity: local network/Tailscale as configured
- Editor/Agent: Cursor + Claude agent

## Runtime and Tooling
- Node.js runtime: installed in containers (not on remote host directly).
- Package manager: npm.
- Dependency install: run `npm ci` inside `n8n_server` via `docker exec`.
- Lint/test tools: OxLint and script-level connectivity validation with Browserless/Playwright.

## Deployment Contexts
- Remote server: `192.168.0.43` (user `miq3l`)
- Remote scripts host path: `/home/miq3l/projects/dockge/n8n-scripts`
- n8n container: `n8n_server`
- Browserless container: `playwright_engine`
- Shared mount:
  - Host: `/home/miq3l/projects/dockge/n8n-scripts`
  - Container: `/files/n8n-scripts`

## Constraint Checklist
- Confirm where each task runs:
  - inside n8n execution
  - inside `n8n_server` container
  - browser automation via `playwright_engine` container
- Choose libraries that match runtime constraints.
- Use container DNS hostname `playwright_engine` and endpoint `ws://playwright_engine:3000` for browser sessions.
- Ensure both containers are on the same compose stack/network before execution.

## Secrets and Credentials
- Keep secrets in n8n credentials and/or platform secret stores.
- Never place tokens in workflow JSON or committed files.
- Keep SSH auth and webhook-sensitive values managed in n8n GUI credentials/config.

## Operational Notes
- Define timeout/retry policy per integration.
- Document target-site throttling/rate-limit handling in script comments or runbook.
- Maintain a small runbook for common failures:
  - Browserless container not running
  - container DNS/connectivity failure
  - dependency install mismatch in `n8n_server`

## Task Prompt Add-On (copy/paste)
"Execution boundary: n8n webhook -> SSH node -> Node script inside `n8n_server`, with Browserless at `ws://playwright_engine:3000`.
Use `docs/architecture.md` for placement rules.
Validate payload schemas (Zod), preserve idempotency/retry behavior, and keep deploy steps aligned with `deploy-n8n.sh`."
