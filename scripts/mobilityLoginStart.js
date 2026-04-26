#!/usr/bin/env node
import { chromium } from 'playwright-core';
import { ZodError } from 'zod';
import {
  defaultMobilitySelectors,
  validateMobilityAutomationConfig,
} from './schemas/mobilityAutomation.schema.js';

function parseBooleanLike(value) {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'no', 'n', 'off'].includes(normalized)) {
      return false;
    }
  }
  return undefined;
}

function parseInputPayload() {
  const argvPayload = process.argv[2] ? JSON.parse(process.argv[2]) : {};
  const envIgnoreHTTPSErrors = parseBooleanLike(process.env.MOBILITY_IGNORE_HTTPS_ERRORS);

  return {
    ...argvPayload,
    username: argvPayload.username ?? process.env.MOBILITY_USERNAME,
    password: argvPayload.password ?? process.env.MOBILITY_PASSWORD,
    ignoreHTTPSErrors: argvPayload.ignoreHTTPSErrors ?? envIgnoreHTTPSErrors,
  };
}

function classifyError(error) {
  if (error instanceof ZodError) {
    return 'ValidationError';
  }
  if (error?.name === 'TimeoutError') {
    return 'TimeoutError';
  }
  if (String(error?.message || '').includes('ECONNREFUSED')) {
    return 'ConnectivityError';
  }
  return 'AutomationError';
}

async function withRetry(stepName, retryConfig, action) {
  let attempt = 0;
  let delayMs = retryConfig.initialDelayMs;
  let latestError;

  while (attempt < retryConfig.maxAttempts) {
    attempt += 1;
    try {
      return await action({ attempt });
    } catch (error) {
      latestError = error;
      if (attempt >= retryConfig.maxAttempts) {
        break;
      }

      console.warn(
        JSON.stringify({
          level: 'warn',
          step: stepName,
          event: 'retrying',
          attempt,
          nextDelayMs: delayMs,
          failureClass: classifyError(error),
          message: String(error?.message || error),
        })
      );

      await new Promise((resolve) => setTimeout(resolve, delayMs));
      delayMs = Math.min(
        retryConfig.maxDelayMs,
        Math.round(delayMs * retryConfig.factor)
      );
    }
  }

  throw latestError;
}

async function waitForEnabledButton(page, selector, timeoutMs) {
  await page.waitForSelector(selector, { state: 'visible', timeout: timeoutMs });
  await page.waitForFunction(
    (innerSelector) => {
      const button = document.querySelector(innerSelector);
      return !!button && !button.disabled;
    },
    selector,
    { timeout: timeoutMs }
  );
}

function logEvent(level, step, details = {}) {
  console[level](
    JSON.stringify({
      level,
      step,
      ...details,
    })
  );
}

function responseTimestamp() {
  return new Date().toISOString();
}

async function runAutomation(config) {
  const selectors = {
    ...defaultMobilitySelectors,
    ...config.selectors,
  };

  const browser = await chromium.connectOverCDP(config.browserWSEndpoint);
  const context = await browser.newContext({
    ignoreHTTPSErrors: config.ignoreHTTPSErrors,
  });
  const page = await context.newPage();

  try {
    logEvent('log', 'connect_browser', {
      event: 'started',
      runId: config.runId,
      targetUrl: config.loginUrl,
      idempotencyKey: config.idempotencyKey ?? null,
    });

    await withRetry('load_login_page', config.retry, async () => {
      await page.goto(config.loginUrl, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector(selectors.passwordInput, {
        timeout: config.timeoutMs,
      });
    });

    await withRetry('submit_login_form', config.retry, async () => {
      await page.fill(selectors.usernameInput, config.username);
      await page.fill(selectors.passwordInput, config.password);
      await Promise.all([
        page.waitForSelector(selectors.postLoginReady, {
          timeout: config.timeoutMs,
        }),
        page.click(selectors.submitButton),
      ]);
    });

    if (config.postLoginUrl) {
      await withRetry('wait_post_login_url', config.retry, async () => {
        await page.waitForURL(
          (url) => url.href.startsWith(config.postLoginUrl),
          { timeout: config.timeoutMs }
        );
      });
    }

    const alreadyStarted = await page.isVisible(selectors.startedSignal);
    if (alreadyStarted) {
      logEvent('log', 'start_button', {
        event: 'already_started',
        note: 'Success signal already visible, skipping Start click for idempotency.',
      });
      return { alreadyStarted: true };
    }

    await withRetry('click_start_button', config.retry, async () => {
      await waitForEnabledButton(
        page,
        selectors.startButton,
        config.timeoutMs
      );
      await page.click(selectors.startButton);
      await page.waitForSelector(selectors.startedSignal, {
        timeout: config.timeoutMs,
      });
    });

    return { alreadyStarted: false };
  } finally {
    await page.close();
    await context.close();
    await browser.close();
  }
}

async function main() {
  let config;

  try {
    config = validateMobilityAutomationConfig(parseInputPayload());
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error(
        JSON.stringify({
          status: 'Failed',
          timestamp: responseTimestamp(),
          failureClass: 'ValidationError',
          message: 'Invalid JSON payload passed as first argument.',
        })
      );
      process.exit(1);
    }

    if (error instanceof ZodError) {
      console.error(
        JSON.stringify({
          status: 'Failed',
          timestamp: responseTimestamp(),
          failureClass: 'ValidationError',
          message: 'Input validation failed before starting automation.',
          issues: error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        })
      );
      process.exit(1);
    }

    throw error;
  }

  try {
    const result = await runAutomation(config);
    console.log(
      JSON.stringify({
        status: 'Success',
        timestamp: responseTimestamp(),
        runId: config.runId,
        idempotencyKey: config.idempotencyKey ?? null,
        loginUrl: config.loginUrl,
        postLoginUrl: config.postLoginUrl,
        browserWSEndpoint: config.browserWSEndpoint,
        ignoreHTTPSErrors: config.ignoreHTTPSErrors,
        result,
      })
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        status: 'Failed',
        timestamp: responseTimestamp(),
        failureClass: classifyError(error),
        runId: config?.runId ?? null,
        targetUrl: config?.postLoginUrl ?? config?.loginUrl ?? null,
        message: String(error?.message || error),
      })
    );
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(
    JSON.stringify({
      status: 'Failed',
      timestamp: responseTimestamp(),
      failureClass: classifyError(error),
      message: String(error?.message || error),
    })
  );
  process.exit(1);
});
