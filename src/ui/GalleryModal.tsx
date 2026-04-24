import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Search, Globe, Copy, Pencil, Trash2, Upload } from 'lucide-react';
import { usePlanetStore } from '@/store/usePlanetStore';
import type { PlanetSaveService, PlanetSaveListEntry } from '@/services/PlanetSaveService';

function relativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

interface GalleryModalProps {
  saveService: PlanetSaveService;
}

export function GalleryModal({ saveService }: GalleryModalProps) {
  const open = usePlanetStore((s) => s.galleryOpen);
  const setOpen = usePlanetStore((s) => s.setGalleryOpen);
  const hasUnsavedChanges = usePlanetStore((s) => s.hasUnsavedChanges);

  const [entries, setEntries] = useState<PlanetSaveListEntry[]>([]);
  const [filter, setFilter] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [loadConfirmId, setLoadConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrls = useRef<string[]>([]);

  // Load entries on open
  useEffect(() => {
    if (!open) return;
    refreshList();
    setTimeout(() => searchRef.current?.focus(), 100);
  }, [open]);

  // Revoke object URLs on unmount or refresh
  useEffect(() => {
    return () => {
      for (const url of objectUrls.current) URL.revokeObjectURL(url);
      objectUrls.current = [];
    };
  }, []);

  const refreshList = useCallback(async () => {
    for (const url of objectUrls.current) URL.revokeObjectURL(url);
    objectUrls.current = [];
    try {
      const list = await saveService.list();
      setEntries(list);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [saveService]);

  // Focus trap + Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (deleteConfirmId) { setDeleteConfirmId(null); return; }
        if (loadConfirmId) { setLoadConfirmId(null); return; }
        if (renamingId) { setRenamingId(null); return; }
        setOpen(false);
        return;
      }
      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, setOpen, deleteConfirmId, loadConfirmId, renamingId]);

  // ── Import logic ────────────────────────────────────────

  const handleImportFile = useCallback(async (file: File) => {
    if (importing) return;
    if (!file.name.endsWith('.stellaforge.json') && !file.name.endsWith('.json')) {
      setError('Please select a .stellaforge.json file');
      return;
    }
    setImporting(true);
    setError(null);
    try {
      const text = await file.text();
      const newId = await saveService.importFromJSON(text);
      await refreshList();
      // Find the imported entry to show name in toast
      const imported = (await saveService.list()).find((e) => e.id === newId);
      usePlanetStore.getState().showToast(`Imported "${imported?.name ?? 'planet'}"`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setImporting(false);
    }
  }, [saveService, refreshList, importing]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImportFile(file);
    // Reset input so the same file can be selected again
    e.target.value = '';
  }, [handleImportFile]);

  // Drag-and-drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      setDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only clear if we're leaving the modal container
    if (modalRef.current && !modalRef.current.contains(e.relatedTarget as Node)) {
      setDragOver(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleImportFile(file);
  }, [handleImportFile]);

  // ── Load / actions ──────────────────────────────────────

  const handleLoad = useCallback(async (id: string) => {
    if (hasUnsavedChanges && !loadConfirmId) {
      setLoadConfirmId(id);
      return;
    }
    try {
      const store = usePlanetStore.getState();
      store.setIsLoading(true);
      await saveService.load(id);
      const entry = entries.find((e) => e.id === id);
      store.setCurrentSave(id, entry?.name ?? null);
      store.markSaved();
      store.setIsLoading(false);
      setOpen(false);
      store.showToast('Planet loaded');
    } catch (e) {
      usePlanetStore.getState().setIsLoading(false);
      setError((e as Error).message);
    }
    setLoadConfirmId(null);
  }, [saveService, entries, hasUnsavedChanges, loadConfirmId, setOpen]);

  const handleDuplicate = useCallback(async (id: string, name: string) => {
    try {
      await saveService.duplicate(id, `${name} (copy)`);
      await refreshList();
    } catch (e) {
      setError((e as Error).message);
    }
  }, [saveService, refreshList]);

  const handleRenameSubmit = useCallback(async () => {
    if (!renamingId) return;
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed.length > 64) return;
    try {
      await saveService.rename(renamingId, trimmed);
      const store = usePlanetStore.getState();
      if (store.currentSaveId === renamingId) {
        store.setCurrentSave(renamingId, trimmed);
      }
      await refreshList();
    } catch (e) {
      setError((e as Error).message);
    }
    setRenamingId(null);
  }, [renamingId, renameValue, saveService, refreshList]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await saveService.delete(id);
      const store = usePlanetStore.getState();
      if (store.currentSaveId === id) {
        store.setCurrentSave(null, null);
      }
      await refreshList();
    } catch (e) {
      setError((e as Error).message);
    }
    setDeleteConfirmId(null);
  }, [saveService, refreshList]);

  const getThumbnailUrl = useCallback((blob: Blob | null): string | null => {
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    objectUrls.current.push(url);
    return url;
  }, []);

  if (!open) return null;

  const filtered = filter
    ? entries.filter((e) => e.name.toLowerCase().includes(filter.toLowerCase()))
    : entries;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Planet Gallery"
        className="bg-gray-900 border border-gray-700 rounded-xl flex flex-col relative"
        style={{ width: '80vw', height: '80vh', maxWidth: '1200px', maxHeight: '900px' }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-700 shrink-0">
          <h2 className="text-white font-semibold text-lg">My Planets</h2>
          <div className="flex-1" />

          {/* Import button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded transition-colors disabled:opacity-50"
            aria-label="Import planet"
          >
            <Upload size={14} />
            {importing ? 'Importing...' : 'Import'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.stellaforge.json"
            onChange={handleFileInputChange}
            className="hidden"
          />

          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              ref={searchRef}
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search..."
              className="bg-gray-800 text-white text-xs pl-8 pr-3 py-1.5 rounded border border-gray-600 w-48"
            />
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close gallery"
          >
            <X size={18} />
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mx-6 mt-3 px-3 py-2 bg-red-900/50 border border-red-700 rounded text-xs text-red-300 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-200">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-3">
              <Globe size={48} strokeWidth={1} />
              <p className="text-sm">
                {entries.length === 0
                  ? "No planets saved yet — sculpt something and hit Save!"
                  : "No planets match your search."}
              </p>
            </div>
          ) : (
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
              {filtered.map((entry) => (
                <PlanetCard
                  key={entry.id}
                  entry={entry}
                  thumbnailUrl={getThumbnailUrl(entry.thumbnail)}
                  isRenaming={renamingId === entry.id}
                  renameValue={renameValue}
                  onRenameChange={setRenameValue}
                  onRenameStart={() => { setRenamingId(entry.id); setRenameValue(entry.name); }}
                  onRenameSubmit={handleRenameSubmit}
                  onRenameCancel={() => setRenamingId(null)}
                  onLoad={() => handleLoad(entry.id)}
                  onDuplicate={() => handleDuplicate(entry.id, entry.name)}
                  onDeleteRequest={() => setDeleteConfirmId(entry.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Drag-and-drop overlay */}
        {dragOver && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-blue-900/40 border-2 border-dashed border-blue-400 rounded-xl pointer-events-none">
            <div className="flex flex-col items-center gap-2">
              <Upload size={48} className="text-blue-400" />
              <p className="text-blue-200 text-sm font-medium">Drop .stellaforge.json to import</p>
            </div>
          </div>
        )}

        {/* Delete confirmation dialog */}
        {deleteConfirmId && (
          <ConfirmDialog
            title="Delete Planet"
            message={`Delete "${entries.find((e) => e.id === deleteConfirmId)?.name}"? This can't be undone.`}
            confirmLabel="Delete"
            confirmClass="bg-red-600 hover:bg-red-500"
            onConfirm={() => handleDelete(deleteConfirmId)}
            onCancel={() => setDeleteConfirmId(null)}
          />
        )}

        {/* Load confirmation dialog (unsaved changes) */}
        {loadConfirmId && (
          <ConfirmDialog
            title="Unsaved Changes"
            message="You have unsaved changes. Load anyway?"
            confirmLabel="Load"
            confirmClass="bg-blue-600 hover:bg-blue-500"
            onConfirm={() => handleLoad(loadConfirmId)}
            onCancel={() => setLoadConfirmId(null)}
          />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Planet card
// ---------------------------------------------------------------------------

function PlanetCard({
  entry, thumbnailUrl, isRenaming, renameValue,
  onRenameChange, onRenameStart, onRenameSubmit, onRenameCancel,
  onLoad, onDuplicate, onDeleteRequest,
}: {
  entry: PlanetSaveListEntry;
  thumbnailUrl: string | null;
  isRenaming: boolean;
  renameValue: string;
  onRenameChange: (v: string) => void;
  onRenameStart: () => void;
  onRenameSubmit: () => void;
  onRenameCancel: () => void;
  onLoad: () => void;
  onDuplicate: () => void;
  onDeleteRequest: () => void;
}) {
  const renameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming) renameRef.current?.focus();
  }, [isRenaming]);

  return (
    <div className="group flex flex-col bg-gray-800 rounded-lg border border-gray-700 overflow-hidden hover:border-gray-500 transition-colors">
      {/* Thumbnail */}
      <div className="relative aspect-square cursor-pointer overflow-hidden" onClick={onLoad}>
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={entry.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          />
        ) : (
          <div className="w-full h-full bg-gray-700 flex items-center justify-center">
            <Globe size={32} className="text-gray-500" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onLoad(); }}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded font-medium transition-colors"
            aria-label={`Load ${entry.name}`}
          >
            Load
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
            className="p-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
            aria-label={`Duplicate ${entry.name}`}
          >
            <Copy size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onRenameStart(); }}
            className="p-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
            aria-label={`Rename ${entry.name}`}
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDeleteRequest(); }}
            className="p-1.5 bg-gray-700 hover:bg-red-600 text-gray-300 hover:text-white rounded transition-colors"
            aria-label={`Delete ${entry.name}`}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="px-3 py-2">
        {isRenaming ? (
          <input
            ref={renameRef}
            type="text"
            value={renameValue}
            onChange={(e) => onRenameChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onRenameSubmit();
              if (e.key === 'Escape') onRenameCancel();
            }}
            onBlur={onRenameSubmit}
            maxLength={64}
            className="w-full bg-gray-700 text-white text-xs px-2 py-1 rounded border border-blue-500 outline-none"
          />
        ) : (
          <p className="text-xs text-white truncate">{entry.name}</p>
        )}
        <p className="text-[10px] text-gray-500 mt-0.5">{relativeTime(entry.updatedAt)}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Confirm dialog
// ---------------------------------------------------------------------------

function ConfirmDialog({
  title, message, confirmLabel, confirmClass, onConfirm, onCancel,
}: {
  title: string; message: string; confirmLabel: string; confirmClass: string;
  onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="absolute inset-0 z-60 flex items-center justify-center bg-black/40 rounded-xl">
      <div className="bg-gray-800 border border-gray-600 rounded-lg p-5 w-80 flex flex-col gap-3">
        <h3 className="text-white font-semibold text-sm">{title}</h3>
        <p className="text-xs text-gray-300">{message}</p>
        <div className="flex justify-end gap-2 mt-1">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-3 py-1.5 text-xs text-white rounded font-medium transition-colors ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
