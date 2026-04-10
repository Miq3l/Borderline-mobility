# Architecture (Borderline mobility)

## Purpose
This file defines what belongs in n8n workflow configuration, Node scripts, and deployment helpers for the LASA mobility automation flow.

## System Boundaries
- n8n workflow: webhook-triggered orchestration and remote command execution via SSH node.
- Node scripts: browser automation logic executed in the containerized environment.
- Browserless container: Playwright-compatible browser execution endpoint (`playwright_engine`).
- Deployment helper: shell automation for file sync, dependency install, and smoke test.

## Placement Rules
- Keep trigger/orchestration decisions in n8n workflow configuration.
- Keep automation logic in script files (do not duplicate browser logic inside n8n node inline code).
- Keep deployment/ops commands in `deploy-n8n.sh`, not mixed into JS scripts.
- Keep webhook payload parsing separate from page automation actions.

## Folder/File Responsibilities (current)
- `browserlessTest.js`: connectivity and automation script tested from n8n context.
- Production Node script (WIP): main LASA automation logic triggered by webhook path.
- `deploy-n8n.sh`: deploy and execution helper for remote environment.
- `docs/`: system-awareness context and project operating constraints.

## Validation and Contracts
- Define Zod schema first for webhook payloads from MacroDroid and internal script config.
- Validate inbound payload and required fields before browser automation starts.
- Fail fast with actionable errors that n8n can route/alert on.

## Reliability Rules
- Design for idempotency in retried steps.
- Centralize retry/backoff strategy for page navigation and remote endpoint instability.
- Record structured logs for workflow start, browser connect, key page action, and completion/failure.

## Security and Secrets
- Store credentials in n8n credentials or platform secret managers.
- Do not commit secrets to repository files.
- Keep SSH and webhook-sensitive values out of scripts and docs; inject through n8n credentials/env.

## Refactoring Reference
Refactoring guidance in this repository is informed by Martin Fowler's *Refactoring (2nd Edition)*, especially:
- Extract Function
- Decompose Conditional
- Remove Duplicate Code
- Split Phase

## Decision Log (Optional)
Track key decisions:
- Date
- Decision
- Why
- Tradeoffs

## Initial Project Decisions
- Use n8n SSH node for remote script execution to align with existing infrastructure.
- Use Browserless container endpoint over local browser execution for predictable headless runtime.
- Keep script deployment automated via `deploy-n8n.sh` to reduce manual drift.
