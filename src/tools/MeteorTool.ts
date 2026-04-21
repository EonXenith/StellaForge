import { ITool, BrushHit, ToolStrokeDelta } from './ITool';
import { PlanetData } from '@/planet/PlanetData';
import { collectBrushVertices } from './BrushUtils';
import { usePlanetStore } from '@/store/usePlanetStore';

export class MeteorTool implements ITool {
  name = 'meteor';
  private deltas: ToolStrokeDelta[] = [];

  constructor(private planetData: PlanetData) {}

  onStrokeStart(hit: BrushHit) {
    this.deltas = [];
    this.createCrater(hit);
  }

  onStrokeDrag(_hit: BrushHit) {
    // Meteor is single-click only
  }

  onStrokeEnd(): ToolStrokeDelta[] | null {
    return this.deltas.length > 0 ? this.deltas : null;
  }

  private createCrater(hit: BrushHit) {
    const { brushRadius } = usePlanetStore.getState().toolState;
    const craterRadius = brushRadius * 2;
    const craterDepth = brushRadius * 0.8;
    const rimHeight = brushRadius * 0.3;
    const posAttr = this.getDisplacedPositions();

    const vertices = collectBrushVertices(
      this.planetData.icosphere,
      hit.vertexIndex,
      craterRadius * 1.5, // Larger to get rim
      1.0,
      posAttr
    );

    for (const { index, weight } of vertices) {
      const dist = 1 - weight; // Convert weight to distance ratio
      const oldHeight = this.planetData.heightmap[index];
      let delta = 0;

      if (dist < 0.7) {
        // Inside crater: cos^2 depression
        const t = dist / 0.7;
        delta = -craterDepth * Math.cos(t * Math.PI * 0.5) * Math.cos(t * Math.PI * 0.5);
      } else {
        // Rim: raised edge
        const t = (dist - 0.7) / 0.3;
        delta = rimHeight * Math.sin(t * Math.PI);
      }

      this.planetData.heightmap[index] = Math.max(-1, Math.min(1, oldHeight + delta));
      this.deltas.push({ index, oldValue: oldHeight, newValue: this.planetData.heightmap[index] });

      // Set crater biome
      if (dist < 0.7) {
        const state = usePlanetStore.getState();
        const craterBiome = state.meteorCraterBiomeId ?? state.selectedBiomeId;
        this.planetData.biomeIds[index] = craterBiome;
      }
    }

    this.planetData.markHeightsDirty();
    this.planetData.markBiomesDirty();
  }

  private getDisplacedPositions(): Float32Array {
    const ico = this.planetData.icosphere;
    const positions = new Float32Array(ico.vertexCount * 3);
    const hs = usePlanetStore.getState().terrainParams.heightScale;
    const r = usePlanetStore.getState().terrainParams.radius;
    for (let i = 0; i < ico.vertexCount; i++) {
      const scale = r + this.planetData.heightmap[i] * hs;
      positions[i * 3] = ico.positions[i * 3] * scale;
      positions[i * 3 + 1] = ico.positions[i * 3 + 1] * scale;
      positions[i * 3 + 2] = ico.positions[i * 3 + 2] * scale;
    }
    return positions;
  }
}
