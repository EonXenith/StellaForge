import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { ThumbnailService } from './ThumbnailService';
import {
  base64ToArrayBuffer,
  base64DataUrlToBlob,
} from './ExportService';
import type { StellaForgeJSON } from './ExportService';
import type { TerrainParams } from '@/planet/TerrainGenerator';
import type {
  BiomeDefinition,
  StarParams,
  AtmosphereParams,
  OceanParams,
  CloudParams,
  RingParams,
  MoonConfig,
  DayNightParams,
  ErosionParams,
} from '@/store/usePlanetStore';

// ---------------------------------------------------------------------------
// Schema versioning
// ---------------------------------------------------------------------------
//
// Save format overview:
//   Each planet is stored as a PlanetSaveEnvelope in the "planets" object store
//   of the "stellaforge" IndexedDB database (version 1).
//
// Versioning rules:
//   - CURRENT_SAVE_VERSION is the latest schema version written by the app.
//   - Every envelope carries a `version` field stamped at save time.
//   - On load/import, envelopes are run through the migration pipeline:
//     version 1 → migrations[1] → version 2 → migrations[2] → ... → current.
//   - If a migration is missing, load throws rather than silently dropping data.
//
// Adding a persisted config key:
//   1. Add the key to SAVED_CONFIG_KEYS and PlanetSaveConfig.
//   2. Bump CURRENT_SAVE_VERSION.
//   3. Write a migration that sets a sensible default for the new key
//      so older saves remain loadable.
//
// JSON portability:
//   The JSON export format (StellaForgeJSON in ExportService.ts) mirrors
//   the envelope but encodes ArrayBuffers as base64 strings and the
//   thumbnail as a base64 data-URL. On import, buffers are decoded and
//   validated (40962×4 bytes for heights, 40962 bytes for biomes).
// ---------------------------------------------------------------------------

export const CURRENT_SAVE_VERSION = 1;

/** Discriminator for save record types. Future-proofs for other save types. */
export const SCHEMA_TYPE = 'planet' as const;

/**
 * Migration functions keyed by the version they migrate FROM.
 * e.g. migrations[1] converts a v1 save to v2.
 */
const migrations: Record<number, (data: unknown) => unknown> = {
  // No migrations yet — v1 is the initial version.
};

function migrate(envelope: PlanetSaveEnvelope): PlanetSaveEnvelope {
  let data: unknown = envelope;
  let v = (data as { version: number }).version;
  while (v < CURRENT_SAVE_VERSION) {
    const fn = migrations[v];
    if (!fn) throw new Error(`No migration from save version ${v}`);
    data = fn(data);
    v = (data as { version: number }).version;
  }
  return data as PlanetSaveEnvelope;
}

// ---------------------------------------------------------------------------
// Config allowlist
// ---------------------------------------------------------------------------

/**
 * Explicit list of store keys persisted in saves.
 * Only these keys are extracted on save() and applied on load().
 *
 * Adding a key here is a schema change — bump CURRENT_SAVE_VERSION
 * and write a migration so older saves gain a sensible default.
 */
export const SAVED_CONFIG_KEYS = [
  'terrainParams',
  'starParams',
  'atmosphereParams',
  'oceanParams',
  'cloudParams',
  'ringParams',
  'moons',
  'dayNightParams',
  'erosionParams',
  'biomes',
] as const;

export type SavedConfigKey = (typeof SAVED_CONFIG_KEYS)[number];

// ---------------------------------------------------------------------------
// Save envelope
// ---------------------------------------------------------------------------

export interface PlanetSaveConfig {
  terrainParams: TerrainParams;
  starParams: StarParams;
  atmosphereParams: AtmosphereParams;
  oceanParams: OceanParams;
  cloudParams: CloudParams;
  ringParams: RingParams;
  moons: MoonConfig[];
  dayNightParams: DayNightParams;
  erosionParams: ErosionParams;
  biomes: BiomeDefinition[];
}

export interface PlanetSaveEnvelope {
  schemaType: typeof SCHEMA_TYPE;
  version: number;
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  thumbnail: Blob | null;
  config: PlanetSaveConfig;
  heights: ArrayBuffer;
  biomes: ArrayBuffer;
}

/** Lightweight listing entry (no heavy buffers). */
export interface PlanetSaveListEntry {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  thumbnail: Blob | null;
}

// ---------------------------------------------------------------------------
// IndexedDB schema
// ---------------------------------------------------------------------------

interface StellaForgeDB extends DBSchema {
  planets: {
    key: string;
    value: PlanetSaveEnvelope;
    indexes: { 'by-updated': number };
  };
}

const DB_NAME = 'stellaforge';
const DB_VERSION = 1;

function getDB(): Promise<IDBPDatabase<StellaForgeDB>> {
  return openDB<StellaForgeDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const store = db.createObjectStore('planets', { keyPath: 'id' });
      store.createIndex('by-updated', 'updatedAt');
    },
  });
}

// ---------------------------------------------------------------------------
// Constructor injection deps
// ---------------------------------------------------------------------------

export interface PlanetSaveServiceDeps {
  getPlanetData: () => { heightmap: Float32Array; biomeIds: Uint8Array };
  getStoreState: () => Record<string, unknown>;
  applyStoreState: (config: PlanetSaveConfig) => void;
  applyPlanetData: (heights: Float32Array, biomes: Uint8Array) => void;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class PlanetSaveService {
  private deps: PlanetSaveServiceDeps;
  private thumbnailService: ThumbnailService | null = null;

  constructor(deps: PlanetSaveServiceDeps) {
    this.deps = deps;
  }

  /** Attach a thumbnail service. If unset, saves store thumbnail as null. */
  setThumbnailService(svc: ThumbnailService | null) {
    this.thumbnailService = svc;
  }

  /**
   * Extract only the allowlisted config keys from the full store state.
   * Any ephemeral UI state (toolState, eroding, etc.) is excluded.
   */
  private extractConfig(state: Record<string, unknown>): PlanetSaveConfig {
    const config = {} as Record<string, unknown>;
    for (const key of SAVED_CONFIG_KEYS) {
      config[key] = state[key];
    }
    return config as unknown as PlanetSaveConfig;
  }

  /**
   * Save the current planet state to IndexedDB.
   * If `id` is provided, overwrites that save. Otherwise creates a new one.
   */
  async save(name: string, id?: string, thumbnail?: Blob | null): Promise<string> {
    const planetData = this.deps.getPlanetData();
    const storeState = this.deps.getStoreState();
    const config = this.extractConfig(storeState);

    // Auto-capture thumbnail if not explicitly provided and service is available
    let thumb = thumbnail ?? null;
    if (thumb === null && this.thumbnailService) {
      try {
        thumb = await this.thumbnailService.capture();
      } catch {
        // Capture failed (e.g. context lost) — save without thumbnail
        thumb = null;
      }
    }

    const now = Date.now();
    const saveId = id ?? crypto.randomUUID();

    const envelope: PlanetSaveEnvelope = {
      schemaType: SCHEMA_TYPE,
      version: CURRENT_SAVE_VERSION,
      id: saveId,
      name,
      createdAt: id ? (await this.getMeta(saveId))?.createdAt ?? now : now,
      updatedAt: now,
      thumbnail: thumb,
      config,
      heights: (planetData.heightmap.buffer as ArrayBuffer).slice(0),
      biomes: (planetData.biomeIds.buffer as ArrayBuffer).slice(0),
    };

    const db = await getDB();
    await db.put('planets', envelope);
    return saveId;
  }

  /** Load a saved planet by ID. Applies state + data via injected deps. */
  async load(id: string): Promise<void> {
    const db = await getDB();
    const envelope = await db.get('planets', id);
    if (!envelope) throw new Error(`Save not found: ${id}`);

    // Validate schemaType discriminator
    if (envelope.schemaType !== SCHEMA_TYPE) {
      throw new Error(
        `Invalid save record: expected schemaType "${SCHEMA_TYPE}", got "${(envelope as unknown as Record<string, unknown>).schemaType}"`
      );
    }

    const migrated = migrate(envelope);

    // Apply only allowlisted config keys
    const safeConfig = {} as Record<string, unknown>;
    for (const key of SAVED_CONFIG_KEYS) {
      safeConfig[key] = (migrated.config as unknown as Record<string, unknown>)[key];
    }

    this.deps.applyStoreState(safeConfig as unknown as PlanetSaveConfig);
    this.deps.applyPlanetData(
      new Float32Array(migrated.heights),
      new Uint8Array(migrated.biomes),
    );
  }

  /** List all saves, sorted by most recently updated. */
  async list(): Promise<PlanetSaveListEntry[]> {
    const db = await getDB();
    const all = await db.getAllFromIndex('planets', 'by-updated');
    // Reverse so newest first
    return all.reverse().map((e) => ({
      id: e.id,
      name: e.name,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
      thumbnail: e.thumbnail,
    }));
  }

  /** Delete a save by ID. */
  async delete(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('planets', id);
  }

  /** Rename a save. */
  async rename(id: string, newName: string): Promise<void> {
    const db = await getDB();
    const envelope = await db.get('planets', id);
    if (!envelope) throw new Error(`Save not found: ${id}`);
    envelope.name = newName;
    envelope.updatedAt = Date.now();
    await db.put('planets', envelope);
  }

  /** Duplicate a save with a new ID and name. */
  async duplicate(id: string, newName: string): Promise<string> {
    const db = await getDB();
    const envelope = await db.get('planets', id);
    if (!envelope) throw new Error(`Save not found: ${id}`);

    const now = Date.now();
    const newId = crypto.randomUUID();
    const copy: PlanetSaveEnvelope = {
      ...envelope,
      id: newId,
      name: newName,
      createdAt: now,
      updatedAt: now,
      heights: envelope.heights.slice(0),
      biomes: envelope.biomes.slice(0),
    };

    await db.put('planets', copy);
    return newId;
  }

  /** Get a raw envelope (for testing / export). */
  async getRaw(id: string): Promise<PlanetSaveEnvelope | undefined> {
    const db = await getDB();
    return db.get('planets', id);
  }

  // ── JSON Import ────────────────────────────────────────────

  /** Maximum allowed file size for import (10MB). */
  static readonly MAX_IMPORT_SIZE = 10 * 1024 * 1024;

  /**
   * Import a planet from a .stellaforge.json file.
   *
   * Validates structure, decodes base64 buffers, assigns a new UUID,
   * deduplicates name, and writes to IndexedDB.
   *
   * @returns The new save ID.
   */
  async importFromJSON(input: Blob | string): Promise<string> {
    // Size check
    const raw = typeof input === 'string' ? input : await input.text();
    if (raw.length > PlanetSaveService.MAX_IMPORT_SIZE) {
      throw new Error('File too large (max 10MB)');
    }

    // Parse JSON
    let data: StellaForgeJSON;
    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error('Not a valid JSON file');
    }

    // Validate schemaType
    if (!data || typeof data !== 'object') {
      throw new Error('Not a valid StellaForge file');
    }
    if (data.schemaType !== SCHEMA_TYPE) {
      throw new Error(
        `Not a valid StellaForge file (expected schemaType "${SCHEMA_TYPE}", got "${data.schemaType ?? 'undefined'}")`,
      );
    }

    // Validate version
    if (typeof data.version !== 'number' || data.version < 1) {
      throw new Error('Not a valid StellaForge file (missing version)');
    }
    if (data.version > CURRENT_SAVE_VERSION) {
      throw new Error(
        `Unsupported version: ${data.version}. Please update StellaForge.`,
      );
    }

    // Validate required fields
    if (!data.name || typeof data.name !== 'string') {
      throw new Error('Not a valid StellaForge file (missing name)');
    }
    if (!data.heights_b64 || typeof data.heights_b64 !== 'string') {
      throw new Error('Not a valid StellaForge file (missing height data)');
    }
    if (!data.biomes_b64 || typeof data.biomes_b64 !== 'string') {
      throw new Error('Not a valid StellaForge file (missing biome data)');
    }

    // Decode buffers
    let heightsBuffer: ArrayBuffer;
    let biomesBuffer: ArrayBuffer;
    try {
      heightsBuffer = base64ToArrayBuffer(data.heights_b64);
      biomesBuffer = base64ToArrayBuffer(data.biomes_b64);
    } catch {
      throw new Error('Not a valid StellaForge file (corrupt buffer data)');
    }

    // Validate buffer sizes (icosphere-6 = 40962 vertices)
    const expectedHeightBytes = 40962 * 4; // Float32
    const expectedBiomeBytes = 40962;      // Uint8
    if (heightsBuffer.byteLength !== expectedHeightBytes) {
      throw new Error(
        `Corrupt file: height data is ${heightsBuffer.byteLength} bytes, expected ${expectedHeightBytes}`,
      );
    }
    if (biomesBuffer.byteLength !== expectedBiomeBytes) {
      throw new Error(
        `Corrupt file: biome data is ${biomesBuffer.byteLength} bytes, expected ${expectedBiomeBytes}`,
      );
    }

    // Decode thumbnail
    let thumbnail: Blob | null = null;
    if (data.thumbnail_b64 && typeof data.thumbnail_b64 === 'string') {
      try {
        thumbnail = base64DataUrlToBlob(data.thumbnail_b64);
      } catch {
        // Non-critical — import without thumbnail
      }
    }

    // Extract config (apply allowlist)
    const config = {} as Record<string, unknown>;
    for (const key of SAVED_CONFIG_KEYS) {
      if (data.config && (data.config as unknown as Record<string, unknown>)[key] !== undefined) {
        config[key] = (data.config as unknown as Record<string, unknown>)[key];
      }
    }

    // Deduplicate name
    const existingNames = (await this.list()).map((e) => e.name);
    let importName = data.name;
    if (existingNames.includes(importName)) {
      importName = `${importName} (imported)`;
      // If that also exists, add a number
      let counter = 2;
      while (existingNames.includes(importName)) {
        importName = `${data.name} (imported ${counter})`;
        counter++;
      }
    }

    // Assign new UUID and write to IDB
    const now = Date.now();
    const newId = crypto.randomUUID();

    const envelope: PlanetSaveEnvelope = {
      schemaType: SCHEMA_TYPE,
      version: CURRENT_SAVE_VERSION,
      id: newId,
      name: importName,
      createdAt: data.createdAt ?? now,
      updatedAt: now,
      thumbnail,
      config: config as unknown as PlanetSaveConfig,
      heights: heightsBuffer,
      biomes: biomesBuffer,
    };

    // Run migration pipeline (for future version upgrades)
    const migrated = migrate(envelope);

    const db = await getDB();
    await db.put('planets', migrated);

    return newId;
  }

  /** Get lightweight metadata for a save. */
  private async getMeta(id: string): Promise<{ createdAt: number } | undefined> {
    const db = await getDB();
    const envelope = await db.get('planets', id);
    if (!envelope) return undefined;
    return { createdAt: envelope.createdAt };
  }
}
