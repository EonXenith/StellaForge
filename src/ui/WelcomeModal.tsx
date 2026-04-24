import { X } from 'lucide-react';

const LS_KEY = 'stellaforge.onboarding.v1';

interface WelcomeModalProps {
  open: boolean;
  onClose: () => void;
  onShowMe?: () => void;
}

const shortcuts = [
  { keys: '1-5', desc: 'Select tool' },
  { keys: 'Escape', desc: 'Deselect tool' },
  { keys: 'Click + Drag', desc: 'Paint with tool' },
  { keys: 'Shift + Click', desc: 'Lower (Raise tool)' },
  { keys: 'Left Drag', desc: 'Orbit camera' },
  { keys: 'Scroll', desc: 'Zoom in/out' },
  { keys: 'Ctrl/Cmd + Z', desc: 'Undo' },
  { keys: 'Ctrl/Cmd + Shift + Z', desc: 'Redo' },
  { keys: 'Ctrl/Cmd + S', desc: 'Save' },
  { keys: 'G', desc: 'Gallery' },
  { keys: '~', desc: 'Toggle FPS' },
];

export function WelcomeModal({ open, onClose, onShowMe }: WelcomeModalProps) {
  if (!open) return null;

  const handleClose = () => {
    localStorage.setItem(LS_KEY, '1');
    onClose();
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-[400px] max-h-[80vh] overflow-y-auto flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-semibold text-lg">Welcome to StellaForge</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-white" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <p className="text-sm text-gray-300 leading-relaxed">
          StellaForge is a 3D planet editor. Sculpt terrain, paint biomes,
          add atmospheres, oceans, and rings — then export your creation as
          an image or 3D model.
        </p>

        <div className="flex flex-col gap-1">
          <p className="text-sm text-gray-300">To get started:</p>
          <ol className="text-sm text-gray-400 list-decimal list-inside space-y-1">
            <li>Pick a tool from the bottom toolbar (keys 1-5)</li>
            <li>Click and drag on the planet to sculpt</li>
            <li>Adjust parameters in the left panels</li>
          </ol>
        </div>

        {/* Keyboard shortcut legend */}
        <section>
          <h3 className="text-xs text-gray-400 uppercase tracking-wider mb-2">Keyboard Shortcuts</h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {shortcuts.map(({ keys, desc }) => (
              <div key={keys} className="flex items-center justify-between">
                <kbd className="text-[10px] bg-gray-800 px-1.5 py-0.5 rounded text-gray-300 border border-gray-600 font-mono">{keys}</kbd>
                <span className="text-[11px] text-gray-400 ml-2">{desc}</span>
              </div>
            ))}
          </div>
        </section>

        <div className="flex gap-3 self-center">
          <button
            onClick={handleClose}
            className="bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Get Started
          </button>
          {onShowMe && (
            <button
              onClick={() => { handleClose(); onShowMe(); }}
              className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Show me
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Returns true if this is the user's first visit (no onboarding key). */
export function isFirstVisit(): boolean {
  return !localStorage.getItem(LS_KEY);
}
