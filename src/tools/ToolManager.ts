import * as THREE from 'three';
import { SceneManager } from '@/scene/SceneManager';
import { ITool, BrushHit } from './ITool';
import { RaiseLowerTool } from './RaiseLowerTool';
import { SmoothTool } from './SmoothTool';
import { FlattenTool } from './FlattenTool';
import { BiomePaintTool } from './BiomePaintTool';
import { MeteorTool } from './MeteorTool';
import { UndoManager } from './UndoManager';
import { usePlanetStore, ToolType } from '@/store/usePlanetStore';
import { collectBrushVertices } from './BrushUtils';

export class ToolManager {
  private tools: Map<ToolType, ITool>;
  private undoManager: UndoManager;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private isStroking = false;
  private shiftHeld = false;
  private domElement: HTMLElement;

  constructor(private sceneManager: SceneManager) {
    const pd = sceneManager.planetData;
    this.undoManager = new UndoManager(pd);

    this.tools = new Map<ToolType, ITool>([
      ['raise', new RaiseLowerTool(pd)],
      ['smooth', new SmoothTool(pd)],
      ['flatten', new FlattenTool(pd)],
      ['biome', new BiomePaintTool(pd)],
      ['meteor', new MeteorTool(pd)],
    ]);

    this.domElement = sceneManager.renderer.domElement;
    this.bindEvents();
  }

  private bindEvents() {
    this.domElement.addEventListener('pointerdown', this.onPointerDown);
    this.domElement.addEventListener('pointermove', this.onPointerMove);
    this.domElement.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  private onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return;

    const tool = this.getActiveTool();
    if (!tool) return; // No tool selected — let camera handle it

    const hit = this.raycast(e);
    if (!hit) return;

    // Prevent camera orbit when tool is active
    e.stopPropagation();
    this.domElement.setPointerCapture(e.pointerId);

    this.isStroking = true;

    // Handle raise/lower toggle
    if (tool instanceof RaiseLowerTool) {
      tool.setLower(this.shiftHeld);
    }

    tool.onStrokeStart(hit);
    this.updateBrushPreview(hit);
  };

  private onPointerMove = (e: PointerEvent) => {
    const tool = this.getActiveTool();
    if (!tool) return; // No tool selected — no preview or drag

    const hit = this.raycast(e);

    if (hit) {
      this.updateBrushPreview(hit);
    }

    if (!this.isStroking || !hit) return;
    tool.onStrokeDrag(hit);
  };

  private onPointerUp = (e: PointerEvent) => {
    if (!this.isStroking) return;
    this.isStroking = false;
    this.domElement.releasePointerCapture(e.pointerId);

    const tool = this.getActiveTool();
    if (!tool) return;

    const deltas = tool.onStrokeEnd();
    if (deltas && deltas.length > 0) {
      const toolType = usePlanetStore.getState().toolState.activeTool;
      const type = toolType === 'biome' ? 'biome' : 'height';
      this.undoManager.push({ type, deltas });
      usePlanetStore.getState().bumpVersion();
    }

    this.sceneManager.planet.clearBrushWeights();
  };

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Shift') this.shiftHeld = true;

    // Undo/Redo
    if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
      e.preventDefault();
      if (e.shiftKey) {
        this.undoManager.redo();
      } else {
        this.undoManager.undo();
      }
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    if (e.key === 'Shift') this.shiftHeld = false;
  };

  private raycast(e: PointerEvent): BrushHit | null {
    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.sceneManager.camera);
    const intersects = this.raycaster.intersectObject(this.sceneManager.planet.mesh);

    if (intersects.length === 0) return null;

    const hit = intersects[0];
    const face = hit.face;
    if (!face) return null;

    // Find nearest vertex
    const pos = this.sceneManager.planet.geometry.getAttribute('position') as THREE.BufferAttribute;
    const point = hit.point;
    let nearestIdx = face.a;
    let nearestDist = Infinity;

    for (const idx of [face.a, face.b, face.c]) {
      const vx = pos.getX(idx), vy = pos.getY(idx), vz = pos.getZ(idx);
      const d = (point.x - vx) ** 2 + (point.y - vy) ** 2 + (point.z - vz) ** 2;
      if (d < nearestDist) {
        nearestDist = d;
        nearestIdx = idx;
      }
    }

    return {
      vertexIndex: nearestIdx,
      faceIndex: hit.faceIndex ?? 0,
      point: { x: point.x, y: point.y, z: point.z },
    };
  }

  private updateBrushPreview(hit: BrushHit) {
    const { brushRadius, brushFalloff } = usePlanetStore.getState().toolState;
    const posAttr = this.sceneManager.planet.geometry.getAttribute('position') as THREE.BufferAttribute;
    const posArray = posAttr.array as Float32Array;

    const vertices = collectBrushVertices(
      this.sceneManager.planetData.icosphere,
      hit.vertexIndex,
      brushRadius,
      brushFalloff,
      posArray
    );

    const weights = new Float32Array(this.sceneManager.planetData.icosphere.vertexCount);
    for (const { index, weight } of vertices) {
      weights[index] = weight;
    }
    this.sceneManager.planet.setBrushWeights(weights);
  }

  private getActiveTool(): ITool | undefined {
    const toolType = usePlanetStore.getState().toolState.activeTool;
    return this.tools.get(toolType);
  }

  getUndoManager() {
    return this.undoManager;
  }

  dispose() {
    this.domElement.removeEventListener('pointerdown', this.onPointerDown);
    this.domElement.removeEventListener('pointermove', this.onPointerMove);
    this.domElement.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }
}
