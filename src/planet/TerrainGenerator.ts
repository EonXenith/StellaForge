import { PlanetData } from './PlanetData';
import { NoiseParams, createSeededNoise, ridgedMultifractal3D } from './Noise';

export interface TerrainParams extends NoiseParams {
  radius: number;
  heightScale: number;
}

export const DEFAULT_TERRAIN_PARAMS: TerrainParams = {
  seed: 'stellaforge',
  radius: 1.0,
  heightScale: 0.15,
  octaves: 6,
  lacunarity: 2.0,
  persistence: 0.5,
  amplitude: 1.0,
  ridgeWeight: 0.3,
};

/**
 * Generates terrain by evaluating noise at each vertex's unit-sphere position.
 */
export function generateTerrain(planetData: PlanetData, params: TerrainParams) {
  const noise3D = createSeededNoise(params.seed);
  const positions = planetData.icosphere.positions;
  const heightmap = planetData.heightmap;

  for (let i = 0; i < planetData.icosphere.vertexCount; i++) {
    const x = positions[i * 3];
    const y = positions[i * 3 + 1];
    const z = positions[i * 3 + 2];

    heightmap[i] = ridgedMultifractal3D(noise3D, x, y, z, params);
  }

  planetData.markHeightsDirty();
}
