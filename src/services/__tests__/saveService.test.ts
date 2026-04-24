/**
 * Scratch test harness for PlanetSaveService.
 * Proves byte-identical round-trip of heights/biomes ArrayBuffers
 * and deep equality of config.
 *
 * Run in browser console via:
 *   import('@/services/__tests__/saveService.test').then(m => m.runTests())
 *
 * Or invoke from a dev-only UI button.
 */
import {
  PlanetSaveService,
  PlanetSaveServiceDeps,
  PlanetSaveConfig,
  CURRENT_SAVE_VERSION,
  SCHEMA_TYPE,
  SAVED_CONFIG_KEYS,
} from '../PlanetSaveService';
import { DEFAULT_TERRAIN_PARAMS } from '@/planet/TerrainGenerator';
import { DEFAULT_BIOMES } from '@/store/usePlanetStore';

// ---------------------------------------------------------------------------
// Test utilities
// ---------------------------------------------------------------------------

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${msg}`);
}

function arraysEqual(a: ArrayBuffer, b: ArrayBuffer): boolean {
  const va = new Uint8Array(a);
  const vb = new Uint8Array(b);
  if (va.length !== vb.length) return false;
  for (let i = 0; i < va.length; i++) {
    if (va[i] !== vb[i]) return false;
  }
  return true;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object') return false;

  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;
  const keysA = Object.keys(aObj);
  const keysB = Object.keys(bObj);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!deepEqual(aObj[key], bObj[key])) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Mock deps
// ---------------------------------------------------------------------------

function createMockDeps(extraStoreKeys?: Record<string, unknown>) {
  const VERTEX_COUNT = 1024; // small for testing

  // Generate deterministic test data
  const heightmap = new Float32Array(VERTEX_COUNT);
  const biomeIds = new Uint8Array(VERTEX_COUNT);
  for (let i = 0; i < VERTEX_COUNT; i++) {
    heightmap[i] = Math.sin(i * 0.1) * 0.5;
    biomeIds[i] = i % 8;
  }

  const config: PlanetSaveConfig = {
    terrainParams: { ...DEFAULT_TERRAIN_PARAMS, seed: 'test-seed-42', heightScale: 0.25 },
    starParams: {
      color: { r: 1, g: 0.9, b: 0.8 },
      intensity: 2.0,
      sunAzimuth: 1.2,
      sunElevation: 0.4,
    },
    atmosphereParams: {
      color: { r: 0.3, g: 0.6, b: 1.0 },
      intensity: 1.2,
      visible: true,
    },
    oceanParams: {
      enabled: true,
      seaLevel: 0.0,
      colorShallow: { r: 0.2, g: 0.5, b: 0.8 },
      colorDeep: { r: 0.05, g: 0.15, b: 0.4 },
      waveSpeed: 0.1,
      waveAmplitude: 0.003,
    },
    cloudParams: {
      enabled: true,
      density: 0.5,
      rotationSpeed: 0.02,
      altitude: 0.02,
      color: { r: 1, g: 1, b: 1 },
    },
    ringParams: {
      enabled: false,
      innerRadius: 1.3,
      outerRadius: 2.0,
      tilt: 0.3,
      color: { r: 0.8, g: 0.7, b: 0.5 },
      opacity: 0.8,
    },
    moons: [
      { id: 'moon_1', seed: 42, size: 0.15, orbitRadius: 2.5, orbitSpeed: 0.3, orbitTilt: 0.2, phase: 1.5 },
    ],
    dayNightParams: { enabled: false, speed: 0.1 },
    erosionParams: {
      iterations: 30000,
      sedimentCapacity: 4.0,
      depositionRate: 0.3,
      evaporationRate: 0.01,
      inertia: 0.05,
    },
    biomes: [...DEFAULT_BIOMES],
  };

  let loadedConfig: PlanetSaveConfig | null = null;
  let loadedHeights: Float32Array | null = null;
  let loadedBiomes: Uint8Array | null = null;

  const deps: PlanetSaveServiceDeps = {
    getPlanetData: () => ({ heightmap, biomeIds }),
    getStoreState: () => ({ ...config, ...extraStoreKeys } as Record<string, unknown>),
    applyStoreState: (c) => { loadedConfig = c; },
    applyPlanetData: (h, b) => { loadedHeights = h; loadedBiomes = b; },
  };

  return { deps, heightmap, biomeIds, config, getLoaded: () => ({ loadedConfig, loadedHeights, loadedBiomes }) };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

async function testRoundTrip() {
  const { deps, heightmap, biomeIds, config, getLoaded } = createMockDeps();
  const svc = new PlanetSaveService(deps);

  // Save
  const id = await svc.save('Test Planet');
  assert(typeof id === 'string' && id.length > 0, 'save should return a non-empty id');

  // Verify raw envelope
  const raw = await svc.getRaw(id);
  assert(raw !== undefined, 'getRaw should return the envelope');
  assert(raw!.schemaType === SCHEMA_TYPE, `schemaType should be "${SCHEMA_TYPE}"`);
  assert(raw!.version === CURRENT_SAVE_VERSION, `version should be ${CURRENT_SAVE_VERSION}`);
  assert(raw!.name === 'Test Planet', 'name should match');
  assert(raw!.thumbnail === null, 'thumbnail should be null');

  // Verify heights buffer is a copy (not the same reference)
  assert(raw!.heights !== heightmap.buffer, 'heights should be a copy, not same buffer');
  assert(arraysEqual(raw!.heights, heightmap.buffer as ArrayBuffer), 'heights should be byte-identical');
  assert(arraysEqual(raw!.biomes, biomeIds.buffer as ArrayBuffer), 'biomes should be byte-identical');

  // Load
  await svc.load(id);
  const { loadedConfig, loadedHeights, loadedBiomes } = getLoaded();
  assert(loadedConfig !== null, 'applyStoreState should have been called');
  assert(loadedHeights !== null, 'applyPlanetData should have been called');
  assert(loadedBiomes !== null, 'applyPlanetData should have been called');

  // Verify config deep equality
  assert(deepEqual(loadedConfig, config), 'loaded config should deep-equal original config');

  // Verify byte-identical heights
  assert(loadedHeights!.length === heightmap.length, 'heights length should match');
  assert(arraysEqual(loadedHeights!.buffer as ArrayBuffer, heightmap.buffer as ArrayBuffer), 'loaded heights should be byte-identical');

  // Verify byte-identical biomes
  assert(loadedBiomes!.length === biomeIds.length, 'biomes length should match');
  assert(arraysEqual(loadedBiomes!.buffer as ArrayBuffer, biomeIds.buffer as ArrayBuffer), 'loaded biomes should be byte-identical');

  // Cleanup
  await svc.delete(id);

  console.log('  PASS: round-trip');
}

async function testUnknownKeysDroppedOnSave() {
  // Store state has ephemeral keys that should NOT appear in the saved config
  const { deps } = createMockDeps({
    eroding: true,
    erosionProgress: 42,
    toolState: { activeTool: 'raise', brushRadius: 0.15, brushStrength: 0.02, brushFalloff: 0.5 },
    isLoading: true,
    selectedBiomeId: 3,
    _futureEphemeral: 'should be ignored',
  });
  const svc = new PlanetSaveService(deps);

  const id = await svc.save('Ephemeral Test');
  const raw = await svc.getRaw(id);
  const configKeys = Object.keys(raw!.config);

  // Config should contain exactly the allowlisted keys
  for (const key of SAVED_CONFIG_KEYS) {
    assert(configKeys.includes(key), `config should include allowlisted key "${key}"`);
  }
  // Ephemeral keys should NOT be present
  assert(!configKeys.includes('eroding'), 'config should not include "eroding"');
  assert(!configKeys.includes('erosionProgress'), 'config should not include "erosionProgress"');
  assert(!configKeys.includes('toolState'), 'config should not include "toolState"');
  assert(!configKeys.includes('isLoading'), 'config should not include "isLoading"');
  assert(!configKeys.includes('selectedBiomeId'), 'config should not include "selectedBiomeId"');
  assert(!configKeys.includes('_futureEphemeral'), 'config should not include unknown future keys');
  assert(configKeys.length === SAVED_CONFIG_KEYS.length, `config should have exactly ${SAVED_CONFIG_KEYS.length} keys, got ${configKeys.length}`);

  await svc.delete(id);
  console.log('  PASS: unknown keys dropped on save');
}

async function testMalformedSchemaTypeRejectsLoad() {
  const { deps } = createMockDeps();
  const svc = new PlanetSaveService(deps);

  // Save a valid record
  const id = await svc.save('Valid Planet');

  // Tamper with the raw record directly in IDB
  const { openDB } = await import('idb');
  const db = await openDB('stellaforge', 1);
  const envelope = await db.get('planets', id);
  (envelope as Record<string, unknown>).schemaType = 'spaceship';
  await db.put('planets', envelope);
  db.close();

  // load() should reject with a clear error
  let error: Error | null = null;
  try {
    await svc.load(id);
  } catch (e) {
    error = e as Error;
  }
  assert(error !== null, 'load should throw for wrong schemaType');
  assert(error!.message.includes('schemaType'), `error should mention schemaType, got: "${error!.message}"`);
  assert(error!.message.includes('spaceship'), `error should mention the bad value, got: "${error!.message}"`);

  await svc.delete(id);
  console.log('  PASS: malformed schemaType rejects load');
}

async function testList() {
  const { deps } = createMockDeps();
  const svc = new PlanetSaveService(deps);

  const id1 = await svc.save('Planet A');
  // Small delay so updatedAt differs
  await new Promise((r) => setTimeout(r, 10));
  const id2 = await svc.save('Planet B');

  const list = await svc.list();
  assert(list.length >= 2, 'list should contain at least 2 entries');
  // Newest first
  assert(list[0].name === 'Planet B', 'newest should be first');
  assert(list[1].name === 'Planet A', 'oldest should be second');

  // Entries should not contain heavy data
  const entry = list[0] as unknown as Record<string, unknown>;
  assert(!('heights' in entry), 'list entries should not contain heights');
  assert(!('biomes' in entry), 'list entries should not contain biomes');
  assert(!('config' in entry), 'list entries should not contain config');

  await svc.delete(id1);
  await svc.delete(id2);

  console.log('  PASS: list');
}

async function testRename() {
  const { deps } = createMockDeps();
  const svc = new PlanetSaveService(deps);

  const id = await svc.save('Original Name');
  await svc.rename(id, 'New Name');

  const raw = await svc.getRaw(id);
  assert(raw!.name === 'New Name', 'name should be updated');

  await svc.delete(id);
  console.log('  PASS: rename');
}

async function testDuplicate() {
  const { deps } = createMockDeps();
  const svc = new PlanetSaveService(deps);

  const id = await svc.save('Original');
  const dupId = await svc.duplicate(id, 'Copy of Original');

  assert(dupId !== id, 'duplicate should have a new id');
  const original = await svc.getRaw(id);
  const copy = await svc.getRaw(dupId);
  assert(copy!.name === 'Copy of Original', 'copy name should match');
  assert(arraysEqual(original!.heights, copy!.heights), 'copy heights should be byte-identical');
  assert(arraysEqual(original!.biomes, copy!.biomes), 'copy biomes should be byte-identical');
  // But different buffer references (independent copy)
  assert(original!.heights !== copy!.heights, 'copy should have independent buffer');

  await svc.delete(id);
  await svc.delete(dupId);
  console.log('  PASS: duplicate');
}

async function testOverwrite() {
  const { deps } = createMockDeps();
  const svc = new PlanetSaveService(deps);

  const id = await svc.save('Planet');
  const raw1 = await svc.getRaw(id);
  const createdAt = raw1!.createdAt;

  await new Promise((r) => setTimeout(r, 10));
  await svc.save('Planet Updated', id);

  const raw2 = await svc.getRaw(id);
  assert(raw2!.name === 'Planet Updated', 'name should be updated');
  assert(raw2!.createdAt === createdAt, 'createdAt should be preserved on overwrite');
  assert(raw2!.updatedAt > raw1!.updatedAt, 'updatedAt should advance');

  await svc.delete(id);
  console.log('  PASS: overwrite');
}

async function testDeleteNonExistent() {
  const { deps } = createMockDeps();
  const svc = new PlanetSaveService(deps);

  // Should not throw
  await svc.delete('nonexistent-id');
  console.log('  PASS: delete non-existent');
}

async function testLoadNonExistent() {
  const { deps } = createMockDeps();
  const svc = new PlanetSaveService(deps);

  let threw = false;
  try {
    await svc.load('nonexistent-id');
  } catch {
    threw = true;
  }
  assert(threw, 'load non-existent should throw');
  console.log('  PASS: load non-existent throws');
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

export async function runTests() {
  console.log('PlanetSaveService tests:');
  try {
    await testRoundTrip();
    await testUnknownKeysDroppedOnSave();
    await testMalformedSchemaTypeRejectsLoad();
    await testList();
    await testRename();
    await testDuplicate();
    await testOverwrite();
    await testDeleteNonExistent();
    await testLoadNonExistent();
    console.log('ALL TESTS PASSED');
  } catch (e) {
    console.error('TEST FAILED:', e);
    throw e;
  }
}
