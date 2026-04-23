import { ToolStrokeDelta } from './ITool';
import { PlanetData } from '@/planet/PlanetData';

export type UndoCommand =
  | { type: 'height'; deltas: ToolStrokeDelta[] }
  | { type: 'biome'; deltas: ToolStrokeDelta[] }
  | { type: 'compound'; commands: UndoCommand[] };

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
    this.applyCommand(cmd, 'undo');
    this.redoStack.push(cmd);
    return true;
  }

  redo(): boolean {
    const cmd = this.redoStack.pop();
    if (!cmd) return false;
    this.applyCommand(cmd, 'redo');
    this.undoStack.push(cmd);
    return true;
  }

  private applyCommand(cmd: UndoCommand, direction: 'undo' | 'redo') {
    if (cmd.type === 'compound') {
      // Apply all sub-commands atomically
      for (const sub of cmd.commands) {
        this.applyCommand(sub, direction);
      }
      return;
    }

    const value = direction === 'undo' ? 'oldValue' : 'newValue';
    const target = cmd.type === 'height' ? this.planetData.heightmap : this.planetData.biomeIds;

    for (const delta of cmd.deltas) {
      target[delta.index] = delta[value];
    }

    if (cmd.type === 'height') this.planetData.markHeightsDirty();
    else this.planetData.markBiomesDirty();
  }

  get canUndo() { return this.undoStack.length > 0; }
  get canRedo() { return this.redoStack.length > 0; }
}
