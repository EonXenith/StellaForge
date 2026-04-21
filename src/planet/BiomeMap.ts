import { PlanetData } from './PlanetData';
import { BiomeDefinition } from '@/store/usePlanetStore';

/**
 * Auto-assigns biome IDs based on vertex height and biome height ranges.
 */
export function assignBiomes(planetData: PlanetData, biomes: BiomeDefinition[]) {
  const { heightmap, biomeIds } = planetData;

  for (let i = 0; i < heightmap.length; i++) {
    const h = heightmap[i];
    let assigned = 0;

    for (let b = 0; b < biomes.length; b++) {
      if (h >= biomes[b].minHeight && h < biomes[b].maxHeight) {
        assigned = b;
        break;
      }
    }

    // If height exceeds all ranges, assign last biome
    if (h >= biomes[biomes.length - 1].maxHeight) {
      assigned = biomes.length - 1;
    }

    biomeIds[i] = assigned;
  }

  planetData.markBiomesDirty();
}
