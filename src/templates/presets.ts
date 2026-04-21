import { TerrainParams } from '@/planet/TerrainGenerator';
import { BiomeDefinition, DEFAULT_BIOMES } from '@/store/usePlanetStore';

export interface PlanetTemplate {
  name: string;
  terrain: TerrainParams;
  biomes: BiomeDefinition[];
}

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
      { name: 'Dry Sea', color: { r: 0.6, g: 0.5, b: 0.3 }, minHeight: -1.0, maxHeight: -0.1 },
      { name: 'Flat Sand', color: { r: 0.85, g: 0.75, b: 0.5 }, minHeight: -0.1, maxHeight: 0.1 },
      { name: 'Dunes', color: { r: 0.9, g: 0.8, b: 0.55 }, minHeight: 0.1, maxHeight: 0.3 },
      { name: 'Rocky Desert', color: { r: 0.6, g: 0.45, b: 0.3 }, minHeight: 0.3, maxHeight: 0.5 },
      { name: 'Mesa', color: { r: 0.7, g: 0.4, b: 0.2 }, minHeight: 0.5, maxHeight: 0.7 },
      { name: 'Badlands', color: { r: 0.5, g: 0.3, b: 0.15 }, minHeight: 0.7, maxHeight: 0.85 },
      { name: 'Peaks', color: { r: 0.4, g: 0.35, b: 0.3 }, minHeight: 0.85, maxHeight: 1.0 },
      { name: 'Oasis', color: { r: 0.2, g: 0.5, b: 0.3 }, minHeight: -0.2, maxHeight: -0.1 },
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
      { name: 'Deep Ocean', color: { r: 0.05, g: 0.15, b: 0.5 }, minHeight: -1.0, maxHeight: -0.2 },
      { name: 'Ocean', color: { r: 0.1, g: 0.3, b: 0.6 }, minHeight: -0.2, maxHeight: 0.0 },
      { name: 'Shallows', color: { r: 0.15, g: 0.45, b: 0.65 }, minHeight: 0.0, maxHeight: 0.05 },
      { name: 'Reef', color: { r: 0.2, g: 0.55, b: 0.5 }, minHeight: 0.05, maxHeight: 0.1 },
      { name: 'Beach', color: { r: 0.9, g: 0.85, b: 0.65 }, minHeight: 0.1, maxHeight: 0.15 },
      { name: 'Island', color: { r: 0.3, g: 0.65, b: 0.2 }, minHeight: 0.15, maxHeight: 0.4 },
      { name: 'Volcanic', color: { r: 0.3, g: 0.2, b: 0.15 }, minHeight: 0.4, maxHeight: 0.7 },
      { name: 'Peak', color: { r: 0.5, g: 0.5, b: 0.5 }, minHeight: 0.7, maxHeight: 1.0 },
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
      { name: 'Frozen Sea', color: { r: 0.6, g: 0.75, b: 0.85 }, minHeight: -1.0, maxHeight: -0.1 },
      { name: 'Ice Shelf', color: { r: 0.8, g: 0.88, b: 0.95 }, minHeight: -0.1, maxHeight: 0.05 },
      { name: 'Snow Plain', color: { r: 0.9, g: 0.92, b: 0.95 }, minHeight: 0.05, maxHeight: 0.2 },
      { name: 'Glacier', color: { r: 0.7, g: 0.82, b: 0.9 }, minHeight: 0.2, maxHeight: 0.4 },
      { name: 'Tundra', color: { r: 0.5, g: 0.55, b: 0.6 }, minHeight: 0.4, maxHeight: 0.6 },
      { name: 'Frozen Peak', color: { r: 0.85, g: 0.9, b: 0.95 }, minHeight: 0.6, maxHeight: 0.8 },
      { name: 'Permafrost', color: { r: 0.4, g: 0.45, b: 0.5 }, minHeight: 0.8, maxHeight: 0.9 },
      { name: 'Ice Cap', color: { r: 0.95, g: 0.97, b: 1.0 }, minHeight: 0.9, maxHeight: 1.0 },
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
      { name: 'Lava', color: { r: 0.8, g: 0.2, b: 0.0 }, minHeight: -1.0, maxHeight: -0.1 },
      { name: 'Cooling Lava', color: { r: 0.4, g: 0.1, b: 0.05 }, minHeight: -0.1, maxHeight: 0.05 },
      { name: 'Basalt', color: { r: 0.2, g: 0.18, b: 0.15 }, minHeight: 0.05, maxHeight: 0.2 },
      { name: 'Obsidian', color: { r: 0.1, g: 0.08, b: 0.12 }, minHeight: 0.2, maxHeight: 0.35 },
      { name: 'Ash', color: { r: 0.35, g: 0.3, b: 0.28 }, minHeight: 0.35, maxHeight: 0.5 },
      { name: 'Crater', color: { r: 0.25, g: 0.15, b: 0.1 }, minHeight: 0.5, maxHeight: 0.7 },
      { name: 'Caldera', color: { r: 0.6, g: 0.15, b: 0.0 }, minHeight: 0.7, maxHeight: 0.85 },
      { name: 'Magma Vent', color: { r: 1.0, g: 0.4, b: 0.0 }, minHeight: 0.85, maxHeight: 1.0 },
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
      { name: 'Lowlands', color: { r: 0.4, g: 0.38, b: 0.35 }, minHeight: -1.0, maxHeight: -0.1 },
      { name: 'Flat Rock', color: { r: 0.5, g: 0.47, b: 0.43 }, minHeight: -0.1, maxHeight: 0.1 },
      { name: 'Gravel', color: { r: 0.55, g: 0.52, b: 0.48 }, minHeight: 0.1, maxHeight: 0.25 },
      { name: 'Boulder Field', color: { r: 0.45, g: 0.42, b: 0.38 }, minHeight: 0.25, maxHeight: 0.4 },
      { name: 'Cliff', color: { r: 0.35, g: 0.33, b: 0.3 }, minHeight: 0.4, maxHeight: 0.6 },
      { name: 'Ridge', color: { r: 0.5, g: 0.48, b: 0.45 }, minHeight: 0.6, maxHeight: 0.75 },
      { name: 'Highland', color: { r: 0.6, g: 0.57, b: 0.53 }, minHeight: 0.75, maxHeight: 0.9 },
      { name: 'Summit', color: { r: 0.65, g: 0.63, b: 0.6 }, minHeight: 0.9, maxHeight: 1.0 },
    ],
  },
];
