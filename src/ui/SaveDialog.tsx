import { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { usePlanetStore } from '@/store/usePlanetStore';
import type { PlanetSaveService } from '@/services/PlanetSaveService';

interface SaveDialogProps {
  saveService: PlanetSaveService;
}

export function SaveDialog({ saveService }: SaveDialogProps) {
  const open = usePlanetStore((s) => s.saveDialogOpen);
  const setOpen = usePlanetStore((s) => s.setSaveDialogOpen);
  const currentSaveId = usePlanetStore((s) => s.currentSaveId);
  const currentSaveName = usePlanetStore((s) => s.currentSaveName);

  const [name, setName] = useState('');
  const [saveAsNew, setSaveAsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state on open
  useEffect(() => {
    if (open) {
      setName(currentSaveName ?? 'My Planet');
      setSaveAsNew(false);
      setSaving(false);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [open, currentSaveName]);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, setOpen]);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 64 || saving) return;

    setSaving(true);
    try {
      const id = saveAsNew || !currentSaveId
        ? await saveService.save(trimmed)
        : await saveService.save(trimmed, currentSaveId);

      const store = usePlanetStore.getState();
      store.setCurrentSave(id, trimmed);
      store.markSaved();
      store.showToast('Planet saved');
      setOpen(false);
    } catch (e) {
      usePlanetStore.getState().showToast(`Save failed: ${(e as Error).message}`);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const isOverwrite = !!currentSaveId && !saveAsNew;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 w-80 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-semibold text-sm">Save Planet</h2>
          <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-[10px] text-gray-400">Name</span>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
            maxLength={64}
            className="bg-gray-800 text-white text-xs px-3 py-2 rounded border border-gray-600"
          />
        </label>

        {currentSaveId && (
          <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={saveAsNew}
              onChange={(e) => setSaveAsNew(e.target.checked)}
              className="accent-blue-500"
            />
            Save as new planet
          </label>
        )}

        <div className="flex justify-end gap-2 mt-1">
          <button
            onClick={() => setOpen(false)}
            className="px-3 py-1.5 text-xs text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className={`px-4 py-1.5 text-xs text-white rounded font-medium transition-colors ${
              saving || !name.trim()
                ? 'bg-gray-700 cursor-not-allowed text-gray-400'
                : 'bg-blue-600 hover:bg-blue-500'
            }`}
          >
            {saving ? 'Saving...' : isOverwrite ? 'Overwrite' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
