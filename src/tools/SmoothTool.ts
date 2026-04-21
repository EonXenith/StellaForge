import { ITool, BrushHit, ToolStrokeDelta } from './ITool';
import { PlanetData } from '@/planet/PlanetData';
import { collectBrushVertices } from './BrushUtils';
import { usePlanetStore } from '@/store/usePlanetStore';

export class SmoothTool implements ITool {
  name = 'smooth';
  private deltas = new Map<number, { oldValue: number; newValue: number }>();

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
    const { brushRadius, brushStrength, brushFalloff } = usePlanetStore.getState().toolState;
    const posAttr = this.getDisplacedPositions();

    const vertices = collectBrushVertices(
      this.planetData.icosphere,
      hit.vertexIndex,
      brushRadius,
      brushFalloff,
      posAttr
    );

    for (const { index, weight } of vertices) {
      if (!this.deltas.has(index)) {
        this.deltas.set(index, { oldValue: this.planetData.heightmap[index], newValue: this.planetData.heightmap[index] });
      }

      // Average of neighbors
      const neighbors = this.planetData.icosphere.adjacency[index];
      let avg = 0;
      for (let i = 0; i < neighbors.length; i++) {
        avg += this.planetData.heightmap[neighbors[i]];
      }
      avg /= neighbors.length;

      // Lerp toward average
      const t = brushStrength * weight * 5; // Smooth is stronger
      this.planetData.heightmap[index] += (avg - this.planetData.heightmap[index]) * Math.min(t, 1);
      this.deltas.get(index)!.newValue = this.planetData.heightmap[index];
    }

    this.planetData.markHeightsDirty();
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
