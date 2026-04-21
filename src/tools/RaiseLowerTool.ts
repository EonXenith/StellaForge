import { ITool, BrushHit, BrushVertex, ToolStrokeDelta } from './ITool';
import { PlanetData } from '@/planet/PlanetData';
import { collectBrushVertices } from './BrushUtils';
import { usePlanetStore } from '@/store/usePlanetStore';

export class RaiseLowerTool implements ITool {
  name = 'raise';
  private deltas = new Map<number, { oldValue: number; newValue: number }>();
  private lower = false;

  constructor(private planetData: PlanetData) {}

  onStrokeStart(hit: BrushHit) {
    this.deltas.clear();
    this.lower = false;
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

  setLower(lower: boolean) {
    this.lower = lower;
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

    const direction = this.lower ? -1 : 1;

    for (const { index, weight } of vertices) {
      if (!this.deltas.has(index)) {
        this.deltas.set(index, { oldValue: this.planetData.heightmap[index], newValue: this.planetData.heightmap[index] });
      }

      this.planetData.heightmap[index] += direction * brushStrength * weight;
      this.planetData.heightmap[index] = Math.max(-1, Math.min(1, this.planetData.heightmap[index]));
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
