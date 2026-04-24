#!/usr/bin/env node
/**
 * Headless browser test for PlanetSaveService round-trip.
 * Requires dev server running on localhost:5199.
 *
 * Usage: node scripts/test-save-roundtrip.mjs
 */
import puppeteer from 'puppeteer';

const URL = 'http://localhost:5199';

async function main() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Collect console output
  const logs = [];
  page.on('console', (msg) => {
    const text = msg.text();
    logs.push(text);
    console.log(`[browser] ${text}`);
  });

  page.on('pageerror', (err) => {
    console.error(`[browser error] ${err.message}`);
  });

  console.log('Loading app...');
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });

  // Wait for the test runner to be registered
  await page.waitForFunction(() => typeof window.__runSaveTests === 'function', { timeout: 10000 });

  console.log('Running save service tests...');
  const result = await page.evaluate(async () => {
    try {
      await window.__runSaveTests();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  await browser.close();

  if (result.success) {
    console.log('\nAll save service tests passed!');
    process.exit(0);
  } else {
    console.error(`\nTest failed: ${result.error}`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
