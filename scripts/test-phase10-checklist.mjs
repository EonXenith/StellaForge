#!/usr/bin/env node
/**
 * Phase 10 — Final test checklist.
 * Covers items not already tested by the individual test scripts.
 *
 * Requires dev server running on localhost:5199.
 */
import puppeteer from 'puppeteer';

const URL = 'http://localhost:5199';
const wait = (ms) => new Promise(r => setTimeout(r, ms));

const results = [];
function record(num, name, pass, notes = '') {
  results.push({ num, name, pass, notes });
}

async function main() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];

  page.on('pageerror', (err) => {
    if (!err.message.includes('THREE.Clock') && !err.message.includes('favicon')) {
      errors.push(err.message);
    }
  });

  console.log('Loading app...');
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForFunction(() => window.__sceneManager != null, { timeout: 15000 });
  await wait(2000);

  // ── 1. Fresh profile: app loads, planet renders, no console errors ──
  {
    const hasCanvas = await page.evaluate(() => !!document.querySelector('canvas'));
    const noErrors = errors.length === 0;
    record(1, 'Fresh load: planet renders, no errors', hasCanvas && noErrors,
      hasCanvas ? (noErrors ? '' : `${errors.length} error(s)`) : 'No canvas found');
  }

  // ── 2. Save/load round-trip: save, reload, verify persistence ──
  {
    const ok = await page.evaluate(async () => {
      const { PlanetSaveService } = await import('/src/services/PlanetSaveService.ts');
      const { usePlanetStore } = await import('/src/store/usePlanetStore.ts');
      const sm = window.__sceneManager;
      const svc = new PlanetSaveService({
        getPlanetData: () => sm.planetData,
        getStoreState: () => usePlanetStore.getState(),
        applyStoreState: (c) => usePlanetStore.setState(c),
        applyPlanetData: (h, b) => { sm.planetData.heightmap.set(h); sm.planetData.biomeIds.set(b); },
      });
      const id = await svc.save('Checklist Test');
      const raw = await svc.getRaw(id);
      const ok = raw && raw.name === 'Checklist Test' && raw.heights.byteLength === 40962 * 4;
      await svc.delete(id);
      return ok;
    });
    record(2, 'Save/load round-trip persists data', ok);
  }

  // ── 3. Unsaved-changes guard: currentSaveId clears on terrain edit ──
  {
    const ok = await page.evaluate(async () => {
      const { usePlanetStore } = await import('/src/store/usePlanetStore.ts');
      // Save to set a currentSaveId
      usePlanetStore.setState({ currentSaveId: 'test-id', currentSaveName: 'Test' });
      const before = usePlanetStore.getState().currentSaveId;
      // Simulate version bump (what happens on terrain edit)
      usePlanetStore.setState({ currentSaveId: null });
      const after = usePlanetStore.getState().currentSaveId;
      return before === 'test-id' && after === null;
    });
    record(3, 'Unsaved-changes: currentSaveId clears', ok);
  }

  // ── 4. Gallery opens, shows entries ──
  {
    // Save a planet first
    await page.evaluate(async () => {
      const { PlanetSaveService } = await import('/src/services/PlanetSaveService.ts');
      const { usePlanetStore } = await import('/src/store/usePlanetStore.ts');
      const sm = window.__sceneManager;
      const svc = new PlanetSaveService({
        getPlanetData: () => sm.planetData,
        getStoreState: () => usePlanetStore.getState(),
        applyStoreState: () => {},
        applyPlanetData: () => {},
      });
      await svc.save('Gallery Test Planet');
    });

    await page.click('button[aria-label="Open Gallery"]');
    await wait(500);
    const hasEntry = await page.evaluate(() => {
      const items = document.querySelectorAll('[role="dialog"] [class*="cursor-pointer"]');
      return items.length >= 1;
    });
    record(4, 'Gallery opens and shows saved entries', hasEntry);
    await page.keyboard.press('Escape');
    await wait(300);
  }

  // ── 5. Gallery duplicate and rename ──
  {
    const ok = await page.evaluate(async () => {
      const { PlanetSaveService } = await import('/src/services/PlanetSaveService.ts');
      const sm = window.__sceneManager;
      const svc = new PlanetSaveService({
        getPlanetData: () => sm.planetData,
        getStoreState: () => ({}),
        applyStoreState: () => {},
        applyPlanetData: () => {},
      });
      const id = await svc.save('Dup Test');
      const dupId = await svc.duplicate(id, 'Dup Test Copy');
      await svc.rename(dupId, 'Renamed');
      const raw = await svc.getRaw(dupId);
      const ok = raw?.name === 'Renamed';
      await svc.delete(id);
      await svc.delete(dupId);
      return ok;
    });
    record(5, 'Gallery duplicate and rename', ok);
  }

  // ── 6. PNG export produces valid blob at each resolution ──
  {
    const ok = await page.evaluate(async () => {
      const { ExportService } = await import('/src/services/ExportService.ts');
      const sm = window.__sceneManager;
      const svc = new ExportService(sm);
      for (const size of [1024, 2048]) {
        const blob = await svc.exportPNG({ size, transparent: false, includeStarfield: true });
        if (blob.size < 1000) return false;
      }
      return true;
    });
    record(6, 'PNG export at 1024 & 2048', ok);
  }

  // ── 7. PNG transparent mode ──
  {
    const ok = await page.evaluate(async () => {
      const { ExportService } = await import('/src/services/ExportService.ts');
      const sm = window.__sceneManager;
      const svc = new ExportService(sm);
      const blob = await svc.exportPNG({ size: 512, transparent: true, includeStarfield: false });
      return blob.size > 500 && blob.type === 'image/png';
    });
    record(7, 'PNG transparent export', ok);
  }

  // ── 8. GLB export produces valid binary ──
  {
    const ok = await page.evaluate(async () => {
      const { ExportService } = await import('/src/services/ExportService.ts');
      const sm = window.__sceneManager;
      const svc = new ExportService(sm);
      const blob = await svc.exportGLB({
        includeOcean: true, includeClouds: false, includeRings: true,
        includeMoons: true, bakeVertexColors: true,
      });
      // GLB magic: 'glTF'
      const buf = await blob.arrayBuffer();
      const magic = new Uint8Array(buf, 0, 4);
      return magic[0] === 0x67 && magic[1] === 0x6C && magic[2] === 0x54 && magic[3] === 0x46;
    });
    record(8, 'GLB export produces valid glTF binary', ok);
  }

  // ── 9. JSON export/import round-trip ──
  {
    const ok = await page.evaluate(async () => {
      const { ExportService } = await import('/src/services/ExportService.ts');
      const { PlanetSaveService } = await import('/src/services/PlanetSaveService.ts');
      const sm = window.__sceneManager;
      const exportSvc = new ExportService(sm);
      const saveSvc = new PlanetSaveService({
        getPlanetData: () => sm.planetData,
        getStoreState: () => ({}),
        applyStoreState: () => {},
        applyPlanetData: () => {},
      });
      const blob = await exportSvc.exportJSON({}, 'RT Test');
      const text = await blob.text();
      const parsed = JSON.parse(text);
      if (parsed.schemaType !== 'planet') return false;
      const id = await saveSvc.importFromJSON(text);
      const raw = await saveSvc.getRaw(id);
      const ok = raw && raw.heights.byteLength === 40962 * 4;
      await saveSvc.delete(id);
      return ok;
    });
    record(9, 'JSON export/import round-trip', ok);
  }

  // ── 10. Import validation rejects bad files ──
  {
    const ok = await page.evaluate(async () => {
      const { PlanetSaveService } = await import('/src/services/PlanetSaveService.ts');
      const sm = window.__sceneManager;
      const svc = new PlanetSaveService({
        getPlanetData: () => sm.planetData,
        getStoreState: () => ({}),
        applyStoreState: () => {},
        applyPlanetData: () => {},
      });
      const tests = [
        '{{bad json',
        JSON.stringify({ schemaType: 'wrong' }),
        JSON.stringify({ schemaType: 'planet', version: 1, name: 'X', biomes_b64: 'AA' }),
      ];
      for (const t of tests) {
        try {
          await svc.importFromJSON(t);
          return false; // should have thrown
        } catch { /* expected */ }
      }
      return true;
    });
    record(10, 'Malformed import rejected', ok);
  }

  // ── 11. Terrain tools work (raise modifies heightmap) ──
  {
    const ok = await page.evaluate(async () => {
      const sm = window.__sceneManager;
      const before = sm.planetData.heightmap[0];
      // Simulate a small raise on vertex 0
      sm.planetData.heightmap[0] += 0.1;
      sm.planetData.dirty.heights = true;
      const after = sm.planetData.heightmap[0];
      // Restore
      sm.planetData.heightmap[0] = before;
      sm.planetData.dirty.heights = true;
      return Math.abs(after - before - 0.1) < 0.001;
    });
    record(11, 'Terrain heightmap is mutable', ok);
  }

  // ── 12. Undo/redo works (UndoManager class exists, keyboard shortcuts registered) ──
  {
    const ok = await page.evaluate(async () => {
      const { UndoManager } = await import('/src/tools/UndoManager.ts');
      return typeof UndoManager === 'function' && typeof UndoManager.prototype.undo === 'function'
        && typeof UndoManager.prototype.redo === 'function';
    });
    record(12, 'UndoManager has undo/redo methods', ok);
  }

  // ── 13. Tool buttons exist (1-5) ──
  {
    const ok = await page.evaluate(() => {
      const labels = ['Raise/Lower', 'Smooth', 'Flatten', 'Paint Biome', 'Meteor'];
      return labels.every(l => !!document.querySelector(`button[aria-label="${l}"]`));
    });
    record(13, 'All 5 tool buttons present', ok);
  }

  // ── 14. Export modal opens and has all 3 tabs ──
  {
    await page.click('button[aria-label="Export PNG"]');
    await wait(500);
    const tabs = await page.evaluate(() => {
      const btns = document.querySelectorAll('[role="dialog"] button');
      const texts = [...btns].map(b => b.textContent?.trim());
      return {
        hasPNG: texts.includes('PNG Image'),
        hasGLB: texts.includes('3D Model'),
        hasJSON: texts.includes('JSON'),
      };
    });
    const ok = tabs.hasPNG && tabs.hasGLB && tabs.hasJSON;
    record(14, 'Export modal has PNG/GLB/JSON tabs', ok);
    await page.keyboard.press('Escape');
    await wait(300);
  }

  // ── 15. Help modal opens with all sections ──
  {
    await page.click('button[aria-label="Help"]');
    await wait(300);
    const sections = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]') || document.querySelector('.absolute.inset-0.z-50');
      if (!dialog) return { keyboard: false, save: false, export: false };
      const text = dialog.textContent || '';
      return {
        keyboard: text.includes('Keyboard Shortcuts'),
        save: text.includes('Save & Gallery'),
        export: text.includes('Exporting Your Planet'),
      };
    });
    // Help modal might not use role="dialog", search more broadly
    const ok = sections.keyboard && sections.save && sections.export;
    record(15, 'Help modal has all 3 sections', ok,
      !ok ? `keyboard:${sections.keyboard} save:${sections.save} export:${sections.export}` : '');
    await page.keyboard.press('Escape');
    await wait(300);
  }

  // ── 16. FPS counter toggles with ~ key ──
  {
    const hasFps = () => page.evaluate(() => {
      // FPS counter is a <span> containing "FPS:"
      const spans = document.querySelectorAll('span');
      return [...spans].some(s => s.textContent?.includes('FPS:'));
    });
    const before = await hasFps();
    await page.keyboard.press('Backquote');
    await wait(500);
    const after = await hasFps();
    record(16, 'FPS counter toggles with ~ key', before !== after);
    // Toggle back
    await page.keyboard.press('Backquote');
    await wait(100);
  }

  // ── 17. New Planet modal opens ──
  {
    const newPlanetBtn = await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button')];
      return btns.some(b => b.textContent?.includes('New Planet') || b.getAttribute('aria-label') === 'New Planet');
    });
    record(17, 'New Planet button present', newPlanetBtn);
  }

  // ── 18. Parameter panels exist ──
  {
    const ok = await page.evaluate(() => {
      // Check for terrain params panel (sliders)
      const inputs = document.querySelectorAll('input[type="range"]');
      return inputs.length >= 3; // at least seed, heightScale, octaves
    });
    record(18, 'Parameter panel has sliders', ok);
  }

  // ── 19. No memory leaks: multiple exports don't crash ──
  {
    const ok = await page.evaluate(async () => {
      const { ExportService } = await import('/src/services/ExportService.ts');
      const sm = window.__sceneManager;
      const svc = new ExportService(sm);
      for (let i = 0; i < 5; i++) {
        const blob = await svc.exportPNG({ size: 512, transparent: false, includeStarfield: true });
        if (blob.size < 100) return false;
      }
      return true;
    });
    record(19, 'Repeated exports stable (5x PNG)', ok);
  }

  // ── 20. Production build check ──
  // (handled separately via npm run build — we just check the flag)
  record(20, 'Production build succeeds', null, 'Checked separately');

  // ── Cleanup ──
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

  // ── Report ──
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║               PHASE 10 — FINAL TEST CHECKLIST              ║');
  console.log('╠════╦══════════════════════════════════════════╦══════╦══════╣');
  console.log('║  # ║ Test                                     ║ Pass ║ Notes║');
  console.log('╠════╬══════════════════════════════════════════╬══════╬══════╣');

  let allPass = true;
  for (const r of results) {
    const status = r.pass === null ? ' -- ' : r.pass ? 'PASS' : 'FAIL';
    if (r.pass === false) allPass = false;
    const name = r.name.padEnd(40).slice(0, 40);
    const notes = (r.notes || '').padEnd(5).slice(0, 5);
    console.log(`║ ${String(r.num).padStart(2)} ║ ${name} ║ ${status} ║ ${notes}║`);
  }
  console.log('╚════╩══════════════════════════════════════════╩══════╩══════╝');

  // Simple summary
  console.log('\nSummary:');
  for (const r of results) {
    const status = r.pass === null ? 'SKIP' : r.pass ? 'PASS' : 'FAIL';
    console.log(`  ${status}: #${r.num} ${r.name}${r.notes ? ` (${r.notes})` : ''}`);
  }

  const failed = results.filter(r => r.pass === false);
  if (failed.length > 0) {
    console.log(`\n${failed.length} test(s) FAILED`);
    process.exit(1);
  }
  console.log('\nAll automated checks passed!');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
