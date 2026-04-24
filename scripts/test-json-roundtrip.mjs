#!/usr/bin/env node
/**
 * Round-trip test for JSON export/import:
 * 1. Save a planet to IndexedDB
 * 2. Export it to JSON
 * 3. Delete it from IndexedDB
 * 4. Import the JSON
 * 5. Verify heights/biomes are byte-identical
 * 6. Verify config is deep-equal
 * 7. Verify thumbnail is a valid blob
 * 8. Test validation rejections
 * 9. Test name deduplication
 * 10. Test UI (JSON tab, Import button)
 *
 * Requires dev server running on localhost:5199.
 */
import puppeteer from 'puppeteer';

const URL = 'http://localhost:5199';
const wait = (ms) => new Promise(r => setTimeout(r, ms));

async function main() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];

  page.on('pageerror', (err) => {
    console.error(`[browser error] ${err.message}`);
    errors.push(err.message);
  });

  console.log('Loading app...');
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForFunction(() => window.__sceneManager != null, { timeout: 15000 });
  await wait(1000);

  // ── Test 1: Full round-trip ──────────────────────────────

  console.log('\n1. Round-trip test: save → export JSON → delete → import → verify...');
  const roundTripResult = await page.evaluate(async () => {
    const { PlanetSaveService } = await import('/src/services/PlanetSaveService.ts');
    const { ExportService } = await import('/src/services/ExportService.ts');
    const { ThumbnailService } = await import('/src/services/ThumbnailService.ts');
    const { usePlanetStore } = await import('/src/store/usePlanetStore.ts');

    const sm = window.__sceneManager;
    const store = usePlanetStore.getState();

    // Create services
    const saveService = new PlanetSaveService({
      getPlanetData: () => sm.planetData,
      getStoreState: () => usePlanetStore.getState(),
      applyStoreState: (config) => usePlanetStore.setState(config),
      applyPlanetData: (h, b) => {
        sm.planetData.heightmap.set(h);
        sm.planetData.biomeIds.set(b);
      },
    });
    const thumbSvc = new ThumbnailService(sm.renderer, sm.scene);
    saveService.setThumbnailService(thumbSvc);
    const exportSvc = new ExportService(sm);

    // Step 1: Save to IDB
    const saveId = await saveService.save('JSON Test Planet');
    const raw = await saveService.getRaw(saveId);

    // Step 2: Export to JSON (with thumbnail)
    const jsonBlob = await exportSvc.exportJSON(
      { includeThumbnail: true },
      'JSON Test Planet',
      thumbSvc,
    );
    const jsonText = await jsonBlob.text();
    const jsonSize = jsonText.length;
    const parsed = JSON.parse(jsonText);

    // Snapshot original data
    const originalHeights = new Uint8Array(raw.heights);
    const originalBiomes = new Uint8Array(raw.biomes);

    // Step 3: Delete from IDB
    await saveService.delete(saveId);
    const afterDelete = await saveService.list();
    const deletedOk = !afterDelete.some(e => e.id === saveId);

    // Step 4: Import the JSON
    const importedId = await saveService.importFromJSON(jsonText);

    // Step 5: Load and verify
    const importedRaw = await saveService.getRaw(importedId);

    // Heights comparison (byte-identical)
    const importedHeights = new Uint8Array(importedRaw.heights);
    let heightsMatch = originalHeights.length === importedHeights.length;
    if (heightsMatch) {
      for (let i = 0; i < originalHeights.length; i++) {
        if (originalHeights[i] !== importedHeights[i]) {
          heightsMatch = false;
          break;
        }
      }
    }

    // Biomes comparison
    const importedBiomes = new Uint8Array(importedRaw.biomes);
    let biomesMatch = originalBiomes.length === importedBiomes.length;
    if (biomesMatch) {
      for (let i = 0; i < originalBiomes.length; i++) {
        if (originalBiomes[i] !== importedBiomes[i]) {
          biomesMatch = false;
          break;
        }
      }
    }

    // Config comparison (deep-equal via JSON serialization)
    const origConfigStr = JSON.stringify(raw.config);
    const importConfigStr = JSON.stringify(importedRaw.config);
    const configMatch = origConfigStr === importConfigStr;

    // Thumbnail check
    const hasThumbnail = importedRaw.thumbnail instanceof Blob && importedRaw.thumbnail.size > 0;

    // Verify new UUID
    const newUUID = importedRaw.id !== saveId;

    // Cleanup
    await saveService.delete(importedId);
    thumbSvc.dispose();

    return {
      jsonSize,
      hasSchemaType: parsed.schemaType === 'planet',
      hasVersion: parsed.version === 1,
      hasHeightsB64: typeof parsed.heights_b64 === 'string',
      hasBiomesB64: typeof parsed.biomes_b64 === 'string',
      hasThumbnailB64: typeof parsed.thumbnail_b64 === 'string',
      deletedOk,
      heightsMatch,
      biomesMatch,
      configMatch,
      hasThumbnail,
      newUUID,
    };
  });

  const checks1 = [
    ['JSON has schemaType', roundTripResult.hasSchemaType],
    ['JSON has version', roundTripResult.hasVersion],
    ['JSON has heights_b64', roundTripResult.hasHeightsB64],
    ['JSON has biomes_b64', roundTripResult.hasBiomesB64],
    ['JSON has thumbnail_b64', roundTripResult.hasThumbnailB64],
    ['Deleted from IDB before import', roundTripResult.deletedOk],
    ['Heights byte-identical', roundTripResult.heightsMatch],
    ['Biomes byte-identical', roundTripResult.biomesMatch],
    ['Config deep-equal', roundTripResult.configMatch],
    ['Thumbnail valid blob', roundTripResult.hasThumbnail],
    ['New UUID assigned', roundTripResult.newUUID],
  ];

  let allOk = true;
  for (const [name, ok] of checks1) {
    console.log(`  ${ok ? 'PASS' : 'FAIL'}: ${name}`);
    if (!ok) allOk = false;
  }
  console.log(`  JSON size: ${(roundTripResult.jsonSize / 1024).toFixed(1)} KB`);

  // ── Test 2: Validation rejections ────────────────────────

  console.log('\n2. Testing validation rejections...');
  const validationResults = await page.evaluate(async () => {
    const { PlanetSaveService } = await import('/src/services/PlanetSaveService.ts');
    const sm = window.__sceneManager;
    const svc = new PlanetSaveService({
      getPlanetData: () => sm.planetData,
      getStoreState: () => ({}),
      applyStoreState: () => {},
      applyPlanetData: () => {},
    });

    const results = [];

    // Reject malformed JSON
    try {
      await svc.importFromJSON('not json at all {{{');
      results.push({ test: 'malformed JSON', error: null });
    } catch (e) {
      results.push({ test: 'malformed JSON', error: e.message });
    }

    // Reject wrong schemaType
    try {
      await svc.importFromJSON(JSON.stringify({ schemaType: 'other', version: 1 }));
      results.push({ test: 'wrong schemaType', error: null });
    } catch (e) {
      results.push({ test: 'wrong schemaType', error: e.message });
    }

    // Reject missing heights
    try {
      await svc.importFromJSON(JSON.stringify({
        schemaType: 'planet', version: 1, name: 'Test',
        biomes_b64: 'AAAA',
      }));
      results.push({ test: 'missing heights', error: null });
    } catch (e) {
      results.push({ test: 'missing heights', error: e.message });
    }

    // Reject corrupt buffer sizes
    try {
      await svc.importFromJSON(JSON.stringify({
        schemaType: 'planet', version: 1, name: 'Test',
        heights_b64: btoa('short'),
        biomes_b64: btoa('short'),
        config: {},
      }));
      results.push({ test: 'corrupt buffer sizes', error: null });
    } catch (e) {
      results.push({ test: 'corrupt buffer sizes', error: e.message });
    }

    // Reject file too large (simulate by checking the constant)
    results.push({ test: 'max size constant', error: `${PlanetSaveService.MAX_IMPORT_SIZE}` });

    return results;
  });

  const checks2 = [
    ['Rejects malformed JSON', validationResults[0].error?.includes('Not a valid JSON')],
    ['Rejects wrong schemaType', validationResults[1].error?.includes('schemaType')],
    ['Rejects missing heights', validationResults[2].error?.includes('missing height')],
    ['Rejects corrupt buffers', validationResults[3].error?.includes('Corrupt file') || validationResults[3].error?.includes('height data')],
    ['Max import size = 10MB', validationResults[4].error === '10485760'],
  ];

  for (const [name, ok] of checks2) {
    console.log(`  ${ok ? 'PASS' : 'FAIL'}: ${name}`);
    if (!ok) allOk = false;
  }

  // ── Test 3: Name deduplication ───────────────────────────

  console.log('\n3. Testing name deduplication...');
  const dedupeResult = await page.evaluate(async () => {
    const { PlanetSaveService } = await import('/src/services/PlanetSaveService.ts');
    const { ExportService } = await import('/src/services/ExportService.ts');
    const sm = window.__sceneManager;

    const svc = new PlanetSaveService({
      getPlanetData: () => sm.planetData,
      getStoreState: () => ({}),
      applyStoreState: () => {},
      applyPlanetData: () => {},
    });
    const exportSvc = new ExportService(sm);

    // Save a planet with a name
    const id1 = await svc.save('Duplicate Test');

    // Export as JSON
    const blob = await exportSvc.exportJSON({}, 'Duplicate Test');
    const json = await blob.text();

    // Import — should get "(imported)" suffix
    const id2 = await svc.importFromJSON(json);
    const raw2 = await svc.getRaw(id2);

    // Import again — should get "(imported 2)" suffix
    const id3 = await svc.importFromJSON(json);
    const raw3 = await svc.getRaw(id3);

    // Cleanup
    await svc.delete(id1);
    await svc.delete(id2);
    await svc.delete(id3);

    return {
      name2: raw2.name,
      name3: raw3.name,
    };
  });

  const checks3 = [
    ['First import: "(imported)"', dedupeResult.name2 === 'Duplicate Test (imported)'],
    ['Second import: "(imported 2)"', dedupeResult.name3 === 'Duplicate Test (imported 2)'],
  ];

  for (const [name, ok] of checks3) {
    console.log(`  ${ok ? 'PASS' : 'FAIL'}: ${name} (got: "${name.includes('First') ? dedupeResult.name2 : dedupeResult.name3}")`);
    if (!ok) allOk = false;
  }

  // ── Test 4: UI — JSON tab in Export modal ────────────────

  console.log('\n4. Testing JSON tab in Export modal...');
  await page.click('button[aria-label="Export PNG"]');
  await wait(500);

  // Switch to JSON tab
  const jsonTabFound = await page.evaluate(() => {
    const btns = document.querySelectorAll('[role="dialog"] button');
    for (const btn of btns) {
      if (btn.textContent?.trim() === 'JSON') {
        (btn).click();
        return true;
      }
    }
    return false;
  });
  if (!jsonTabFound) {
    console.log('  FAIL: JSON tab not found');
    allOk = false;
  } else {
    await wait(300);

    // Check for info text
    const hasInfo = await page.evaluate(() => {
      return !!document.querySelector('[role="dialog"] code')?.textContent?.includes('.stellaforge.json');
    });
    console.log(`  ${hasInfo ? 'PASS' : 'FAIL'}: Info text with .stellaforge.json`);
    if (!hasInfo) allOk = false;

    // Check for thumbnail checkbox
    const hasThumbCheck = await page.evaluate(() => {
      return document.querySelectorAll('[role="dialog"] input[type="checkbox"]').length >= 1;
    });
    console.log(`  ${hasThumbCheck ? 'PASS' : 'FAIL'}: Thumbnail checkbox present`);
    if (!hasThumbCheck) allOk = false;

    // Check for Export JSON button
    const hasJSONBtn = await page.evaluate(() => {
      const btns = document.querySelectorAll('[role="dialog"] button');
      return [...btns].some(b => b.textContent?.trim() === 'Export JSON');
    });
    console.log(`  ${hasJSONBtn ? 'PASS' : 'FAIL'}: Export JSON button present`);
    if (!hasJSONBtn) allOk = false;

    // Check size estimate
    const hasSizeHint = await page.evaluate(() => {
      const ps = document.querySelectorAll('[role="dialog"] p');
      return [...ps].some(p => p.textContent?.includes('Estimated'));
    });
    console.log(`  ${hasSizeHint ? 'PASS' : 'FAIL'}: Size estimate shown`);
    if (!hasSizeHint) allOk = false;
  }

  await page.keyboard.press('Escape');
  await wait(300);

  // ── Test 5: UI — Import button in Gallery ────────────────

  console.log('\n5. Testing Import button in Gallery...');
  await page.click('button[aria-label="Open Gallery"]');
  await wait(500);

  const hasImport = await page.evaluate(() => {
    return !!document.querySelector('button[aria-label="Import planet"]');
  });
  console.log(`  ${hasImport ? 'PASS' : 'FAIL'}: Import button present in gallery`);
  if (!hasImport) allOk = false;

  await page.keyboard.press('Escape');
  await wait(300);

  // ── Cleanup ──────────────────────────────────────────────

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

  await browser.close();

  const fatalErrors = errors.filter(e => !e.includes('THREE.Clock') && !e.includes('favicon'));
  if (fatalErrors.length > 0) {
    console.error('\nFatal page errors:', fatalErrors);
    allOk = false;
  }

  if (!allOk) {
    console.error('\nSOME TESTS FAILED');
    process.exit(1);
  }

  console.log('\nALL JSON ROUND-TRIP TESTS PASSED');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
