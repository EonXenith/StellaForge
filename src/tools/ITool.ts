export interface BrushHit {
  vertexIndex: number;
  faceIndex: number;
  point: { x: number; y: number; z: number };
}

export interface BrushVertex {
  index: number;
  weight: number; // 0-1, falloff-weighted
}

export interface ToolStrokeDelta {
  index: number;
  oldValue: number;
  newValue: number;
}

export interface ITool {
  name: string;
  onStrokeStart(hit: BrushHit): void;
  onStrokeDrag(hit: BrushHit): void;
  onStrokeEnd(): ToolStrokeDelta[] | null;
}
