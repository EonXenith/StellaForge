import { TerrainParams } from '@/planet/TerrainGenerator';
import { BiomeDefinition, DEFAULT_BIOMES } from '@/store/usePlanetStore';

export interface PlanetTemplate {
  name: string;
  terrain: TerrainParams;
  biomes: BiomeDefinition[];
}

const e = false; // shorthand for emissive default

export const TEMPLATES: PlanetTemplate[] = [
  {
    name: 'Earth-like',
    terrain: {
      seed: 'earth',
      radius: 1.0,
      heightScale: 0.15,
      octaves: 6,
      lacunarity: 2.0,
      persistence: 0.5,
      amplitude: 1.0,
      ridgeWeight: 0.3,
    },
    biomes: [...DEFAULT_BIOMES],
  },
  {
    name: 'Desert',
    terrain: {
      seed: 'dune',
      radius: 1.0,
      heightScale: 0.08,
      octaves: 4,
      lacunarity: 2.5,
      persistence: 0.4,
      amplitude: 0.8,
      ridgeWeight: 0.1,
    },
    biomes: [
      { name: 'Dry Sea', color: { r: 0.6, g: 0.5, b: 0.3 }, minHeight: -1.0, maxHeight: -0.1, emissive: e },
      { name: 'Flat Sand', color: { r: 0.85, g: 0.75, b: 0.5 }, minHeight: -0.1, maxHeight: 0.1, emissive: e },
      { name: 'Dunes', color: { r: 0.9, g: 0.8, b: 0.55 }, minHeight: 0.1, maxHeight: 0.3, emissive: e },
      { name: 'Rocky Desert', color: { r: 0.6, g: 0.45, b: 0.3 }, minHeight: 0.3, maxHeight: 0.5, emissive: e },
      { name: 'Mesa', color: { r: 0.7, g: 0.4, b: 0.2 }, minHeight: 0.5, maxHeight: 0.7, emissive: e },
      { name: 'Badlands', color: { r: 0.5, g: 0.3, b: 0.15 }, minHeight: 0.7, maxHeight: 0.85, emissive: e },
      { name: 'Peaks', color: { r: 0.4, g: 0.35, b: 0.3 }, minHeight: 0.85, maxHeight: 1.0, emissive: e },
      { name: 'Oasis', color: { r: 0.2, g: 0.5, b: 0.3 }, minHeight: -0.2, maxHeight: -0.1, emissive: true },
    ],
  },
  {
    name: 'Ocean',
    terrain: {
      seed: 'ocean',
      radius: 1.0,
      heightScale: 0.12,
      octaves: 5,
      lacunarity: 2.0,
      persistence: 0.6,
      amplitude: 0.5,
      ridgeWeight: 0.0,
    },
    biomes: [
      { name: 'Deep Ocean', color: { r: 0.05, g: 0.15, b: 0.5 }, minHeight: -1.0, maxHeight: -0.2, emissive: e },
      { name: 'Ocean', color: { r: 0.1, g: 0.3, b: 0.6 }, minHeight: -0.2, maxHeight: 0.0, emissive: e },
      { name: 'Shallows', color: { r: 0.15, g: 0.45, b: 0.65 }, minHeight: 0.0, maxHeight: 0.05, emissive: e },
      { name: 'Reef', color: { r: 0.2, g: 0.55, b: 0.5 }, minHeight: 0.05, maxHeight: 0.1, emissive: e },
      { name: 'Beach', color: { r: 0.9, g: 0.85, b: 0.65 }, minHeight: 0.1, maxHeight: 0.15, emissive: e },
      { name: 'Island', color: { r: 0.3, g: 0.65, b: 0.2 }, minHeight: 0.15, maxHeight: 0.4, emissive: true },
      { name: 'Volcanic', color: { r: 0.3, g: 0.2, b: 0.15 }, minHeight: 0.4, maxHeight: 0.7, emissive: e },
      { name: 'Peak', color: { r: 0.5, g: 0.5, b: 0.5 }, minHeight: 0.7, maxHeight: 1.0, emissive: e },
    ],
  },
  {
    name: 'Ice',
    terrain: {
      seed: 'frost',
      radius: 1.0,
      heightScale: 0.1,
      octaves: 5,
      lacunarity: 2.2,
      persistence: 0.45,
      amplitude: 0.9,
      ridgeWeight: 0.5,
    },
    biomes: [
      { name: 'Frozen Sea', color: { r: 0.6, g: 0.75, b: 0.85 }, minHeight: -1.0, maxHeight: -0.1, emissive: e },
      { name: 'Ice Shelf', color: { r: 0.8, g: 0.88, b: 0.95 }, minHeight: -0.1, maxHeight: 0.05, emissive: e },
      { name: 'Snow Plain', color: { r: 0.9, g: 0.92, b: 0.95 }, minHeight: 0.05, maxHeight: 0.2, emissive: e },
      { name: 'Glacier', color: { r: 0.7, g: 0.82, b: 0.9 }, minHeight: 0.2, maxHeight: 0.4, emissive: e },
      { name: 'Tundra', color: { r: 0.5, g: 0.55, b: 0.6 }, minHeight: 0.4, maxHeight: 0.6, emissive: e },
      { name: 'Frozen Peak', color: { r: 0.85, g: 0.9, b: 0.95 }, minHeight: 0.6, maxHeight: 0.8, emissive: e },
      { name: 'Permafrost', color: { r: 0.4, g: 0.45, b: 0.5 }, minHeight: 0.8, maxHeight: 0.9, emissive: e },
      { name: 'Ice Cap', color: { r: 0.95, g: 0.97, b: 1.0 }, minHeight: 0.9, maxHeight: 1.0, emissive: e },
    ],
  },
  {
    name: 'Volcanic',
    terrain: {
      seed: 'lava',
      radius: 1.0,
      heightScale: 0.2,
      octaves: 7,
      lacunarity: 2.1,
      persistence: 0.55,
      amplitude: 1.2,
      ridgeWeight: 0.7,
    },
    biomes: [
      { name: 'Lava', color: { r: 0.8, g: 0.2, b: 0.0 }, minHeight: -1.0, maxHeight: -0.1, emissive: true },
      { name: 'Cooling Lava', color: { r: 0.4, g: 0.1, b: 0.05 }, minHeight: -0.1, maxHeight: 0.05, emissive: e },
      { name: 'Basalt', color: { r: 0.2, g: 0.18, b: 0.15 }, minHeight: 0.05, maxHeight: 0.2, emissive: e },
      { name: 'Obsidian', color: { r: 0.1, g: 0.08, b: 0.12 }, minHeight: 0.2, maxHeight: 0.35, emissive: e },
      { name: 'Ash', color: { r: 0.35, g: 0.3, b: 0.28 }, minHeight: 0.35, maxHeight: 0.5, emissive: e },
      { name: 'Crater', color: { r: 0.25, g: 0.15, b: 0.1 }, minHeight: 0.5, maxHeight: 0.7, emissive: e },
      { name: 'Caldera', color: { r: 0.6, g: 0.15, b: 0.0 }, minHeight: 0.7, maxHeight: 0.85, emissive: true },
      { name: 'Magma Vent', color: { r: 1.0, g: 0.4, b: 0.0 }, minHeight: 0.85, maxHeight: 1.0, emissive: true },
    ],
  },
  {
    name: 'Barren',
    terrain: {
      seed: 'rock',
      radius: 1.0,
      heightScale: 0.12,
      octaves: 4,
      lacunarity: 1.8,
      persistence: 0.5,
      amplitude: 0.7,
      ridgeWeight: 0.2,
    },
    biomes: [
      { name: 'Lowlands', color: { r: 0.4, g: 0.38, b: 0.35 }, minHeight: -1.0, maxHeight: -0.1, emissive: e },
      { name: 'Flat Rock', color: { r: 0.5, g: 0.47, b: 0.43 }, minHeight: -0.1, maxHeight: 0.1, emissive: e },
      { name: 'Gravel', color: { r: 0.55, g: 0.52, b: 0.48 }, minHeight: 0.1, maxHeight: 0.25, emissive: e },
      { name: 'Boulder Field', color: { r: 0.45, g: 0.42, b: 0.38 }, minHeight: 0.25, maxHeight: 0.4, emissive: e },
      { name: 'Cliff', color: { r: 0.35, g: 0.33, b: 0.3 }, minHeight: 0.4, maxHeight: 0.6, emissive: e },
      { name: 'Ridge', color: { r: 0.5, g: 0.48, b: 0.45 }, minHeight: 0.6, maxHeight: 0.75, emissive: e },
      { name: 'Highland', color: { r: 0.6, g: 0.57, b: 0.53 }, minHeight: 0.75, maxHeight: 0.9, emissive: e },
      { name: 'Summit', color: { r: 0.65, g: 0.63, b: 0.6 }, minHeight: 0.9, maxHeight: 1.0, emissive: e },
    ],
  },
];
