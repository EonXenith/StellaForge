import { ITool, BrushHit, ToolStrokeDelta } from './ITool';
import { PlanetData } from '@/planet/PlanetData';
import { collectBrushVertices } from './BrushUtils';
import { usePlanetStore } from '@/store/usePlanetStore';

export class BiomePaintTool implements ITool {
  name = 'biome';
  private deltas = new Map<number, { oldValue: number; newValue: number }>();
  // Reads selectedBiomeId from store at apply-time, not per-frame

  constructor(private planetData: PlanetData) {}

  onStrokeStart(hit: BrushHit) {
    this.deltas.clear();
    this.applyBrush(hit);
  }

  onStrokeDrag(hit: BrushHit) {
    this.applyBrush(hit);
  }

  onStrokeEnd(): ToolStrokeDelta[] | null {
    if (this.deltas.size === 0) return null;
    const result: ToolStrokeDelta[] = [];
    this.deltas.forEach((val, index) => {
      result.push({ index, oldValue: val.oldValue, newValue: val.newValue });
    });
    return result;
  }

  private applyBrush(hit: BrushHit) {
    const { brushRadius, brushFalloff } = usePlanetStore.getState().toolState;
    const posAttr = this.getDisplacedPositions();

    const vertices = collectBrushVertices(
      this.planetData.icosphere,
      hit.vertexIndex,
      brushRadius,
      brushFalloff,
      posAttr
    );

    for (const { index, weight } of vertices) {
      if (weight > 0.5) {
        if (!this.deltas.has(index)) {
          this.deltas.set(index, { oldValue: this.planetData.biomeIds[index], newValue: this.planetData.biomeIds[index] });
        }
        const biomeId = usePlanetStore.getState().selectedBiomeId;
        this.planetData.biomeIds[index] = biomeId;
        this.deltas.get(index)!.newValue = biomeId;
      }
    }

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
