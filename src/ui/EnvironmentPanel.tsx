import { usePlanetStore } from '@/store/usePlanetStore';

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between">
      <span className="text-xs text-gray-300">{label}</span>
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} className="accent-blue-500" />
    </label>
  );
}

function Slider({ label, value, min, max, step, onChange }: {
  label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-[10px] text-gray-400 flex justify-between">
        <span>{label}</span><span>{value.toFixed(step < 0.01 ? 3 : 2)}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))} className="w-full accent-blue-500" />
    </label>
  );
}

export function EnvironmentPanel() {
  const ocean = usePlanetStore((s) => s.oceanParams);
  const setOcean = usePlanetStore((s) => s.setOceanParams);
  const clouds = usePlanetStore((s) => s.cloudParams);
  const setClouds = usePlanetStore((s) => s.setCloudParams);
  const rings = usePlanetStore((s) => s.ringParams);
  const setRings = usePlanetStore((s) => s.setRingParams);
  const dayNight = usePlanetStore((s) => s.dayNightParams);
  const setDayNight = usePlanetStore((s) => s.setDayNightParams);
  const moons = usePlanetStore((s) => s.moons);
  const addMoon = usePlanetStore((s) => s.addMoon);
  const removeMoon = usePlanetStore((s) => s.removeMoon);
  const updateMoon = usePlanetStore((s) => s.updateMoon);

  return (
    <div className="absolute top-16 left-[calc(16rem+2rem)] w-56 bg-gray-900/90 backdrop-blur rounded-lg p-4 flex flex-col gap-3 border border-gray-700 max-h-[calc(100vh-6rem)] overflow-y-auto">
      <h2 className="text-sm font-semibold text-white">Environment</h2>

      {/* Ocean */}
      <div className="flex flex-col gap-1.5">
        <Toggle label="Ocean" value={ocean.enabled} onChange={(v) => setOcean({ enabled: v })} />
        {ocean.enabled && (
          <>
            <Slider label="Sea Level" value={ocean.seaLevel} min={-0.5} max={0.5} step={0.01} onChange={(v) => setOcean({ seaLevel: v })} />
            <Slider label="Wave Speed" value={ocean.waveSpeed} min={0} max={0.5} step={0.01} onChange={(v) => setOcean({ waveSpeed: v })} />
            <Slider label="Wave Height" value={ocean.waveAmplitude} min={0} max={0.02} step={0.001} onChange={(v) => setOcean({ waveAmplitude: v })} />
          </>
        )}
      </div>

      <div className="w-full h-px bg-gray-700" />

      {/* Clouds */}
      <div className="flex flex-col gap-1.5">
        <Toggle label="Clouds" value={clouds.enabled} onChange={(v) => setClouds({ enabled: v })} />
        {clouds.enabled && (
          <>
            <Slider label="Density" value={clouds.density} min={0} max={1} step={0.01} onChange={(v) => setClouds({ density: v })} />
            <Slider label="Rotation" value={clouds.rotationSpeed} min={0} max={0.1} step={0.005} onChange={(v) => setClouds({ rotationSpeed: v })} />
            <Slider label="Altitude" value={clouds.altitude} min={0.01} max={0.1} step={0.005} onChange={(v) => setClouds({ altitude: v })} />
          </>
        )}
      </div>

      <div className="w-full h-px bg-gray-700" />

      {/* Rings */}
      <div className="flex flex-col gap-1.5">
        <Toggle label="Rings" value={rings.enabled} onChange={(v) => setRings({ enabled: v })} />
        {rings.enabled && (
          <>
            <Slider label="Inner Radius" value={rings.innerRadius} min={1.1} max={1.8} step={0.05} onChange={(v) => setRings({ innerRadius: v })} />
            <Slider label="Outer Radius" value={rings.outerRadius} min={1.5} max={3.0} step={0.05} onChange={(v) => setRings({ outerRadius: v })} />
            <Slider label="Tilt" value={rings.tilt} min={0} max={1.5} step={0.05} onChange={(v) => setRings({ tilt: v })} />
            <Slider label="Opacity" value={rings.opacity} min={0} max={1} step={0.05} onChange={(v) => setRings({ opacity: v })} />
          </>
        )}
      </div>

      <div className="w-full h-px bg-gray-700" />

      {/* Day/Night */}
      <div className="flex flex-col gap-1.5">
        <Toggle label="Day/Night Cycle" value={dayNight.enabled} onChange={(v) => setDayNight({ enabled: v })} />
        {dayNight.enabled && (
          <Slider label="Speed" value={dayNight.speed} min={-1} max={1} step={0.01} onChange={(v) => setDayNight({ speed: v })} />
        )}
      </div>

      <div className="w-full h-px bg-gray-700" />

      {/* Moons */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-300">Moons</span>
          <button onClick={addMoon} className="text-[10px] px-2 py-0.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded">
            + Add
          </button>
        </div>
        {moons.map((m) => (
          <div key={m.id} className="flex flex-col gap-1 bg-gray-800/50 rounded p-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-400">Moon</span>
              <button onClick={() => removeMoon(m.id)} className="text-[10px] text-red-400 hover:text-red-300">Remove</button>
            </div>
            <Slider label="Size" value={m.size} min={0.05} max={0.4} step={0.01} onChange={(v) => updateMoon(m.id, { size: v })} />
            <Slider label="Orbit" value={m.orbitRadius} min={1.5} max={5} step={0.1} onChange={(v) => updateMoon(m.id, { orbitRadius: v })} />
            <Slider label="Speed" value={m.orbitSpeed} min={0.05} max={1} step={0.05} onChange={(v) => updateMoon(m.id, { orbitSpeed: v })} />
            <Slider label="Tilt" value={m.orbitTilt} min={0} max={1.5} step={0.05} onChange={(v) => updateMoon(m.id, { orbitTilt: v })} />
          </div>
        ))}
      </div>
    </div>
  );
}
