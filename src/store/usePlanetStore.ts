import { create } from 'zustand';
import { TerrainParams, DEFAULT_TERRAIN_PARAMS } from '@/planet/TerrainGenerator';

export interface BiomeDefinition {
  name: string;
  color: { r: number; g: number; b: number };
  minHeight: number;
  maxHeight: number;
}

export interface StarParams {
  color: { r: number; g: number; b: number };
  intensity: number;
  direction: { x: number; y: number; z: number };
}

export interface AtmosphereParams {
  color: { r: number; g: number; b: number };
  intensity: number;
  visible: boolean;
}

export type ToolType = 'raise' | 'lower' | 'smooth' | 'flatten' | 'biome' | 'meteor';

export interface ToolState {
  activeTool: ToolType;
  brushRadius: number;
  brushStrength: number;
  brushFalloff: number;
}

export const DEFAULT_BIOMES: BiomeDefinition[] = [
  { name: 'Ocean', color: { r: 0.1, g: 0.3, b: 0.7 }, minHeight: -1.0, maxHeight: -0.05 },
  { name: 'Beach', color: { r: 0.9, g: 0.85, b: 0.6 }, minHeight: -0.05, maxHeight: 0.02 },
  { name: 'Grassland', color: { r: 0.3, g: 0.7, b: 0.2 }, minHeight: 0.02, maxHeight: 0.2 },
  { name: 'Forest', color: { r: 0.1, g: 0.5, b: 0.15 }, minHeight: 0.2, maxHeight: 0.4 },
  { name: 'Desert', color: { r: 0.85, g: 0.7, b: 0.4 }, minHeight: 0.02, maxHeight: 0.3 },
  { name: 'Tundra', color: { r: 0.8, g: 0.85, b: 0.9 }, minHeight: 0.4, maxHeight: 0.6 },
  { name: 'Rocky', color: { r: 0.5, g: 0.45, b: 0.4 }, minHeight: 0.6, maxHeight: 0.8 },
  { name: 'Volcanic', color: { r: 0.3, g: 0.1, b: 0.05 }, minHeight: 0.8, maxHeight: 1.0 },
];

interface PlanetStore {
  terrainParams: TerrainParams;
  starParams: StarParams;
  atmosphereParams: AtmosphereParams;
  biomes: BiomeDefinition[];
  toolState: ToolState;
  version: number;

  setTerrainParams: (params: Partial<TerrainParams>) => void;
  setStarParams: (params: Partial<StarParams>) => void;
  setAtmosphereParams: (params: Partial<AtmosphereParams>) => void;
  setBiomes: (biomes: BiomeDefinition[]) => void;
  setToolState: (state: Partial<ToolState>) => void;
  bumpVersion: () => void;
}

export const usePlanetStore = create<PlanetStore>((set) => ({
  terrainParams: { ...DEFAULT_TERRAIN_PARAMS },
  starParams: {
    color: { r: 1, g: 0.98, b: 0.9 },
    intensity: 1.5,
    direction: { x: 1, y: 0.5, z: 0.8 },
  },
  atmosphereParams: {
    color: { r: 0.3, g: 0.6, b: 1.0 },
    intensity: 1.2,
    visible: true,
  },
  biomes: [...DEFAULT_BIOMES],
  toolState: {
    activeTool: 'raise',
    brushRadius: 0.15,
    brushStrength: 0.02,
    brushFalloff: 0.5,
  },
  version: 0,

  setTerrainParams: (params) =>
    set((s) => ({ terrainParams: { ...s.terrainParams, ...params } })),
  setStarParams: (params) =>
    set((s) => ({ starParams: { ...s.starParams, ...params } })),
  setAtmosphereParams: (params) =>
    set((s) => ({ atmosphereParams: { ...s.atmosphereParams, ...params } })),
  setBiomes: (biomes) => set({ biomes }),
  setToolState: (state) =>
    set((s) => ({ toolState: { ...s.toolState, ...state } })),
  bumpVersion: () => set((s) => ({ version: s.version + 1 })),
}));
