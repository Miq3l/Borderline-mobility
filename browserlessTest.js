#!/usr/bin/env node
import { chromium } from 'playwright-core';

function responseTimestamp() {
  return new Date().toISOString();
}

async function main() {
  const browser = await chromium.connectOverCDP('ws://playwright_engine:3000');

  try {
    const page = await browser.newPage();
    await page.goto('https://n8n.io', { waitUntil: 'networkidle' });
    const title = await page.title();

    console.log(
      JSON.stringify({
        status: 'Success',
        timestamp: responseTimestamp(),
        site: title,
        note: 'Running as script via Execute Command node',
      })
    );
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(
    JSON.stringify({
      status: 'Failed',
      timestamp: responseTimestamp(),
      error: String((e && e.message) || e),
    })
  );
  process.exit(1);
});
