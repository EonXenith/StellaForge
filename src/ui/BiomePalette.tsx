import { usePlanetStore, BiomeDefinition } from '@/store/usePlanetStore';

export function BiomePalette() {
  const biomes = usePlanetStore((s) => s.biomes);
  const setBiomes = usePlanetStore((s) => s.setBiomes);
  const selectedBiomeId = usePlanetStore((s) => s.selectedBiomeId);
  const setSelectedBiomeId = usePlanetStore((s) => s.setSelectedBiomeId);
  const activeTool = usePlanetStore((s) => s.toolState.activeTool);

  const isBiomeTool = activeTool === 'biome' || activeTool === 'meteor';

  const updateBiome = (index: number, updates: Partial<BiomeDefinition>) => {
    const newBiomes = biomes.map((b, i) => (i === index ? { ...b, ...updates } : b));
    setBiomes(newBiomes);
  };

  const colorToHex = (c: { r: number; g: number; b: number }) => {
    const toHex = (v: number) =>
      Math.round(v * 255)
        .toString(16)
        .padStart(2, '0');
    return `#${toHex(c.r)}${toHex(c.g)}${toHex(c.b)}`;
  };

  const hexToColor = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return { r, g, b };
  };

  return (
    <div className="absolute top-16 right-4 w-56 bg-gray-900/90 backdrop-blur rounded-lg p-4 flex flex-col gap-2 border border-gray-700">
      <h2 className="text-sm font-semibold text-white">Biomes</h2>
      {biomes.map((biome, i) => (
        <button
          key={i}
          onClick={() => setSelectedBiomeId(i)}
          className={`flex items-center gap-2 px-1.5 py-0.5 rounded transition-colors text-left ${
            selectedBiomeId === i
              ? isBiomeTool
                ? 'ring-2 ring-blue-400 bg-gray-800/60'
                : 'ring-1 ring-gray-500 bg-gray-800/40'
              : 'hover:bg-gray-800/30'
          }`}
        >
          <input
            type="color"
            value={colorToHex(biome.color)}
            onChange={(e) => {
              e.stopPropagation();
              updateBiome(i, { color: hexToColor(e.target.value) });
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-6 h-6 rounded cursor-pointer border-0"
          />
          <span className="text-xs text-gray-300 flex-1">{biome.name}</span>
          <label
            className="flex items-center"
            title="Emissive (city lights)"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={biome.emissive}
              onChange={(e) => {
                e.stopPropagation();
                updateBiome(i, { emissive: e.target.checked });
              }}
              className="w-3 h-3 accent-yellow-500"
            />
          </label>
          {selectedBiomeId === i && isBiomeTool && (
            <span className="text-[9px] text-blue-400 font-medium">PAINT</span>
          )}
        </button>
      ))}
    </div>
  );
}
