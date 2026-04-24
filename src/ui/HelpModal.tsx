import { X } from 'lucide-react';

interface HelpModalProps {
  open: boolean;
  onClose: () => void;
}

const shortcuts = [
  { keys: '1-5', desc: 'Select tools' },
  { keys: 'Escape', desc: 'Deselect tool / Close modal' },
  { keys: 'Click + Drag', desc: 'Use active tool' },
  { keys: 'Shift + Click', desc: 'Lower terrain (Raise tool)' },
  { keys: 'Left Drag (off planet)', desc: 'Orbit camera' },
  { keys: 'Scroll', desc: 'Zoom' },
  { keys: 'Ctrl/Cmd + Z', desc: 'Undo' },
  { keys: 'Ctrl/Cmd + Shift + Z', desc: 'Redo' },
  { keys: 'Ctrl/Cmd + S', desc: 'Save planet' },
  { keys: 'G', desc: 'Open gallery' },
  { keys: 'Ctrl/Cmd + E', desc: 'Export PNG' },
  { keys: '~', desc: 'Toggle FPS counter' },
];

export function HelpModal({ open, onClose }: HelpModalProps) {
  if (!open) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-[420px] max-h-[80vh] overflow-y-auto flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-semibold">Help</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Keyboard Shortcuts */}
        <section>
          <h3 className="text-xs text-gray-400 uppercase tracking-wider mb-2">Keyboard Shortcuts</h3>
          <div className="flex flex-col gap-2">
            {shortcuts.map(({ keys, desc }) => (
              <div key={keys} className="flex items-center justify-between">
                <kbd className="text-xs bg-gray-800 px-2 py-1 rounded text-gray-300 border border-gray-600 font-mono">{keys}</kbd>
                <span className="text-xs text-gray-400">{desc}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Save & Gallery */}
        <section>
          <h3 className="text-xs text-gray-400 uppercase tracking-wider mb-2">Save & Gallery</h3>
          <div className="flex flex-col gap-1.5 text-xs text-gray-300 leading-relaxed">
            <p>Planets are saved to your browser's IndexedDB storage. Each save includes the full heightmap, biome data, all configuration, and a thumbnail preview.</p>
            <p>Open the <strong className="text-white">Gallery</strong> (<kbd className="bg-gray-800 px-1 rounded border border-gray-600 font-mono">G</kbd>) to browse, load, rename, duplicate, or delete saves.</p>
            <p>Use the <strong className="text-white">Import</strong> button in the Gallery to load a <code className="bg-gray-800 px-1 rounded text-blue-300">.stellaforge.json</code> file, or drag-and-drop the file anywhere onto the app.</p>
          </div>
        </section>

        {/* Exporting */}
        <section>
          <h3 className="text-xs text-gray-400 uppercase tracking-wider mb-2">Exporting Your Planet</h3>
          <div className="flex flex-col gap-1.5 text-xs text-gray-300 leading-relaxed">
            <p>Press <kbd className="bg-gray-800 px-1 rounded border border-gray-600 font-mono">Ctrl/Cmd + E</kbd> or click the Export button to open the Export dialog.</p>
            <p><strong className="text-white">PNG Image</strong> — Render at 1024, 2048, or 4096 pixels with optional transparency and starfield.</p>
            <p><strong className="text-white">3D Model (GLB)</strong> — Export a binary glTF file with baked terrain geometry and vertex colors. Optionally include ocean, clouds, rings, and moons. Note: shader-based effects (atmosphere glow, ocean waves, cloud animation) are not included.</p>
            <p><strong className="text-white">JSON</strong> — Export as a portable <code className="bg-gray-800 px-1 rounded text-blue-300">.stellaforge.json</code> file for sharing or backup. Includes all terrain data, biome data, and configuration. Can be imported on any device.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
