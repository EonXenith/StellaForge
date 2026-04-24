import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Loader2, AlertTriangle, FileText } from 'lucide-react';
import { usePlanetStore } from '@/store/usePlanetStore';
import type { ExportService } from '@/services/ExportService';
import type { ThumbnailService } from '@/services/ThumbnailService';

interface ExportModalProps {
  exportService: ExportService;
  thumbnailService: ThumbnailService | null;
}

type ExportTab = 'png' | 'glb' | 'json';

const RESOLUTIONS = [1024, 2048, 4096] as const;

export function ExportModal({ exportService, thumbnailService }: ExportModalProps) {
  const open = usePlanetStore((s) => s.exportModalOpen);
  const setOpen = usePlanetStore((s) => s.setExportModalOpen);
  const currentSaveName = usePlanetStore((s) => s.currentSaveName);
  const showToast = usePlanetStore((s) => s.showToast);

  const [tab, setTab] = useState<ExportTab>('png');
  const [exporting, setExporting] = useState(false);

  // PNG options
  const [resolution, setResolution] = useState<number>(2048);
  const [transparent, setTransparent] = useState(false);
  const [includeStarfield, setIncludeStarfield] = useState(true);

  // GLB options
  const [includeOcean, setIncludeOcean] = useState(false);
  const [includeClouds, setIncludeClouds] = useState(false);
  const [includeRings, setIncludeRings] = useState(false);
  const [includeMoons, setIncludeMoons] = useState(true);
  const [bakeVertexColors, setBakeVertexColors] = useState(true);

  // JSON options
  const [includeThumbnail, setIncludeThumbnail] = useState(true);
  const [jsonSizeHint, setJsonSizeHint] = useState<string | null>(null);

  // PNG live preview
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const previewUrlRef = useRef<string | null>(null);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, setOpen]);

  // Cleanup preview URL on close
  useEffect(() => {
    if (!open && previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
      setPreviewUrl(null);
    }
  }, [open]);

  // Estimate JSON size when JSON tab is active
  useEffect(() => {
    if (!open || tab !== 'json') return;
    // Rough estimate: 40962 * 4 bytes heights → ~218KB base64, biomes → ~55KB, config ~5KB, thumbnail ~350KB
    const heightsB64 = Math.ceil((40962 * 4) / 3) * 4;
    const biomesB64 = Math.ceil(40962 / 3) * 4;
    const thumbEstimate = includeThumbnail ? 350_000 : 0;
    const configEstimate = 5_000;
    const total = heightsB64 + biomesB64 + thumbEstimate + configEstimate;
    if (total < 1024) {
      setJsonSizeHint(`~${total} B`);
    } else if (total < 1024 * 1024) {
      setJsonSizeHint(`~${(total / 1024).toFixed(0)} KB`);
    } else {
      setJsonSizeHint(`~${(total / (1024 * 1024)).toFixed(1)} MB`);
    }
  }, [open, tab, includeThumbnail]);

  // Generate PNG preview when settings change
  const generatePreview = useCallback(async () => {
    if (!open || tab !== 'png') return;
    setPreviewLoading(true);
    try {
      const blob = await exportService.exportPNG({
        size: 400,
        transparent,
        includeStarfield: transparent ? false : includeStarfield,
      });
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
      const url = URL.createObjectURL(blob);
      previewUrlRef.current = url;
      setPreviewUrl(url);
    } catch {
      // Preview failure is non-critical
    } finally {
      setPreviewLoading(false);
    }
  }, [open, tab, transparent, includeStarfield, exportService]);

  useEffect(() => {
    generatePreview();
  }, [generatePreview]);

  const handleExportPNG = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      await exportService.downloadPNG(
        { size: resolution, transparent, includeStarfield: transparent ? false : includeStarfield },
        currentSaveName,
      );
      showToast(`Exported ${resolution}\u00D7${resolution} PNG`);
    } catch (e) {
      showToast((e as Error).message);
    } finally {
      setExporting(false);
    }
  };

  const handleExportGLB = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      await exportService.downloadGLB(
        { includeOcean, includeClouds, includeRings, includeMoons, bakeVertexColors },
        currentSaveName,
      );
      showToast('Exported GLB model');
    } catch (e) {
      showToast((e as Error).message);
    } finally {
      setExporting(false);
    }
  };

  const handleExportJSON = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      await exportService.downloadJSON(
        { includeThumbnail },
        currentSaveName,
        includeThumbnail ? thumbnailService : null,
      );
      showToast('Exported planet file');
    } catch (e) {
      showToast((e as Error).message);
    } finally {
      setExporting(false);
    }
  };

  if (!open) return null;

  const effectiveStarfield = transparent ? false : includeStarfield;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60">
      <div
        className="bg-gray-900 border border-gray-700 rounded-xl p-5 w-[420px] flex flex-col gap-4"
        role="dialog"
        aria-label="Export"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-white font-semibold text-sm">Export</h2>
          <button
            onClick={() => setOpen(false)}
            className="text-gray-400 hover:text-white"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 bg-gray-800 rounded-lg p-0.5">
          {(['png', 'glb', 'json'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-1.5 text-xs rounded-md transition-colors ${
                tab === t
                  ? 'bg-gray-700 text-white font-medium'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {t === 'png' ? 'PNG Image' : t === 'glb' ? '3D Model' : 'JSON'}
            </button>
          ))}
        </div>

        {tab === 'png' && (
          <PNGTab
            previewUrl={previewUrl}
            previewLoading={previewLoading}
            transparent={transparent}
            resolution={resolution}
            effectiveStarfield={effectiveStarfield}
            exporting={exporting}
            onResolutionChange={setResolution}
            onTransparentChange={setTransparent}
            onStarfieldChange={setIncludeStarfield}
            onExport={handleExportPNG}
            onClose={() => setOpen(false)}
          />
        )}
        {tab === 'glb' && (
          <GLBTab
            includeOcean={includeOcean}
            includeClouds={includeClouds}
            includeRings={includeRings}
            includeMoons={includeMoons}
            bakeVertexColors={bakeVertexColors}
            exporting={exporting}
            onOceanChange={setIncludeOcean}
            onCloudsChange={setIncludeClouds}
            onRingsChange={setIncludeRings}
            onMoonsChange={setIncludeMoons}
            onVertexColorsChange={setBakeVertexColors}
            onExport={handleExportGLB}
            onClose={() => setOpen(false)}
          />
        )}
        {tab === 'json' && (
          <JSONTab
            includeThumbnail={includeThumbnail}
            sizeHint={jsonSizeHint}
            exporting={exporting}
            onThumbnailChange={setIncludeThumbnail}
            onExport={handleExportJSON}
            onClose={() => setOpen(false)}
          />
        )}
      </div>
    </div>
  );
}

// ── PNG Tab ────────────────────────────────────────────────

function PNGTab({
  previewUrl, previewLoading, transparent, resolution, effectiveStarfield, exporting,
  onResolutionChange, onTransparentChange, onStarfieldChange, onExport, onClose,
}: {
  previewUrl: string | null; previewLoading: boolean; transparent: boolean;
  resolution: number; effectiveStarfield: boolean; exporting: boolean;
  onResolutionChange: (v: number) => void; onTransparentChange: (v: boolean) => void;
  onStarfieldChange: (v: boolean) => void; onExport: () => void; onClose: () => void;
}) {
  return (
    <>
      <div className="relative w-full aspect-square bg-gray-800 rounded-lg overflow-hidden border border-gray-700 flex items-center justify-center">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Export preview"
            className="w-full h-full object-contain"
            style={transparent ? { backgroundImage: 'repeating-conic-gradient(#333 0% 25%, #222 0% 50%)', backgroundSize: '20px 20px' } : undefined}
          />
        ) : previewLoading ? (
          <Loader2 size={24} className="text-gray-500 animate-spin" />
        ) : (
          <span className="text-gray-500 text-xs">Generating preview...</span>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] text-gray-400 uppercase tracking-wider">Resolution</span>
        <div className="flex gap-2">
          {RESOLUTIONS.map((res) => (
            <button
              key={res}
              onClick={() => onResolutionChange(res)}
              className={`flex-1 py-1.5 text-xs rounded border transition-colors ${
                resolution === res
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-gray-800 border-gray-600 text-gray-300 hover:border-gray-500'
              }`}
            >
              {res}&times;{res}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Checkbox checked={transparent} onChange={onTransparentChange} label="Transparent background" />
        <Checkbox
          checked={effectiveStarfield}
          onChange={onStarfieldChange}
          label="Include starfield"
          disabled={transparent}
        />
      </div>

      <ExportActions exporting={exporting} label="Export PNG" onExport={onExport} onClose={onClose} />
    </>
  );
}

// ── GLB Tab ────────────────────────────────────────────────

function GLBTab({
  includeOcean, includeClouds, includeRings, includeMoons, bakeVertexColors, exporting,
  onOceanChange, onCloudsChange, onRingsChange, onMoonsChange, onVertexColorsChange, onExport, onClose,
}: {
  includeOcean: boolean; includeClouds: boolean; includeRings: boolean;
  includeMoons: boolean; bakeVertexColors: boolean; exporting: boolean;
  onOceanChange: (v: boolean) => void; onCloudsChange: (v: boolean) => void;
  onRingsChange: (v: boolean) => void; onMoonsChange: (v: boolean) => void;
  onVertexColorsChange: (v: boolean) => void; onExport: () => void; onClose: () => void;
}) {
  return (
    <>
      <div className="flex gap-2 p-2.5 bg-yellow-900/30 border border-yellow-700/50 rounded-lg">
        <AlertTriangle size={14} className="text-yellow-500 flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-yellow-200/80 leading-relaxed">
          Some visual effects (ocean waves, cloud movement, atmosphere glow) are shader-only and won't appear in the exported model.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] text-gray-400 uppercase tracking-wider">Include</span>
        <div className="flex flex-col gap-2">
          <Checkbox checked={bakeVertexColors} onChange={onVertexColorsChange} label="Vertex colors (biomes)" />
          <Checkbox checked={includeOcean} onChange={onOceanChange} label="Ocean (static sphere)" />
          <Checkbox checked={includeClouds} onChange={onCloudsChange} label="Clouds (static sphere)" />
          <Checkbox checked={includeRings} onChange={onRingsChange} label="Rings" />
          <Checkbox checked={includeMoons} onChange={onMoonsChange} label="Moons" />
        </div>
      </div>

      <ExportActions exporting={exporting} label="Export GLB" onExport={onExport} onClose={onClose} />
    </>
  );
}

// ── JSON Tab ───────────────────────────────────────────────

function JSONTab({
  includeThumbnail, sizeHint, exporting,
  onThumbnailChange, onExport, onClose,
}: {
  includeThumbnail: boolean; sizeHint: string | null; exporting: boolean;
  onThumbnailChange: (v: boolean) => void; onExport: () => void; onClose: () => void;
}) {
  return (
    <>
      <div className="flex gap-2 p-2.5 bg-blue-900/20 border border-blue-700/40 rounded-lg">
        <FileText size={14} className="text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-blue-200/80 leading-relaxed">
          Export as a <code className="bg-gray-800 px-1 rounded text-blue-300">.stellaforge.json</code> file for sharing or backup. Import this file on any device to restore the planet.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Checkbox checked={includeThumbnail} onChange={onThumbnailChange} label="Include thumbnail preview" />
      </div>

      {sizeHint && (
        <p className="text-[10px] text-gray-500">Estimated file size: {sizeHint}</p>
      )}

      <ExportActions exporting={exporting} label="Export JSON" onExport={onExport} onClose={onClose} />
    </>
  );
}

// ── Shared components ──────────────────────────────────────

function Checkbox({
  checked, onChange, label, disabled,
}: {
  checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean;
}) {
  return (
    <label className={`flex items-center gap-2 text-xs cursor-pointer ${disabled ? 'text-gray-600' : 'text-gray-300'}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="accent-blue-500"
      />
      {label}
    </label>
  );
}

function ExportActions({
  exporting, label, onExport, onClose,
}: {
  exporting: boolean; label: string; onExport: () => void; onClose: () => void;
}) {
  return (
    <div className="flex justify-end gap-2 mt-1">
      <button
        onClick={onClose}
        className="px-3 py-1.5 text-xs text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 rounded transition-colors"
      >
        Close
      </button>
      <button
        onClick={onExport}
        disabled={exporting}
        className={`px-4 py-1.5 text-xs text-white rounded font-medium transition-colors flex items-center gap-1.5 ${
          exporting
            ? 'bg-gray-700 cursor-not-allowed text-gray-400'
            : 'bg-blue-600 hover:bg-blue-500'
        }`}
      >
        {exporting && <Loader2 size={12} className="animate-spin" />}
        {exporting ? 'Exporting...' : label}
      </button>
    </div>
  );
}
