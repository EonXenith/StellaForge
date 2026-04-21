import { usePlanetStore } from '@/store/usePlanetStore';

export function StarPanel() {
  const starParams = usePlanetStore((s) => s.starParams);
  const setStarParams = usePlanetStore((s) => s.setStarParams);
  const atmosphereParams = usePlanetStore((s) => s.atmosphereParams);
  const setAtmosphereParams = usePlanetStore((s) => s.setAtmosphereParams);

  const colorToHex = (c: { r: number; g: number; b: number }) => {
    const toHex = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0');
    return `#${toHex(c.r)}${toHex(c.g)}${toHex(c.b)}`;
  };

  const hexToColor = (hex: string) => ({
    r: parseInt(hex.slice(1, 3), 16) / 255,
    g: parseInt(hex.slice(3, 5), 16) / 255,
    b: parseInt(hex.slice(5, 7), 16) / 255,
  });

  const azDeg = Math.round((starParams.sunAzimuth * 180) / Math.PI);
  const elDeg = Math.round((starParams.sunElevation * 180) / Math.PI);

  return (
    <div className="absolute bottom-20 right-4 w-56 bg-gray-900/90 backdrop-blur rounded-lg p-4 flex flex-col gap-3 border border-gray-700">
      <h2 className="text-sm font-semibold text-white">Star & Atmosphere</h2>

      <label className="flex items-center gap-2">
        <span className="text-xs text-gray-300 w-16">Star Color</span>
        <input
          type="color"
          value={colorToHex(starParams.color)}
          onChange={(e) => setStarParams({ color: hexToColor(e.target.value) })}
          className="w-6 h-6 rounded cursor-pointer border-0"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-gray-300">Intensity: {starParams.intensity.toFixed(1)}</span>
        <input
          type="range"
          min={0.1}
          max={3}
          step={0.1}
          value={starParams.intensity}
          onChange={(e) => setStarParams({ intensity: parseFloat(e.target.value) })}
          className="w-full accent-yellow-500"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-gray-300">Azimuth: {azDeg}&deg;</span>
        <input
          type="range"
          min={0}
          max={360}
          step={1}
          value={azDeg}
          onChange={(e) => setStarParams({ sunAzimuth: (parseFloat(e.target.value) * Math.PI) / 180 })}
          className="w-full accent-yellow-500"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-gray-300">Elevation: {elDeg}&deg;</span>
        <input
          type="range"
          min={-90}
          max={90}
          step={1}
          value={elDeg}
          onChange={(e) => setStarParams({ sunElevation: (parseFloat(e.target.value) * Math.PI) / 180 })}
          className="w-full accent-yellow-500"
        />
      </label>

      <div className="w-full h-px bg-gray-700" />

      <label className="flex items-center gap-2">
        <span className="text-xs text-gray-300 w-16">Atmo Color</span>
        <input
          type="color"
          value={colorToHex(atmosphereParams.color)}
          onChange={(e) => setAtmosphereParams({ color: hexToColor(e.target.value) })}
          className="w-6 h-6 rounded cursor-pointer border-0"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-gray-300">Atmo Intensity: {atmosphereParams.intensity.toFixed(1)}</span>
        <input
          type="range"
          min={0}
          max={3}
          step={0.1}
          value={atmosphereParams.intensity}
          onChange={(e) => setAtmosphereParams({ intensity: parseFloat(e.target.value) })}
          className="w-full accent-blue-400"
        />
      </label>
    </div>
  );
}
