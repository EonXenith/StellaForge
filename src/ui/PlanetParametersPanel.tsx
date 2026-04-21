import { useState, useCallback, useRef } from 'react';
import { usePlanetStore } from '@/store/usePlanetStore';
import { flattenAdjacency, ErosionResult, ErosionProgress } from '@/planet/Erosion';
import ErosionWorker from '@/workers/erosion.worker?worker';

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-gray-300 flex justify-between">
        <span>{label}</span>
        <span>{value.toFixed(step < 0.1 ? 2 : 1)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-blue-500"
      />
    </label>
  );
}

interface PlanetParametersPanelProps {
  onErode?: (
    heightmapCopy: Float32Array,
    callback: (result: { heightmap: Float32Array; deltaIndices: Uint32Array; deltaOldValues: Float32Array; deltaNewValues: Float32Array }) => void,
    onProgress: (percent: number) => void
  ) => void;
}

export function PlanetParametersPanel() {
  const params = usePlanetStore((s) => s.terrainParams);
  const setParams = usePlanetStore((s) => s.setTerrainParams);
  const erosionParams = usePlanetStore((s) => s.erosionParams);
  const setErosionParams = usePlanetStore((s) => s.setErosionParams);
  const [eroding, setEroding] = useState(false);
  const [erosionProgress, setErosionProgress] = useState(0);
  const workerRef = useRef<Worker | null>(null);

  const handleErode = useCallback(() => {
    // Access planetData from the global SceneManager ref via a custom event
    const event = new CustomEvent('stellaforge-erode');
    window.dispatchEvent(event);
  }, []);

  return (
    <div className="absolute top-16 left-4 w-64 bg-gray-900/90 backdrop-blur rounded-lg p-4 flex flex-col gap-3 border border-gray-700">
      <h2 className="text-sm font-semibold text-white">Terrain</h2>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-gray-300">Seed</span>
        <input
          type="text"
          value={params.seed}
          onChange={(e) => setParams({ seed: e.target.value })}
          className="bg-gray-800 text-white text-xs px-2 py-1 rounded border border-gray-600"
        />
      </label>

      <Slider label="Height Scale" value={params.heightScale} min={0.01} max={0.5} step={0.01} onChange={(v) => setParams({ heightScale: v })} />
      <Slider label="Octaves" value={params.octaves} min={1} max={10} step={1} onChange={(v) => setParams({ octaves: v })} />
      <Slider label="Lacunarity" value={params.lacunarity} min={1} max={4} step={0.1} onChange={(v) => setParams({ lacunarity: v })} />
      <Slider label="Persistence" value={params.persistence} min={0.1} max={1} step={0.05} onChange={(v) => setParams({ persistence: v })} />
      <Slider label="Amplitude" value={params.amplitude} min={0.1} max={3} step={0.1} onChange={(v) => setParams({ amplitude: v })} />
      <Slider label="Ridge Weight" value={params.ridgeWeight} min={0} max={1} step={0.05} onChange={(v) => setParams({ ridgeWeight: v })} />

      <div className="w-full h-px bg-gray-700" />
      <h3 className="text-xs font-semibold text-gray-300">Erosion</h3>
      <Slider label="Iterations" value={erosionParams.iterations} min={1000} max={200000} step={1000} onChange={(v) => setErosionParams({ iterations: v })} />
      <Slider label="Sediment Cap" value={erosionParams.sedimentCapacity} min={0.5} max={10} step={0.5} onChange={(v) => setErosionParams({ sedimentCapacity: v })} />
      <Slider label="Deposition" value={erosionParams.depositionRate} min={0.05} max={1} step={0.05} onChange={(v) => setErosionParams({ depositionRate: v })} />
      <Slider label="Evaporation" value={erosionParams.evaporationRate} min={0.001} max={0.1} step={0.001} onChange={(v) => setErosionParams({ evaporationRate: v })} />

      <button
        onClick={handleErode}
        disabled={eroding}
        className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
          eroding
            ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
            : 'bg-orange-600 hover:bg-orange-500 text-white'
        }`}
      >
        {eroding ? `Eroding... ${erosionProgress.toFixed(0)}%` : 'Erode Terrain'}
      </button>
    </div>
  );
}
