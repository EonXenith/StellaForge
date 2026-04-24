import { openDB, DBSchema, IDBPDatabase } from 'idb';
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

  constructor(deps: PlanetSaveServiceDeps) {
    this.deps = deps;
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

    const now = Date.now();
    const saveId = id ?? crypto.randomUUID();

    const envelope: PlanetSaveEnvelope = {
      schemaType: SCHEMA_TYPE,
      version: CURRENT_SAVE_VERSION,
      id: saveId,
      name,
      createdAt: id ? (await this.getMeta(saveId))?.createdAt ?? now : now,
      updatedAt: now,
      thumbnail: thumbnail ?? null,
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

  /** Get lightweight metadata for a save. */
  private async getMeta(id: string): Promise<{ createdAt: number } | undefined> {
    const db = await getDB();
    const envelope = await db.get('planets', id);
    if (!envelope) return undefined;
    return { createdAt: envelope.createdAt };
  }
}
