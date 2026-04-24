import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { renderToBlob } from './renderToBlob';
import { usePlanetStore } from '@/store/usePlanetStore';
import {
  SAVED_CONFIG_KEYS,
  CURRENT_SAVE_VERSION,
  SCHEMA_TYPE,
} from './PlanetSaveService';
import type { PlanetSaveConfig } from './PlanetSaveService';
import type { SceneManager } from '@/scene/SceneManager';

export interface ExportPNGOptions {
  /** Export resolution (width = height). Default 2048. */
  size?: number;
  /** Transparent background (no starfield, alpha=0). Default false. */
  transparent?: boolean;
  /** Include starfield in render. Default true. Forced off when transparent. */
  includeStarfield?: boolean;
}

export interface ExportGLBOptions {
  /** Include ocean sphere. Default false. */
  includeOcean?: boolean;
  /** Include clouds sphere. Default false. */
  includeClouds?: boolean;
  /** Include ring geometry. Default false. */
  includeRings?: boolean;
  /** Include moon meshes. Default true. */
  includeMoons?: boolean;
  /** Bake biome colors as vertex colors. Default true. */
  bakeVertexColors?: boolean;
}

export interface ExportJSONOptions {
  /** Include base64 thumbnail in JSON. Adds ~300KB. Default true. */
  includeThumbnail?: boolean;
}

/** Shape of the .stellaforge.json file. */
export interface StellaForgeJSON {
  schemaType: typeof SCHEMA_TYPE;
  version: number;
  name: string;
  createdAt: number;
  updatedAt: number;
  config: PlanetSaveConfig;
  heights_b64: string;
  biomes_b64: string;
  thumbnail_b64?: string;
}

/**
 * Handles PNG, GLB, and JSON export of the planet scene.
 */
export class ExportService {
  private sm: SceneManager;
  private camera: THREE.PerspectiveCamera;
  private exporting = false;

  constructor(sm: SceneManager) {
    this.sm = sm;

    // Use same camera angle as ThumbnailService
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
    const elevRad = (15 * Math.PI) / 180;
    const aziRad = (30 * Math.PI) / 180;
    const dist = 3.5;
    this.camera.position.set(
      Math.sin(aziRad) * Math.cos(elevRad) * dist,
      Math.sin(elevRad) * dist,
      Math.cos(aziRad) * Math.cos(elevRad) * dist,
    );
    this.camera.lookAt(0, 0, 0);
  }

  get isExporting() {
    return this.exporting;
  }

  // ── PNG Export ──────────────────────────────────────────────

  async exportPNG(options: ExportPNGOptions = {}): Promise<Blob> {
    const {
      size = 2048,
      transparent = false,
      includeStarfield = true,
    } = options;

    if (this.exporting) {
      throw new Error('Export already in progress');
    }

    const gl = this.sm.renderer.getContext();
    if (gl.isContextLost()) {
      throw new Error('WebGL context lost — cannot export');
    }

    this.exporting = true;

    const starfieldWasVisible = this.sm.starfield.points.visible;
    if (transparent || !includeStarfield) {
      this.sm.starfield.points.visible = false;
    }

    try {
      const blob = await renderToBlob({
        renderer: this.sm.renderer,
        scene: this.sm.scene,
        camera: this.camera,
        size,
        clearAlpha: transparent ? 0 : 1,
      });
      return blob;
    } catch (e) {
      const msg = (e as Error).message || '';
      if (msg.includes('out of memory') || msg.includes('OUT_OF_MEMORY')) {
        throw new Error(
          `Your device can't export at ${size}×${size} — try a smaller resolution`,
        );
      }
      throw e;
    } finally {
      this.sm.starfield.points.visible = starfieldWasVisible;
      this.exporting = false;
    }
  }

  async downloadPNG(
    options: ExportPNGOptions = {},
    saveName?: string | null,
  ): Promise<void> {
    const blob = await this.exportPNG(options);
    const filename = buildFilename(saveName, 'png');
    triggerDownload(blob, filename);
  }

  // ── GLB Export ─────────────────────────────────────────────

  /**
   * Export the planet as a GLB binary blob.
   *
   * Bakes shader-driven vertex displacement into real geometry positions.
   * Shader-only effects (ocean waves, cloud movement, atmosphere glow)
   * are NOT included — those require real-time rendering.
   */
  async exportGLB(options: ExportGLBOptions = {}): Promise<Blob> {
    const {
      includeOcean = false,
      includeClouds = false,
      includeRings = false,
      includeMoons = true,
      bakeVertexColors = true,
    } = options;

    if (this.exporting) {
      throw new Error('Export already in progress');
    }

    this.exporting = true;

    try {
      const root = new THREE.Group();
      root.name = 'Planet';

      // 1. Bake terrain mesh
      const terrainMesh = this.bakeTerrainMesh(bakeVertexColors);
      terrainMesh.name = 'Terrain';
      root.add(terrainMesh);

      // 2. Optional ocean
      const state = usePlanetStore.getState();
      if (includeOcean && state.oceanParams.enabled) {
        const oceanMesh = this.buildOceanMesh(state.oceanParams.seaLevel);
        oceanMesh.name = 'Ocean';
        root.add(oceanMesh);
      }

      // 3. Optional clouds
      if (includeClouds && state.cloudParams.enabled) {
        const cloudMesh = this.buildCloudMesh(state.cloudParams.altitude, state.cloudParams.color);
        cloudMesh.name = 'Clouds';
        root.add(cloudMesh);
      }

      // 4. Optional rings
      if (includeRings && state.ringParams.enabled) {
        const ringMesh = this.buildRingMesh(state.ringParams);
        ringMesh.name = 'Rings';
        root.add(ringMesh);
      }

      // 5. Optional moons
      if (includeMoons && this.sm.moonInstances.size > 0) {
        const moonGroup = new THREE.Group();
        moonGroup.name = 'Moons';

        for (const [id, moon] of this.sm.moonInstances) {
          const moonMesh = this.bakeMoonMesh(moon);
          moonMesh.name = id;
          // Preserve current orbit position
          moonMesh.position.copy(moon.group.position);
          moonMesh.scale.setScalar(moon.config.size);
          moonGroup.add(moonMesh);
        }

        root.add(moonGroup);
      }

      // 6. Export via GLTFExporter
      const buffer = await this.runGLTFExporter(root);

      // 7. Cleanup exported scene graph (don't leak geometries/materials)
      root.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (obj.material instanceof THREE.Material) {
            obj.material.dispose();
          }
        }
      });

      return new Blob([buffer], { type: 'model/gltf-binary' });
    } finally {
      this.exporting = false;
    }
  }

  async downloadGLB(
    options: ExportGLBOptions = {},
    saveName?: string | null,
  ): Promise<void> {
    const blob = await this.exportGLB(options);
    const filename = buildFilename(saveName, 'glb');
    triggerDownload(blob, filename);
  }

  // ── JSON Export ────────────────────────────────────────────

  /**
   * Export the current planet as a JSON blob (.stellaforge.json format).
   *
   * Heights and biomes are base64-encoded since JSON can't hold binary.
   * Thumbnail is an optional base64 data URL.
   */
  async exportJSON(
    options: ExportJSONOptions = {},
    saveName?: string | null,
    thumbnailService?: { capture(): Promise<Blob | null> } | null,
  ): Promise<Blob> {
    const { includeThumbnail = true } = options;

    const pd = this.sm.planetData;
    const storeState = usePlanetStore.getState();

    // Extract allowlisted config
    const config = {} as Record<string, unknown>;
    for (const key of SAVED_CONFIG_KEYS) {
      config[key] = (storeState as unknown as Record<string, unknown>)[key];
    }

    const now = Date.now();
    const name = saveName?.trim() || storeState.currentSaveName || 'Untitled Planet';

    const envelope: StellaForgeJSON = {
      schemaType: SCHEMA_TYPE,
      version: CURRENT_SAVE_VERSION,
      name,
      createdAt: now,
      updatedAt: now,
      config: config as unknown as PlanetSaveConfig,
      heights_b64: arrayBufferToBase64((pd.heightmap.buffer as ArrayBuffer).slice(0)),
      biomes_b64: arrayBufferToBase64((pd.biomeIds.buffer as ArrayBuffer).slice(0)),
    };

    // Optional thumbnail
    if (includeThumbnail && thumbnailService) {
      try {
        const thumbBlob = await thumbnailService.capture();
        if (thumbBlob) {
          envelope.thumbnail_b64 = await blobToBase64DataUrl(thumbBlob);
        }
      } catch {
        // Non-critical — export without thumbnail
      }
    }

    const json = JSON.stringify(envelope, null, 2);
    return new Blob([json], { type: 'application/json' });
  }

  async downloadJSON(
    options: ExportJSONOptions = {},
    saveName?: string | null,
    thumbnailService?: { capture(): Promise<Blob | null> } | null,
  ): Promise<void> {
    const blob = await this.exportJSON(options, saveName, thumbnailService);
    const name = saveName?.trim() || usePlanetStore.getState().currentSaveName;
    const filename = buildFilename(name, 'stellaforge.json');
    triggerDownload(blob, filename);
  }

  // ── Baking helpers ─────────────────────────────────────────

  /**
   * Clone the icosphere geometry with heightmap displacement baked in.
   *
   * Displacement formula matches the vertex shader exactly:
   *   displaced = normalize(position) * (uRadius + aHeight * uHeightScale)
   */
  private bakeTerrainMesh(bakeVertexColors: boolean): THREE.Mesh {
    const pd = this.sm.planetData;
    const ico = pd.icosphere;

    // Read uniforms from the live material — never hardcode
    const uRadius = this.sm.planet.material.uniforms.uRadius.value as number;
    const uHeightScale = this.sm.planet.material.uniforms.uHeightScale.value as number;

    // Clone positions with displacement baked in
    const positions = new Float32Array(ico.vertexCount * 3);
    for (let i = 0; i < ico.vertexCount; i++) {
      const ox = ico.positions[i * 3];
      const oy = ico.positions[i * 3 + 1];
      const oz = ico.positions[i * 3 + 2];

      // normalize(position) — icosphere positions are already unit-sphere
      // but normalize defensively
      const len = Math.sqrt(ox * ox + oy * oy + oz * oz);
      const nx = ox / len;
      const ny = oy / len;
      const nz = oz / len;

      const scale = uRadius + pd.heightmap[i] * uHeightScale;
      positions[i * 3] = nx * scale;
      positions[i * 3 + 1] = ny * scale;
      positions[i * 3 + 2] = nz * scale;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Preserve indexed geometry for smaller file + cleaner topology
    geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(ico.indices), 1));

    // Recompute normals on the baked (displaced) geometry
    geometry.computeVertexNormals();

    // Bake vertex colors from biome definitions
    const material = new THREE.MeshStandardMaterial({
      roughness: 0.85,
      metalness: 0.0,
    });

    if (bakeVertexColors) {
      const biomes = usePlanetStore.getState().biomes;
      const colors = new Float32Array(ico.vertexCount * 3);

      for (let i = 0; i < ico.vertexCount; i++) {
        const biomeId = pd.biomeIds[i];
        const biome = biomes[biomeId] ?? biomes[0];
        colors[i * 3] = biome.color.r;
        colors[i * 3 + 1] = biome.color.g;
        colors[i * 3 + 2] = biome.color.b;
      }

      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      material.vertexColors = true;
    }

    return new THREE.Mesh(geometry, material);
  }

  /**
   * Build a static ocean sphere at the current sea level.
   * No wave animation — that's shader-only.
   */
  private buildOceanMesh(seaLevel: number): THREE.Mesh {
    const state = usePlanetStore.getState();
    const shallow = state.oceanParams.colorShallow;

    const geometry = new THREE.SphereGeometry(1.0 + seaLevel, 128, 64);
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(shallow.r, shallow.g, shallow.b),
      transparent: true,
      opacity: 0.7,
      roughness: 0.1,
      metalness: 0.0,
    });

    return new THREE.Mesh(geometry, material);
  }

  /**
   * Build a static cloud sphere at the current altitude.
   * No rotation/turbulence — that's shader-only.
   */
  private buildCloudMesh(altitude: number, color: { r: number; g: number; b: number }): THREE.Mesh {
    const radius = 1.0 + altitude;
    const geometry = new THREE.SphereGeometry(radius, 64, 32);
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color.r, color.g, color.b),
      transparent: true,
      opacity: 0.4,
      roughness: 1.0,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });

    return new THREE.Mesh(geometry, material);
  }

  /**
   * Build a static ring with vertex colors for the gradient.
   */
  private buildRingMesh(ringParams: {
    innerRadius: number;
    outerRadius: number;
    tilt: number;
    color: { r: number; g: number; b: number };
    opacity: number;
  }): THREE.Mesh {
    const geometry = new THREE.RingGeometry(
      ringParams.innerRadius,
      ringParams.outerRadius,
      128,
      8,
    );

    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(ringParams.color.r, ringParams.color.g, ringParams.color.b),
      transparent: true,
      opacity: ringParams.opacity,
      side: THREE.DoubleSide,
      roughness: 0.8,
      metalness: 0.0,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = Math.PI / 2 - ringParams.tilt;
    return mesh;
  }

  /**
   * Bake a moon's already-displaced geometry into a standard mesh.
   * Moon geometry is already baked in Moon.ts constructor,
   * so we clone its positions and add gray vertex colors.
   */
  private bakeMoonMesh(moon: { mesh: THREE.Mesh; config: { size: number } }): THREE.Mesh {
    const srcGeo = moon.mesh.geometry;
    const srcPos = srcGeo.getAttribute('position') as THREE.BufferAttribute;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(
      new Float32Array(srcPos.array as Float32Array), 3,
    ));

    const srcIndex = srcGeo.getIndex();
    if (srcIndex) {
      geometry.setIndex(new THREE.BufferAttribute(
        new Uint32Array(srcIndex.array as Uint32Array), 1,
      ));
    }

    geometry.computeVertexNormals();

    // Gray vertex colors for moons
    const vertexCount = srcPos.count;
    const colors = new Float32Array(vertexCount * 3);
    for (let i = 0; i < vertexCount; i++) {
      colors[i * 3] = 0.55;
      colors[i * 3 + 1] = 0.53;
      colors[i * 3 + 2] = 0.51;
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.9,
      metalness: 0.0,
    });

    return new THREE.Mesh(geometry, material);
  }

  /**
   * Run GLTFExporter.parse() wrapped in a Promise.
   */
  private runGLTFExporter(scene: THREE.Object3D): Promise<ArrayBuffer> {
    return new Promise<ArrayBuffer>((resolve, reject) => {
      const exporter = new GLTFExporter();
      exporter.parse(
        scene,
        (result) => {
          resolve(result as ArrayBuffer);
        },
        (error) => {
          reject(new Error(`GLTFExporter failed: ${error.message}`));
        },
        { binary: true },
      );
    });
  }
}

// ── Shared helpers ─────────────────────────────────────────

function buildFilename(saveName: string | null | undefined, ext: string): string {
  const base = saveName?.trim() || 'untitled-planet';
  const safe = base.replace(/[^a-zA-Z0-9_\- ]/g, '').replace(/\s+/g, '-');
  const now = new Date();
  const ts = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    '-',
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0'),
  ].join('');
  return `${safe}-${ts}.${ext}`;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ── Base64 encoding ───────────────────────────────────────

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer as ArrayBuffer;
}

async function blobToBase64DataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function base64DataUrlToBlob(dataUrl: string): Blob {
  const [header, data] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] ?? 'image/png';
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}
