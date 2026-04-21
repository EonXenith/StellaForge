# StellaForge

A browser-based planet creation sandbox. Sculpt terrain, paint biomes, and customize your planet in real-time.

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
| Right Drag | Pan camera |
| Scroll | Zoom |
| Shift + Click | Lower terrain (Raise tool) |
| 1-5 | Select tools |
| Ctrl/Cmd + Z | Undo |
| Ctrl/Cmd + Shift + Z | Redo |

## Tools

1. **Raise/Lower** — Sculpt terrain up (click) or down (Shift+click)
2. **Smooth** — Average out terrain bumps
3. **Flatten** — Level terrain to a target height
4. **Paint Biome** — Paint biome colors directly
5. **Meteor** — Create impact craters

## Templates

Choose from 6 planet presets: Earth-like, Desert, Ocean, Ice, Volcanic, Barren.

## Architecture

- **Icosphere** — Subdivision 6 (40,962 vertices) with shared vertices and adjacency lists
- **PlanetData** — Mutable Float32Array heightmap + Uint8Array biomeIds outside React state
- **ShaderMaterial** — Custom GLSL with vertex displacement, biome DataTexture lookup, diffuse + rim lighting
- **BVH Raycasting** — three-mesh-bvh for O(log n) intersection
- **BFS Brush** — Geodesic vertex collection via adjacency list
- **Undo** — Per-vertex delta commands (50 max stack)
