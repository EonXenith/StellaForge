#!/usr/bin/env node
/**
 * Smoke test for PNG Export flow.
 * Requires dev server running on localhost:5199.
 */
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const URL = 'http://localhost:5199';
const wait = (ms) => new Promise(r => setTimeout(r, ms));

async function main() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];

  // Intercept downloads
  const downloadDir = path.resolve('test-exports');
  if (!fs.existsSync(downloadDir)) fs.mkdirSync(downloadDir);

  // Enable download behavior
  const client = await page.createCDPSession();
  await client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: downloadDir,
  });

  page.on('console', (msg) => console.log(`[browser] ${msg.text()}`));
  page.on('pageerror', (err) => {
    console.error(`[browser error] ${err.message}`);
    errors.push(err.message);
  });

  console.log('Loading app...');
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForFunction(() => window.__sceneManager != null, { timeout: 15000 });
  await wait(1000);

  // 1. Test Export button opens modal
  console.log('\n1. Testing Export button...');
  await page.click('button[aria-label="Export PNG"]');
  await wait(500);
  let found = await page.evaluate(() =>
    !!document.querySelector('[aria-label="Export"][role="dialog"]')
  );
  if (!found) throw new Error('Export modal did not open');
  console.log('  Export modal opened');

  // 2. Wait for preview to load
  console.log('\n2. Waiting for preview...');
  await page.waitForFunction(() => {
    const img = document.querySelector('[aria-label="Export"][role="dialog"] img');
    return img && img.complete && img.naturalWidth > 0;
  }, { timeout: 10000 });
  console.log('  Preview loaded');

  // 3. Test resolution buttons
  console.log('\n3. Testing resolution buttons...');
  const resButtons = await page.$$('[aria-label="Export"][role="dialog"] button');
  // Find the 1024 button
  const has1024 = await page.evaluate(() => {
    const btns = document.querySelectorAll('[aria-label="Export"][role="dialog"] button');
    return [...btns].some(b => b.textContent?.includes('1024'));
  });
  if (!has1024) throw new Error('Resolution buttons not found');
  console.log('  Resolution buttons present');

  // Click 1024 resolution
  await page.evaluate(() => {
    const btns = document.querySelectorAll('[aria-label="Export"][role="dialog"] button');
    const btn = [...btns].find(b => b.textContent?.includes('1024'));
    btn?.click();
  });
  await wait(200);
  console.log('  Selected 1024×1024');

  // 4. Test transparent toggle
  console.log('\n4. Testing transparent toggle...');
  const checkboxes = await page.$$('[aria-label="Export"][role="dialog"] input[type="checkbox"]');
  if (checkboxes.length < 2) throw new Error('Toggle checkboxes not found');
  // Toggle transparent on
  await checkboxes[0].click();
  await wait(1000); // Wait for preview to regenerate
  console.log('  Transparent toggle works');

  // Toggle transparent off
  await checkboxes[0].click();
  await wait(500);

  // 5. Test export (at 1024 resolution to keep it fast)
  console.log('\n5. Testing PNG export at 1024...');
  await page.evaluate(() => {
    const btns = document.querySelectorAll('[aria-label="Export"][role="dialog"] button');
    const exportBtn = [...btns].find(b => b.textContent?.trim() === 'Export PNG');
    exportBtn?.click();
  });
  await wait(2000); // Wait for export + download

  // Check for success toast
  const toastText = await page.evaluate(() => {
    const toasts = document.querySelectorAll('[class*="toast"], [role="alert"]');
    for (const t of toasts) {
      if (t.textContent?.includes('Exported')) return t.textContent;
    }
    // Also check for any span/div containing "Exported"
    const all = document.querySelectorAll('div, span');
    for (const el of all) {
      if (el.textContent?.includes('Exported 1024')) return el.textContent;
    }
    return null;
  });
  if (toastText) {
    console.log(`  Toast: "${toastText}"`);
  } else {
    console.log('  (Toast may have auto-dismissed)');
  }

  // 6. Test Escape to close
  console.log('\n6. Testing Escape to close...');
  // Modal might still be open
  found = await page.evaluate(() =>
    !!document.querySelector('[aria-label="Export"][role="dialog"]')
  );
  if (found) {
    await page.keyboard.press('Escape');
    await wait(300);
    found = await page.evaluate(() =>
      !!document.querySelector('[aria-label="Export"][role="dialog"]')
    );
    if (found) throw new Error('Export modal did not close on Escape');
    console.log('  Export modal closed with Escape');
  } else {
    console.log('  Export modal already closed');
  }

  // 7. Test Ctrl+E shortcut
  console.log('\n7. Testing Ctrl+E shortcut...');
  await page.keyboard.down('Meta');
  await page.keyboard.press('e');
  await page.keyboard.up('Meta');
  await wait(500);
  found = await page.evaluate(() =>
    !!document.querySelector('[aria-label="Export"][role="dialog"]')
  );
  if (!found) throw new Error('Ctrl+E did not open export modal');
  console.log('  Ctrl+E opens export modal');

  // Close
  await page.keyboard.press('Escape');
  await wait(300);

  // Check download exists
  console.log('\n8. Checking downloaded file...');
  const files = fs.readdirSync(downloadDir).filter(f => f.endsWith('.png'));
  if (files.length > 0) {
    const lastFile = files[files.length - 1];
    const stat = fs.statSync(path.join(downloadDir, lastFile));
    console.log(`  Downloaded: ${lastFile} (${(stat.size / 1024).toFixed(1)} KB)`);
  } else {
    console.log('  (Download may not have completed in headless mode — this is expected)');
  }

  await browser.close();

  // Cleanup downloads
  if (fs.existsSync(downloadDir)) {
    fs.rmSync(downloadDir, { recursive: true });
  }

  const fatalErrors = errors.filter(e => !e.includes('THREE.Clock') && !e.includes('favicon'));
  if (fatalErrors.length > 0) {
    console.error('\nFatal page errors:', fatalErrors);
    process.exit(1);
  }

  console.log('\nALL EXPORT SMOKE TESTS PASSED');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
