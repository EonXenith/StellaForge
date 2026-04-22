import { useState, useCallback, useRef, useEffect } from 'react';
import { usePlanetStore } from '@/store/usePlanetStore';
import { TEMPLATES } from '@/templates/presets';
import { Section, Slider } from './shared';

export function PlanetParametersPanel() {
  const params = usePlanetStore((s) => s.terrainParams);
  const setParams = usePlanetStore((s) => s.setTerrainParams);
  const setBiomes = usePlanetStore((s) => s.setBiomes);
  const erosionParams = usePlanetStore((s) => s.erosionParams);
  const setErosionParams = usePlanetStore((s) => s.setErosionParams);
  const [eroding, setEroding] = useState(false);
  const [erosionProgress, setErosionProgress] = useState(0);

  // Debounced terrain param updates
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const debouncedSetParams = useCallback(
    (update: Partial<typeof params>) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setParams(update), 150);
    },
    [setParams],
  );
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const handleErode = useCallback(() => {
    window.dispatchEvent(new CustomEvent('stellaforge-erode'));
  }, []);

  const applyPreset = useCallback(
    (index: number) => {
      const t = TEMPLATES[index];
      setParams({ ...t.terrain });
      setBiomes(t.biomes);
    },
    [setParams, setBiomes],
  );

  return (
    <div className="absolute top-16 left-4 w-64 bg-gray-900/90 backdrop-blur rounded-lg p-4 flex flex-col gap-2 border border-gray-700 max-h-[calc(100vh-6rem)] overflow-y-auto">
      <h2 className="text-sm font-semibold text-white">Terrain</h2>

      {/* Quick presets */}
      <div className="flex flex-wrap gap-1">
        {TEMPLATES.map((t, i) => (
          <button
            key={t.name}
            onClick={() => applyPreset(i)}
            className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors border border-gray-700"
          >
            {t.name}
          </button>
        ))}
      </div>

      <div className="w-full h-px bg-gray-700" />

      {/* Terrain Shape */}
      <Section title="Shape" defaultOpen>
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] text-gray-400">Seed</span>
          <input
            type="text"
            value={params.seed}
            onChange={(e) => debouncedSetParams({ seed: e.target.value })}
            className="bg-gray-800 text-white text-xs px-2 py-1 rounded border border-gray-600"
          />
        </label>

        <Slider
          label="Height Scale"
          value={params.heightScale}
          min={0.01} max={0.5} step={0.01}
          onChange={(v) => debouncedSetParams({ heightScale: v })}
          tooltip="Overall height of terrain features. Higher = taller mountains and deeper valleys."
        />
        <Slider
          label="Octaves"
          value={params.octaves}
          min={1} max={10} step={1}
          onChange={(v) => debouncedSetParams({ octaves: v })}
          tooltip="Number of noise layers. More = finer detail but slower generation."
        />
        <Slider
          label="Lacunarity"
          value={params.lacunarity}
          min={1} max={4} step={0.1}
          onChange={(v) => debouncedSetParams({ lacunarity: v })}
          tooltip="How quickly frequency increases per octave. Higher = more fine detail."
        />
        <Slider
          label="Persistence"
          value={params.persistence}
          min={0.1} max={1} step={0.05}
          onChange={(v) => debouncedSetParams({ persistence: v })}
          tooltip="How quickly amplitude decreases per octave. Lower = smoother terrain."
        />
        <Slider
          label="Amplitude"
          value={params.amplitude}
          min={0.1} max={3} step={0.1}
          onChange={(v) => debouncedSetParams({ amplitude: v })}
          tooltip="Base strength of the noise. Multiplied with height scale."
        />
        <Slider
          label="Ridge Weight"
          value={params.ridgeWeight}
          min={0} max={1} step={0.05}
          onChange={(v) => debouncedSetParams({ ridgeWeight: v })}
          tooltip="Blend between smooth noise (0) and sharp ridged mountains (1)."
        />
      </Section>

      <div className="w-full h-px bg-gray-700" />

      {/* Erosion */}
      <Section title="Erosion">
        <Slider
          label="Erosion Strength"
          value={erosionParams.iterations}
          min={1000} max={100000} step={1000}
          onChange={(v) => setErosionParams({ iterations: v })}
          tooltip="Number of water droplets simulated. Higher = more weathered terrain."
        />
        <Slider
          label="Sediment Capacity"
          value={erosionParams.sedimentCapacity}
          min={1} max={8} step={0.5}
          onChange={(v) => setErosionParams({ sedimentCapacity: v })}
          tooltip="How much material water can carry. Higher = deeper carved valleys."
        />
        <Slider
          label="Deposition"
          value={erosionParams.depositionRate}
          min={0.05} max={1} step={0.05}
          onChange={(v) => setErosionParams({ depositionRate: v })}
          tooltip="Rate at which carried sediment is deposited. Higher = more sediment build-up."
        />
        <Slider
          label="Evaporation"
          value={erosionParams.evaporationRate}
          min={0.001} max={0.1} step={0.001}
          onChange={(v) => setErosionParams({ evaporationRate: v })}
          tooltip="How quickly water evaporates. Higher = shorter erosion paths."
        />

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
      </Section>
    </div>
  );
}
