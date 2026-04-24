#!/usr/bin/env node
/**
 * End-to-end GLB export test.
 * 1. Exports a GLB via ExportService API in the browser
 * 2. Writes the raw GLB to disk
 * 3. Parses the GLB and validates structure
 *
 * Requires dev server running on localhost:5199.
 */
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const URL = 'http://localhost:5199';
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const OUT_DIR = path.resolve('test-exports');

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR);

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

  // ── Test 1: Export GLB with all options ───────────────────

  console.log('\n1. Exporting GLB with terrain + vertex colors + moons...');
  const glbBase64 = await page.evaluate(async () => {
    const { ExportService } = await import('/src/services/ExportService.ts');
    const sm = window.__sceneManager;
    const svc = new ExportService(sm);

    const start = performance.now();
    const blob = await svc.exportGLB({
      includeOcean: true,
      includeClouds: false,
      includeRings: false,
      includeMoons: true,
      bakeVertexColors: true,
    });
    const ms = (performance.now() - start).toFixed(0);
    console.log(`GLB export took ${ms}ms, size: ${(blob.size / 1024).toFixed(1)} KB`);

    // Convert to base64 for transfer to Node
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  });

  // Write GLB to disk
  const glbBuffer = Buffer.from(glbBase64, 'base64');
  const glbPath = path.join(OUT_DIR, 'test-planet.glb');
  fs.writeFileSync(glbPath, glbBuffer);
  console.log(`  Written to ${glbPath} (${(glbBuffer.length / 1024).toFixed(1)} KB)`);

  // ── Test 2: Parse and validate GLB structure ─────────────

  console.log('\n2. Validating GLB structure...');
  validateGLB(glbBuffer);

  // ── Test 3: Export without vertex colors ──────────────────

  console.log('\n3. Exporting GLB without vertex colors...');
  const glbNoColorBase64 = await page.evaluate(async () => {
    const { ExportService } = await import('/src/services/ExportService.ts');
    const sm = window.__sceneManager;
    const svc = new ExportService(sm);
    const blob = await svc.exportGLB({ bakeVertexColors: false, includeMoons: false });
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  });

  const noColorBuffer = Buffer.from(glbNoColorBase64, 'base64');
  console.log(`  Size without colors: ${(noColorBuffer.length / 1024).toFixed(1)} KB`);

  // Should be smaller without vertex colors
  if (noColorBuffer.length >= glbBuffer.length) {
    console.log('  WARNING: Expected smaller file without vertex colors');
  } else {
    console.log(`  ${((1 - noColorBuffer.length / glbBuffer.length) * 100).toFixed(0)}% smaller without colors`);
  }

  // ── Test 4: UI flow ───────────────────────────────────────

  console.log('\n4. Testing Export modal GLB tab...');
  await page.click('button[aria-label="Export PNG"]');
  await wait(500);

  // Switch to 3D Model tab
  const switched = await page.evaluate(() => {
    const btns = document.querySelectorAll('[role="dialog"] button');
    for (const btn of btns) {
      if (btn.textContent?.trim() === '3D Model') {
        (btn).click();
        return true;
      }
    }
    return false;
  });
  if (!switched) throw new Error('Could not find 3D Model tab');
  await wait(300);

  // Verify warning is shown
  const hasWarning = await page.evaluate(() => {
    return !!document.querySelector('[role="dialog"] p')?.textContent?.includes('shader-only');
  });
  if (!hasWarning) throw new Error('Shader warning not shown');
  console.log('  Shader-effects warning shown');

  // Verify checkboxes are present
  const checkboxCount = await page.evaluate(() => {
    return document.querySelectorAll('[role="dialog"] input[type="checkbox"]').length;
  });
  if (checkboxCount < 5) throw new Error(`Expected 5 checkboxes, got ${checkboxCount}`);
  console.log(`  ${checkboxCount} option checkboxes present`);

  // Verify Export GLB button exists
  const hasGLBButton = await page.evaluate(() => {
    const btns = document.querySelectorAll('[role="dialog"] button');
    return [...btns].some(b => b.textContent?.trim() === 'Export GLB');
  });
  if (!hasGLBButton) throw new Error('Export GLB button not found');
  console.log('  Export GLB button present');

  // Close
  await page.keyboard.press('Escape');
  await wait(300);

  await browser.close();

  // Cleanup
  fs.rmSync(OUT_DIR, { recursive: true });

  const fatalErrors = errors.filter(e => !e.includes('THREE.Clock') && !e.includes('favicon'));
  if (fatalErrors.length > 0) {
    console.error('\nFatal page errors:', fatalErrors);
    process.exit(1);
  }

  console.log('\nALL GLB EXPORT TESTS PASSED');
  process.exit(0);
}

/**
 * Parse and validate a GLB binary buffer.
 * GLB format: https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#binary-gltf-layout
 */
function validateGLB(buffer) {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

  // Header
  const magic = view.getUint32(0, true);
  if (magic !== 0x46546C67) throw new Error('Invalid GLB magic');
  console.log('  GLB magic: valid');

  const version = view.getUint32(4, true);
  if (version !== 2) throw new Error(`GLB version ${version}, expected 2`);
  console.log('  GLB version: 2');

  const length = view.getUint32(8, true);
  console.log(`  GLB total length: ${length} bytes`);

  // First chunk should be JSON
  const chunk0Length = view.getUint32(12, true);
  const chunk0Type = view.getUint32(16, true);
  if (chunk0Type !== 0x4E4F534A) throw new Error('First chunk is not JSON');

  const jsonBytes = buffer.subarray(20, 20 + chunk0Length);
  const json = JSON.parse(new TextDecoder().decode(jsonBytes));

  // Validate meshes
  const meshCount = json.meshes?.length ?? 0;
  console.log(`  Meshes: ${meshCount}`);
  if (meshCount < 1) throw new Error('No meshes in GLB');

  // Validate nodes
  const nodeNames = (json.nodes ?? []).map(n => n.name).filter(Boolean);
  console.log(`  Nodes: ${nodeNames.join(', ')}`);

  // Check for terrain mesh with vertex colors
  let hasColorAttribute = false;
  let terrainVertexCount = 0;
  for (const mesh of json.meshes) {
    for (const prim of mesh.primitives) {
      if (prim.attributes.COLOR_0 !== undefined) {
        hasColorAttribute = true;
      }
      if (prim.attributes.POSITION !== undefined) {
        const accessor = json.accessors[prim.attributes.POSITION];
        if (accessor.count > terrainVertexCount) {
          terrainVertexCount = accessor.count;
        }
      }
    }
  }

  console.log(`  Has vertex colors: ${hasColorAttribute}`);
  if (!hasColorAttribute) throw new Error('No mesh with vertex colors (COLOR_0)');

  console.log(`  Max vertex count: ${terrainVertexCount}`);
  if (terrainVertexCount < 40000) {
    throw new Error(`Terrain vertex count ${terrainVertexCount} < 40000 (expected icosphere-6)`);
  }

  // Validate normals exist
  let hasNormals = false;
  for (const mesh of json.meshes) {
    for (const prim of mesh.primitives) {
      if (prim.attributes.NORMAL !== undefined) {
        hasNormals = true;
        break;
      }
    }
  }
  console.log(`  Has normals: ${hasNormals}`);
  if (!hasNormals) throw new Error('No mesh with normals');

  // Check that "Terrain" node exists
  const hasTerrain = nodeNames.includes('Terrain');
  console.log(`  Has "Terrain" node: ${hasTerrain}`);
  if (!hasTerrain) throw new Error('Missing "Terrain" node');

  console.log('  GLB validation: PASSED');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
