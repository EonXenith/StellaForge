import { create } from 'zustand';
import { TerrainParams, DEFAULT_TERRAIN_PARAMS } from '@/planet/TerrainGenerator';

export interface BiomeDefinition {
  name: string;
  color: { r: number; g: number; b: number };
  minHeight: number;
  maxHeight: number;
  emissive: boolean;
}

export interface StarParams {
  color: { r: number; g: number; b: number };
  intensity: number;
  sunAzimuth: number;   // radians, 0–2π
  sunElevation: number; // radians, -π/2 to π/2
}

export interface AtmosphereParams {
  color: { r: number; g: number; b: number };
  intensity: number;
  visible: boolean;
}

export interface OceanParams {
  enabled: boolean;
  seaLevel: number;
  colorShallow: { r: number; g: number; b: number };
  colorDeep: { r: number; g: number; b: number };
  waveSpeed: number;
  waveAmplitude: number;
}

export interface CloudParams {
  enabled: boolean;
  density: number;
  rotationSpeed: number;
  altitude: number;
  color: { r: number; g: number; b: number };
}

export interface RingParams {
  enabled: boolean;
  innerRadius: number;
  outerRadius: number;
  tilt: number;
  color: { r: number; g: number; b: number };
  opacity: number;
}

export interface MoonConfig {
  id: string;
  seed: number;
  size: number;
  orbitRadius: number;
  orbitSpeed: number;
  orbitTilt: number;
  phase: number;
}

export interface DayNightParams {
  enabled: boolean;
  speed: number;
}

export interface ErosionParams {
  iterations: number;
  sedimentCapacity: number;
  depositionRate: number;
  evaporationRate: number;
  inertia: number;
}

export type ToolType = 'none' | 'raise' | 'lower' | 'smooth' | 'flatten' | 'biome' | 'meteor';

export interface ToolState {
  activeTool: ToolType;
  brushRadius: number;
  brushStrength: number;
  brushFalloff: number;
}

export const DEFAULT_BIOMES: BiomeDefinition[] = [
  { name: 'Ocean', color: { r: 0.1, g: 0.3, b: 0.7 }, minHeight: -1.0, maxHeight: -0.05, emissive: false },
  { name: 'Beach', color: { r: 0.9, g: 0.85, b: 0.6 }, minHeight: -0.05, maxHeight: 0.02, emissive: false },
  { name: 'Grassland', color: { r: 0.3, g: 0.7, b: 0.2 }, minHeight: 0.02, maxHeight: 0.2, emissive: true },
  { name: 'Forest', color: { r: 0.1, g: 0.5, b: 0.15 }, minHeight: 0.2, maxHeight: 0.4, emissive: false },
  { name: 'Desert', color: { r: 0.85, g: 0.7, b: 0.4 }, minHeight: 0.02, maxHeight: 0.3, emissive: false },
  { name: 'Tundra', color: { r: 0.8, g: 0.85, b: 0.9 }, minHeight: 0.4, maxHeight: 0.6, emissive: false },
  { name: 'Rocky', color: { r: 0.5, g: 0.45, b: 0.4 }, minHeight: 0.6, maxHeight: 0.8, emissive: false },
  { name: 'Volcanic', color: { r: 0.3, g: 0.1, b: 0.05 }, minHeight: 0.8, maxHeight: 1.0, emissive: false },
];

// Compute default azimuth/elevation from the original hardcoded direction (1, 0.5, 0.8)
const _defaultDir = { x: 1, y: 0.5, z: 0.8 };
const _defaultLen = Math.sqrt(_defaultDir.x ** 2 + _defaultDir.y ** 2 + _defaultDir.z ** 2);
const _defaultElev = Math.asin(_defaultDir.y / _defaultLen);
const _defaultAzi = Math.atan2(_defaultDir.x, _defaultDir.z);

interface PlanetStore {
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
  toolState: ToolState;
  selectedBiomeId: number;
  meteorCraterBiomeId: number | null; // null = use selectedBiomeId
  version: number;

  setTerrainParams: (params: Partial<TerrainParams>) => void;
  setStarParams: (params: Partial<StarParams>) => void;
  setAtmosphereParams: (params: Partial<AtmosphereParams>) => void;
  setOceanParams: (params: Partial<OceanParams>) => void;
  setCloudParams: (params: Partial<CloudParams>) => void;
  setRingParams: (params: Partial<RingParams>) => void;
  setDayNightParams: (params: Partial<DayNightParams>) => void;
  setErosionParams: (params: Partial<ErosionParams>) => void;
  addMoon: () => void;
  removeMoon: (id: string) => void;
  updateMoon: (id: string, params: Partial<MoonConfig>) => void;
  setBiomes: (biomes: BiomeDefinition[]) => void;
  setToolState: (state: Partial<ToolState>) => void;
  setSelectedBiomeId: (id: number) => void;
  setMeteorCraterBiomeId: (id: number | null) => void;
  bumpVersion: () => void;
}

let _moonIdCounter = 0;

export const usePlanetStore = create<PlanetStore>((set) => ({
  terrainParams: { ...DEFAULT_TERRAIN_PARAMS },
  starParams: {
    color: { r: 1, g: 0.98, b: 0.9 },
    intensity: 1.5,
    sunAzimuth: _defaultAzi,
    sunElevation: _defaultElev,
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
  moons: [],
  dayNightParams: {
    enabled: false,
    speed: 0.1,
  },
  erosionParams: {
    iterations: 50000,
    sedimentCapacity: 4.0,
    depositionRate: 0.3,
    evaporationRate: 0.01,
    inertia: 0.05,
  },
  biomes: [...DEFAULT_BIOMES],
  toolState: {
    activeTool: 'none',
    brushRadius: 0.15,
    brushStrength: 0.02,
    brushFalloff: 0.5,
  },
  selectedBiomeId: 0,
  meteorCraterBiomeId: null,
  version: 0,

  setTerrainParams: (params) =>
    set((s) => ({ terrainParams: { ...s.terrainParams, ...params } })),
  setStarParams: (params) =>
    set((s) => ({ starParams: { ...s.starParams, ...params } })),
  setAtmosphereParams: (params) =>
    set((s) => ({ atmosphereParams: { ...s.atmosphereParams, ...params } })),
  setOceanParams: (params) =>
    set((s) => ({ oceanParams: { ...s.oceanParams, ...params } })),
  setCloudParams: (params) =>
    set((s) => ({ cloudParams: { ...s.cloudParams, ...params } })),
  setRingParams: (params) =>
    set((s) => ({ ringParams: { ...s.ringParams, ...params } })),
  setDayNightParams: (params) =>
    set((s) => ({ dayNightParams: { ...s.dayNightParams, ...params } })),
  setErosionParams: (params) =>
    set((s) => ({ erosionParams: { ...s.erosionParams, ...params } })),
  addMoon: () =>
    set((s) => ({
      moons: [
        ...s.moons,
        {
          id: `moon_${++_moonIdCounter}`,
          seed: Math.floor(Math.random() * 100000),
          size: 0.15,
          orbitRadius: 2.5,
          orbitSpeed: 0.3,
          orbitTilt: Math.random() * 0.5,
          phase: Math.random() * Math.PI * 2,
        },
      ],
    })),
  removeMoon: (id) =>
    set((s) => ({ moons: s.moons.filter((m) => m.id !== id) })),
  updateMoon: (id, params) =>
    set((s) => ({
      moons: s.moons.map((m) => (m.id === id ? { ...m, ...params } : m)),
    })),
  setBiomes: (biomes) => set({ biomes }),
  setToolState: (state) =>
    set((s) => ({ toolState: { ...s.toolState, ...state } })),
  setSelectedBiomeId: (id) => set({ selectedBiomeId: id }),
  setMeteorCraterBiomeId: (id) => set({ meteorCraterBiomeId: id }),
  bumpVersion: () => set((s) => ({ version: s.version + 1 })),
}));

/** Convert store azimuth/elevation to a normalized direction vector. */
export function getSunDirection(azimuth: number, elevation: number): { x: number; y: number; z: number } {
  const cosElev = Math.cos(elevation);
  return {
    x: Math.sin(azimuth) * cosElev,
    y: Math.sin(elevation),
    z: Math.cos(azimuth) * cosElev,
  };
}
