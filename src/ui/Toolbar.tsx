import { usePlanetStore, ToolType } from '@/store/usePlanetStore';
import { Mountain, Waves, Eraser, Paintbrush, Circle } from 'lucide-react';
import { useEffect } from 'react';

const tools: { type: ToolType; icon: typeof Mountain; label: string; key: string }[] = [
  { type: 'raise', icon: Mountain, label: 'Raise/Lower', key: '1' },
  { type: 'smooth', icon: Waves, label: 'Smooth', key: '2' },
  { type: 'flatten', icon: Eraser, label: 'Flatten', key: '3' },
  { type: 'biome', icon: Paintbrush, label: 'Paint Biome', key: '4' },
  { type: 'meteor', icon: Circle, label: 'Meteor', key: '5' },
];

export function Toolbar() {
  const activeTool = usePlanetStore((s) => s.toolState.activeTool);
  const setToolState = usePlanetStore((s) => s.setToolState);
  const brushRadius = usePlanetStore((s) => s.toolState.brushRadius);
  const brushStrength = usePlanetStore((s) => s.toolState.brushStrength);
  const brushFalloff = usePlanetStore((s) => s.toolState.brushFalloff);
  const biomes = usePlanetStore((s) => s.biomes);
  const meteorCraterBiomeId = usePlanetStore((s) => s.meteorCraterBiomeId);
  const setMeteorCraterBiomeId = usePlanetStore((s) => s.setMeteorCraterBiomeId);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tool = tools.find((t) => t.key === e.key);
      if (tool) setToolState({ activeTool: tool.type });
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setToolState]);

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-gray-900/90 backdrop-blur rounded-lg p-3 flex items-center gap-2 border border-gray-700">
      {tools.map(({ type, icon: Icon, label, key }) => (
        <button
          key={type}
          onClick={() => setToolState({ activeTool: type })}
          className={`p-2 rounded transition-colors ${
            activeTool === type
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-white hover:bg-gray-700'
          }`}
          title={`${label} (${key})`}
          aria-label={label}
        >
          <Icon size={18} />
        </button>
      ))}
      <div className="w-px h-6 bg-gray-600 mx-1" />
      <label className="flex flex-col items-center gap-0.5">
        <span className="text-[10px] text-gray-400">Size</span>
        <input
          type="range"
          min={0.05}
          max={0.5}
          step={0.01}
          value={brushRadius}
          onChange={(e) => setToolState({ brushRadius: parseFloat(e.target.value) })}
          className="w-16 accent-blue-500"
        />
      </label>
      <label className="flex flex-col items-center gap-0.5">
        <span className="text-[10px] text-gray-400">Strength</span>
        <input
          type="range"
          min={0.005}
          max={0.1}
          step={0.005}
          value={brushStrength}
          onChange={(e) => setToolState({ brushStrength: parseFloat(e.target.value) })}
          className="w-16 accent-blue-500"
        />
      </label>
      <label className="flex flex-col items-center gap-0.5" title="0 = hard edge, 1 = soft gradient">
        <span className="text-[10px] text-gray-400">Falloff</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={brushFalloff}
          onChange={(e) => setToolState({ brushFalloff: parseFloat(e.target.value) })}
          className="w-16 accent-blue-500"
        />
      </label>
      {activeTool === 'meteor' && (
        <>
          <div className="w-px h-6 bg-gray-600 mx-1" />
          <label className="flex flex-col items-center gap-0.5">
            <span className="text-[10px] text-gray-400">Crater Biome</span>
            <select
              value={meteorCraterBiomeId ?? 'selected'}
              onChange={(e) => {
                const val = e.target.value;
                setMeteorCraterBiomeId(val === 'selected' ? null : parseInt(val));
              }}
              className="bg-gray-800 text-gray-300 text-[10px] px-1 py-0.5 rounded border border-gray-600"
            >
              <option value="selected">Use selected</option>
              {biomes.map((b, i) => (
                <option key={i} value={i}>{b.name}</option>
              ))}
            </select>
          </label>
        </>
      )}
    </div>
  );
}
