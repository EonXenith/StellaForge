import { ToolStrokeDelta } from './ITool';
import { PlanetData } from '@/planet/PlanetData';

export interface UndoCommand {
  type: 'height' | 'biome';
  deltas: ToolStrokeDelta[];
}

const MAX_UNDO = 50;

export class UndoManager {
  private undoStack: UndoCommand[] = [];
  private redoStack: UndoCommand[] = [];

  constructor(private planetData: PlanetData) {}

  push(command: UndoCommand) {
    this.undoStack.push(command);
    if (this.undoStack.length > MAX_UNDO) {
      this.undoStack.shift();
    }
    this.redoStack = [];
  }

  undo(): boolean {
    const cmd = this.undoStack.pop();
    if (!cmd) return false;

    for (const delta of cmd.deltas) {
      if (cmd.type === 'height') {
        this.planetData.heightmap[delta.index] = delta.oldValue;
      } else {
        this.planetData.biomeIds[delta.index] = delta.oldValue;
      }
    }

    if (cmd.type === 'height') this.planetData.markHeightsDirty();
    else this.planetData.markBiomesDirty();

    this.redoStack.push(cmd);
    return true;
  }

  redo(): boolean {
    const cmd = this.redoStack.pop();
    if (!cmd) return false;

    for (const delta of cmd.deltas) {
      if (cmd.type === 'height') {
        this.planetData.heightmap[delta.index] = delta.newValue;
      } else {
        this.planetData.biomeIds[delta.index] = delta.newValue;
      }
    }

    if (cmd.type === 'height') this.planetData.markHeightsDirty();
    else this.planetData.markBiomesDirty();

    this.undoStack.push(cmd);
    return true;
  }

  get canUndo() { return this.undoStack.length > 0; }
  get canRedo() { return this.redoStack.length > 0; }
}
