import { IcosphereData } from './Icosphere';

export interface DirtyFlags {
  heights: boolean;
  biomes: boolean;
}

/**
 * Mutable planet data living outside React/Zustand for per-frame performance.
 * Holds the heightmap and biome IDs as flat typed arrays.
 */
export class PlanetData {
  public heightmap: Float32Array;
  public biomeIds: Uint8Array;
  public dirty: DirtyFlags = { heights: false, biomes: false };
  public version: number = 0;

  constructor(public readonly icosphere: IcosphereData) {
    this.heightmap = new Float32Array(icosphere.vertexCount);
    this.biomeIds = new Uint8Array(icosphere.vertexCount);
  }

  markHeightsDirty() {
    this.dirty.heights = true;
  }

  markBiomesDirty() {
    this.dirty.biomes = true;
  }

  clearDirty() {
    this.dirty.heights = false;
    this.dirty.biomes = false;
  }

  bumpVersion() {
    this.version++;
  }
}
