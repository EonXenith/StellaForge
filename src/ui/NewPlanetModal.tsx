import { useState } from 'react';
import { X } from 'lucide-react';
import { TEMPLATES } from '@/templates/presets';

interface NewPlanetModalProps {
  open: boolean;
  onClose: () => void;
  onApply: (templateIndex: number, seed: string) => void;
}

export function NewPlanetModal({ open, onClose, onApply }: NewPlanetModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState(0);
  const [seed, setSeed] = useState('');

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-96 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-semibold">New Planet</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-300">Seed (leave blank for random)</span>
          <input
            type="text"
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            placeholder="random"
            className="bg-gray-800 text-white text-sm px-3 py-2 rounded border border-gray-600"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-300">Template</span>
          <select
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(parseInt(e.target.value))}
            className="bg-gray-800 text-white text-sm px-3 py-2 rounded border border-gray-600"
          >
            {TEMPLATES.map((t, i) => (
              <option key={i} value={i}>{t.name}</option>
            ))}
          </select>
        </label>

        <button
          onClick={() => {
            const finalSeed = seed || Math.random().toString(36).substring(2);
            onApply(selectedTemplate, finalSeed);
            onClose();
          }}
          className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-medium transition-colors"
        >
          Create
        </button>
      </div>
    </div>
  );
}
