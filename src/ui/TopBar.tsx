import { Camera, HelpCircle, Plus, FolderOpen, Save } from 'lucide-react';
import { FpsCounter } from './FpsCounter';
import { usePlanetStore } from '@/store/usePlanetStore';
import { SceneManager } from '@/scene/SceneManager';

interface TopBarProps {
  onNewPlanet: () => void;
  onScreenshot: () => void;
  onHelp: () => void;
  sceneManager: SceneManager | null;
  fpsVisible: boolean;
}

export function TopBar({ onNewPlanet, onScreenshot, onHelp, sceneManager, fpsVisible }: TopBarProps) {
  const setGalleryOpen = usePlanetStore((s) => s.setGalleryOpen);
  const setSaveDialogOpen = usePlanetStore((s) => s.setSaveDialogOpen);
  const currentSaveName = usePlanetStore((s) => s.currentSaveName);
  const hasUnsavedChanges = usePlanetStore((s) => s.hasUnsavedChanges);

  return (
    <div className="absolute top-0 left-0 right-0 h-12 bg-gray-900/80 backdrop-blur border-b border-gray-700 flex items-center px-4 gap-3 z-10">
      <h1 className="text-white font-bold text-sm tracking-wide">StellaForge</h1>
      {currentSaveName && (
        <span className="text-xs text-gray-400 truncate max-w-40">
          {currentSaveName}{hasUnsavedChanges ? ' *' : ''}
        </span>
      )}
      <FpsCounter sceneManager={sceneManager} visible={fpsVisible} />
      <div className="flex-1" />
      <button
        onClick={onNewPlanet}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded transition-colors"
        aria-label="New Planet"
      >
        <Plus size={14} />
        New
      </button>
      <button
        onClick={() => setSaveDialogOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded transition-colors"
        aria-label="Save Planet"
      >
        <Save size={14} />
        Save
      </button>
      <button
        onClick={() => setGalleryOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded transition-colors"
        aria-label="Open Gallery"
      >
        <FolderOpen size={14} />
        Gallery
      </button>
      <button
        onClick={onScreenshot}
        className="p-2 text-gray-400 hover:text-white transition-colors"
        aria-label="Screenshot"
      >
        <Camera size={16} />
      </button>
      <button
        onClick={onHelp}
        className="p-2 text-gray-400 hover:text-white transition-colors"
        aria-label="Help"
      >
        <HelpCircle size={16} />
      </button>
    </div>
  );
}
