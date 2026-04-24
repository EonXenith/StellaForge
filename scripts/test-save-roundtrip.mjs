#!/usr/bin/env node
/**
 * Headless browser test for PlanetSaveService round-trip + thumbnail capture.
 * Requires dev server running on localhost:5199.
 *
 * Usage: node scripts/test-save-roundtrip.mjs
 *
 * Outputs:
 *   - Console log of all test results
 *   - scripts/test-thumbnail.png — captured thumbnail for visual inspection
 */
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const URL = 'http://localhost:5199';
const THUMBNAIL_PATH = path.join(__dirname, 'test-thumbnail.png');

async function main() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Collect console output
  page.on('console', (msg) => {
    console.log(`[browser] ${msg.text()}`);
  });

  page.on('pageerror', (err) => {
    console.error(`[browser error] ${err.message}`);
  });

  console.log('Loading app...');
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });

  // Wait for test runners + scene manager
  await page.waitForFunction(
    () =>
      typeof window.__runSaveTests === 'function' &&
      typeof window.__testThumbnailRoundTrip === 'function' &&
      window.__sceneManager != null,
    { timeout: 15000 },
  );

  // --- Run core save tests ---
  console.log('\nRunning core save service tests...');
  const coreResult = await page.evaluate(async () => {
    try {
      await window.__runSaveTests();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  if (!coreResult.success) {
    console.error(`\nCore test FAILED: ${coreResult.error}`);
    await browser.close();
    process.exit(1);
  }

  // --- Run thumbnail test ---
  console.log('\nRunning thumbnail capture test...');
  const thumbResult = await page.evaluate(async () => {
    try {
      const sm = window.__sceneManager;
      const blob = await window.__testThumbnailRoundTrip(sm.renderer, sm.scene);
      // Convert Blob to base64 for transfer to Node
      const buf = await blob.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return { success: true, base64: btoa(binary), size: blob.size };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  await browser.close();

  if (!thumbResult.success) {
    console.error(`\nThumbnail test FAILED: ${thumbResult.error}`);
    process.exit(1);
  }

  // Write thumbnail to disk
  const pngBuffer = Buffer.from(thumbResult.base64, 'base64');
  fs.writeFileSync(THUMBNAIL_PATH, pngBuffer);
  console.log(`\nThumbnail written to: ${THUMBNAIL_PATH} (${thumbResult.size} bytes)`);

  console.log('\nALL TESTS PASSED');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
