#!/usr/bin/env node
/**
 * Quick smoke test for Gallery + Save flows.
 * Requires dev server running on localhost:5199.
 */
import puppeteer from 'puppeteer';

const URL = 'http://localhost:5199';
const wait = (ms) => new Promise(r => setTimeout(r, ms));

async function main() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];

  page.on('console', (msg) => console.log(`[browser] ${msg.text()}`));
  page.on('pageerror', (err) => {
    console.error(`[browser error] ${err.message}`);
    errors.push(err.message);
  });

  console.log('Loading app...');
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForFunction(() => window.__sceneManager != null, { timeout: 15000 });
  await wait(1000);

  // 1. Test Save button
  console.log('\n1. Testing Save dialog...');
  await page.click('button[aria-label="Save Planet"]');
  await wait(300);
  let found = await page.evaluate(() =>
    [...document.querySelectorAll('h2')].some(el => el.textContent === 'Save Planet')
  );
  if (!found) throw new Error('Save dialog did not open');
  console.log('  Save dialog opened');

  // Type name + save
  const nameInput = await page.$('input[maxlength="64"]');
  await nameInput.click({ clickCount: 3 });
  await nameInput.type('Test Planet Alpha');

  // Click the dialog's Save button (last one — not the top bar's Save)
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')];
    const saveBtns = btns.filter(b => b.textContent?.trim() === 'Save');
    saveBtns[saveBtns.length - 1]?.click();
  });

  // Wait for dialog to close
  await page.waitForFunction(
    () => ![...document.querySelectorAll('h2')].some(el => el.textContent === 'Save Planet'),
    { timeout: 5000 },
  );
  await wait(200);
  console.log('  Planet saved');

  // 2. Test Gallery button
  console.log('\n2. Testing Gallery modal...');
  await page.click('button[aria-label="Open Gallery"]');
  await wait(500);
  found = await page.evaluate(() =>
    !!document.querySelector('[aria-label="Planet Gallery"]')
  );
  if (!found) throw new Error('Gallery modal did not open');
  console.log('  Gallery opened');

  // Check saved planet appears
  const hasCard = await page.evaluate(() =>
    [...document.querySelectorAll('.truncate')].some(el => el.textContent === 'Test Planet Alpha')
  );
  if (!hasCard) throw new Error('Saved planet not found in gallery');
  console.log('  Saved planet appears in gallery');

  // 3. Test search filter
  console.log('\n3. Testing search...');
  await page.type('input[placeholder="Search..."]', 'zzz_nonexistent');
  await wait(200);
  const emptyState = await page.evaluate(() => {
    const p = document.querySelector('[aria-label="Planet Gallery"] .text-gray-500 p');
    return p?.textContent ?? null;
  });
  if (!emptyState || !emptyState.includes('No planets match')) {
    throw new Error('Search empty state not shown');
  }
  console.log('  Search filter shows empty state');

  // Clear search
  const searchInput = await page.$('input[placeholder="Search..."]');
  await searchInput.click({ clickCount: 3 });
  await searchInput.type('Test');
  await wait(200);
  const hasFilteredCard = await page.evaluate(() =>
    [...document.querySelectorAll('.truncate')].some(el => el.textContent === 'Test Planet Alpha')
  );
  if (!hasFilteredCard) throw new Error('Search filter did not match');
  console.log('  Search filter matches');

  // 4. Close with Escape
  console.log('\n4. Testing Escape to close...');
  await page.keyboard.press('Escape');
  await wait(300);
  found = await page.evaluate(() =>
    !!document.querySelector('[aria-label="Planet Gallery"]')
  );
  if (found) throw new Error('Gallery did not close on Escape');
  console.log('  Gallery closed with Escape');

  // 5. G shortcut
  console.log('\n5. Testing G shortcut...');
  await page.keyboard.press('g');
  await wait(300);
  found = await page.evaluate(() =>
    !!document.querySelector('[aria-label="Planet Gallery"]')
  );
  if (!found) throw new Error('G shortcut did not open gallery');
  console.log('  G shortcut works');

  // Close
  await page.keyboard.press('Escape');
  await wait(300);

  // 6. Verify top bar shows save name
  console.log('\n6. Testing top bar indicator...');
  const topBarText = await page.evaluate(() => {
    const spans = document.querySelectorAll('span');
    for (const s of spans) {
      if (s.textContent?.includes('Test Planet Alpha')) return s.textContent;
    }
    return null;
  });
  if (!topBarText) throw new Error('Top bar does not show save name');
  console.log(`  Top bar shows: "${topBarText}"`);

  // 7. Ctrl+S shortcut
  console.log('\n7. Testing Ctrl+S shortcut...');
  await page.keyboard.down('Meta');
  await page.keyboard.press('s');
  await page.keyboard.up('Meta');
  await wait(300);
  found = await page.evaluate(() =>
    [...document.querySelectorAll('h2')].some(el => el.textContent === 'Save Planet')
  );
  if (!found) throw new Error('Ctrl+S did not open save dialog');
  console.log('  Ctrl+S opens save dialog');

  // Should show "Overwrite" since we already have a save
  const hasOverwrite = await page.evaluate(() =>
    [...document.querySelectorAll('button')].some(b => b.textContent?.trim() === 'Overwrite')
  );
  if (!hasOverwrite) throw new Error('Should show Overwrite for existing save');
  console.log('  Shows "Overwrite" for existing save');

  // Close save dialog
  await page.keyboard.press('Escape');
  await wait(200);

  // Cleanup — delete via IDB directly
  console.log('\n8. Cleaning up...');
  await page.evaluate(async () => {
    const req = indexedDB.open('stellaforge', 1);
    await new Promise((resolve, reject) => {
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction('planets', 'readwrite');
        tx.objectStore('planets').clear();
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => reject(tx.error);
      };
      req.onerror = () => reject(req.error);
    });
  });
  console.log('  Done');

  await browser.close();

  const fatalErrors = errors.filter(e => !e.includes('THREE.Clock') && !e.includes('favicon'));
  if (fatalErrors.length > 0) {
    console.error('\nFatal page errors:', fatalErrors);
    process.exit(1);
  }

  console.log('\nALL GALLERY SMOKE TESTS PASSED');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
