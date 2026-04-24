import { useState } from 'react';
import { X } from 'lucide-react';

const LS_KEY = 'stellaforge.hints.cameraDismissed';

export function CameraHint() {
  const [visible, setVisible] = useState(() => !localStorage.getItem(LS_KEY));

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(LS_KEY, '1');
    setVisible(false);
  };

  return (
    <div className="absolute bottom-4 right-4 bg-gray-900/90 backdrop-blur rounded-full px-4 py-2 flex items-center gap-3 border border-gray-700 text-xs text-gray-300 z-20">
      <span>Right-click drag to rotate</span>
      <span className="text-gray-600">·</span>
      <span>Scroll to zoom</span>
      <button
        onClick={dismiss}
        className="text-gray-500 hover:text-white ml-1"
        aria-label="Dismiss hint"
      >
        <X size={14} />
      </button>
    </div>
  );
}
