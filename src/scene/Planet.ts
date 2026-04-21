import * as THREE from 'three';
import { IcosphereData } from '@/planet/Icosphere';
import { PlanetData } from '@/planet/PlanetData';
import planetVert from '@/shaders/planet.vert';
import planetFrag from '@/shaders/planet.frag';

export class Planet {
  public mesh: THREE.Mesh;
  public geometry: THREE.BufferGeometry;
  public material: THREE.ShaderMaterial;
  public biomeTexture: THREE.DataTexture;

  private aHeight: THREE.BufferAttribute;
  private aBiomeId: THREE.BufferAttribute;
  private aBrushWeight: THREE.BufferAttribute;

  constructor(private planetData: PlanetData) {
    const ico = planetData.icosphere;

    // Create geometry
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(ico.positions.slice(), 3));
    this.geometry.setIndex(new THREE.BufferAttribute(ico.indices, 1));

    // Custom attributes
    this.aHeight = new THREE.BufferAttribute(new Float32Array(ico.vertexCount), 1);
    this.aBiomeId = new THREE.BufferAttribute(new Float32Array(ico.vertexCount), 1);
    this.aBrushWeight = new THREE.BufferAttribute(new Float32Array(ico.vertexCount), 1);

    this.geometry.setAttribute('aHeight', this.aHeight);
    this.geometry.setAttribute('aBiomeId', this.aBiomeId);
    this.geometry.setAttribute('aBrushWeight', this.aBrushWeight);

    this.geometry.computeVertexNormals();

    // Biome DataTexture (16 colors, RGBA)
    const biomeData = new Uint8Array(16 * 4);
    // Default: all gray
    for (let i = 0; i < 16; i++) {
      biomeData[i * 4] = 128;
      biomeData[i * 4 + 1] = 128;
      biomeData[i * 4 + 2] = 128;
      biomeData[i * 4 + 3] = 255;
    }
    this.biomeTexture = new THREE.DataTexture(biomeData, 16, 1, THREE.RGBAFormat);
    this.biomeTexture.needsUpdate = true;

    // Shader material
    this.material = new THREE.ShaderMaterial({
      vertexShader: planetVert,
      fragmentShader: planetFrag,
      uniforms: {
        uHeightScale: { value: 0.15 },
        uRadius: { value: 1.0 },
        uBiomeColors: { value: this.biomeTexture },
        uSunDirection: { value: new THREE.Vector3(1, 0.5, 0.8).normalize() },
        uSunColor: { value: new THREE.Vector3(1, 0.98, 0.9) },
        uAmbient: { value: 0.15 },
      },
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
  }

  updateFromData() {
    const data = this.planetData;

    if (data.dirty.heights) {
      const arr = this.aHeight.array as Float32Array;
      arr.set(data.heightmap);
      this.aHeight.needsUpdate = true;
      this.recomputeDisplacedNormals();
    }

    if (data.dirty.biomes) {
      const arr = this.aBiomeId.array as Float32Array;
      for (let i = 0; i < data.biomeIds.length; i++) {
        arr[i] = data.biomeIds[i];
      }
      this.aBiomeId.needsUpdate = true;
    }
  }

  updateBiomeColors(colors: Array<{ r: number; g: number; b: number }>) {
    const texData = this.biomeTexture.image.data as Uint8Array;
    for (let i = 0; i < Math.min(colors.length, 16); i++) {
      texData[i * 4] = Math.round(colors[i].r * 255);
      texData[i * 4 + 1] = Math.round(colors[i].g * 255);
      texData[i * 4 + 2] = Math.round(colors[i].b * 255);
      texData[i * 4 + 3] = 255;
    }
    this.biomeTexture.needsUpdate = true;
  }

  setBrushWeights(weights: Float32Array) {
    (this.aBrushWeight.array as Float32Array).set(weights);
    this.aBrushWeight.needsUpdate = true;
  }

  clearBrushWeights() {
    (this.aBrushWeight.array as Float32Array).fill(0);
    this.aBrushWeight.needsUpdate = true;
  }

  private recomputeDisplacedNormals() {
    // Recompute positions based on displacement for correct normals
    const ico = this.planetData.icosphere;
    const pos = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const posArr = pos.array as Float32Array;
    const heightScale = this.material.uniforms.uHeightScale.value;
    const radius = this.material.uniforms.uRadius.value;

    for (let i = 0; i < ico.vertexCount; i++) {
      const bx = ico.positions[i * 3];
      const by = ico.positions[i * 3 + 1];
      const bz = ico.positions[i * 3 + 2];
      const h = this.planetData.heightmap[i];
      const scale = radius + h * heightScale;
      posArr[i * 3] = bx * scale;
      posArr[i * 3 + 1] = by * scale;
      posArr[i * 3 + 2] = bz * scale;
    }
    pos.needsUpdate = true;
    this.geometry.computeVertexNormals();
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
    this.biomeTexture.dispose();
  }
}
