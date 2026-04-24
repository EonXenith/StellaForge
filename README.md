# StellaForge

A browser-based planet creation sandbox. Sculpt terrain, paint biomes, and customize your planet in real-time.

## Features

- Real-time terrain sculpting on a 40,962-vertex icosphere
- 5 sculpting tools: Raise/Lower, Smooth, Flatten, Paint Biome, Meteor
- 8 default biomes with customizable colors and height ranges
- Procedural terrain generation with ridged multifractal noise
- Hydraulic erosion simulation
- Customizable atmosphere, ocean, clouds, rings, moons, and day/night cycle
- Save/load planets to browser storage (IndexedDB)
- Export as PNG (up to 4K), GLB (3D model), or portable JSON
- Import `.stellaforge.json` files via file picker or drag-and-drop
- 6 planet templates: Earth-like, Desert, Ocean, Ice, Volcanic, Barren
- 50-level undo/redo

## Setup

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Build

```bash
npm run build
npm run preview
```

## Controls

| Input | Action |
|-------|--------|
| Left Drag (on planet) | Use active tool |
| Left Drag (off planet) | Orbit camera |
| Scroll | Zoom |
| Shift + Click | Lower terrain (Raise tool) |
| 1-5 | Select tools |
| Escape | Deselect tool / close modal |
| Ctrl/Cmd + Z | Undo |
| Ctrl/Cmd + Shift + Z | Redo |
| Ctrl/Cmd + S | Save planet |
| G | Open gallery |
| Ctrl/Cmd + E | Export |
| ~ (backtick) | Toggle FPS counter |

## Tools

1. **Raise/Lower** — Sculpt terrain up (click) or down (Shift+click)
2. **Smooth** — Average out terrain bumps
3. **Flatten** — Level terrain to a target height
4. **Paint Biome** — Paint biome colors directly
5. **Meteor** — Create impact craters

## Templates

Choose from 6 planet presets: Earth-like, Desert, Ocean, Ice, Volcanic, Barren.

## Data Storage

Planet saves are stored in your browser's IndexedDB under the `stellaforge` database. Each save includes the full heightmap (Float32Array), biome IDs (Uint8Array), all configuration parameters, and a thumbnail. Data stays entirely in your browser — nothing is sent to a server.

To transfer planets between devices, use **Export > JSON** to create a `.stellaforge.json` file, then import it on the other device via the Gallery's Import button or drag-and-drop.

## Architecture

- **Icosphere** — Subdivision 6 (40,962 vertices) with shared vertices and adjacency lists
- **PlanetData** — Mutable Float32Array heightmap + Uint8Array biomeIds outside React state
- **ShaderMaterial** — Custom GLSL with vertex displacement, biome DataTexture lookup, diffuse + rim lighting
- **BVH Raycasting** — three-mesh-bvh for O(log n) intersection
- **BFS Brush** — Geodesic vertex collection via adjacency list
- **Undo** — Per-vertex delta commands (50 max stack)
