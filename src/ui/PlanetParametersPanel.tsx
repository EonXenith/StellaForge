import { usePlanetStore } from '@/store/usePlanetStore';

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

export function PlanetParametersPanel() {
  const params = usePlanetStore((s) => s.terrainParams);
  const setParams = usePlanetStore((s) => s.setTerrainParams);

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
    </div>
  );
}
