import { X } from 'lucide-react';

interface HelpModalProps {
  open: boolean;
  onClose: () => void;
}

const shortcuts = [
  { keys: '1-5', desc: 'Select tools' },
  { keys: 'Click + Drag', desc: 'Use active tool' },
  { keys: 'Shift + Click', desc: 'Lower terrain (Raise tool)' },
  { keys: 'Right Drag', desc: 'Pan camera' },
  { keys: 'Left Drag (no tool)', desc: 'Orbit camera' },
  { keys: 'Scroll', desc: 'Zoom' },
  { keys: 'Ctrl/Cmd + Z', desc: 'Undo' },
  { keys: 'Ctrl/Cmd + Shift + Z', desc: 'Redo' },
  { keys: '~', desc: 'Toggle FPS counter' },
];

export function HelpModal({ open, onClose }: HelpModalProps) {
  if (!open) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-96 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-semibold">Keyboard Shortcuts</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {shortcuts.map(({ keys, desc }) => (
            <div key={keys} className="flex items-center justify-between">
              <kbd className="text-xs bg-gray-800 px-2 py-1 rounded text-gray-300 border border-gray-600 font-mono">{keys}</kbd>
              <span className="text-xs text-gray-400">{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
