import { Camera, HelpCircle, Plus } from 'lucide-react';

interface TopBarProps {
  onNewPlanet: () => void;
  onScreenshot: () => void;
  onHelp: () => void;
}

export function TopBar({ onNewPlanet, onScreenshot, onHelp }: TopBarProps) {
  return (
    <div className="absolute top-0 left-0 right-0 h-12 bg-gray-900/80 backdrop-blur border-b border-gray-700 flex items-center px-4 gap-3 z-10">
      <h1 className="text-white font-bold text-sm tracking-wide">StellaForge</h1>
      <div className="flex-1" />
      <button
        onClick={onNewPlanet}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded transition-colors"
        aria-label="New Planet"
      >
        <Plus size={14} />
        New Planet
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
