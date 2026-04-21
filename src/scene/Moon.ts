import * as THREE from 'three';
import { createIcosphere } from '@/planet/Icosphere';
import { PlanetData } from '@/planet/PlanetData';
import { generateTerrain, DEFAULT_TERRAIN_PARAMS } from '@/planet/TerrainGenerator';
import planetVert from '@/shaders/planet.vert';
import planetFrag from '@/shaders/planet.frag';
import { MoonConfig } from '@/store/usePlanetStore';

export class Moon {
  public group: THREE.Group;
  public mesh: THREE.Mesh;
  public config: MoonConfig;
  private geometry: THREE.BufferGeometry;
  private material: THREE.ShaderMaterial;
  private biomeTexture: THREE.DataTexture;

  constructor(config: MoonConfig) {
    this.config = config;
    this.group = new THREE.Group();

    // Small icosphere (subdivision 4 for moons)
    const ico = createIcosphere(4);
    const planetData = new PlanetData(ico);

    // Generate terrain using the moon's seed
    generateTerrain(planetData, {
      ...DEFAULT_TERRAIN_PARAMS,
      seed: `moon_${config.seed}`,
      amplitude: 0.6,
      octaves: 4,
      heightScale: 0.08,
      ridgeWeight: 0.1,
    });

    // Build geometry
    this.geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(ico.vertexCount * 3);
    for (let i = 0; i < ico.vertexCount; i++) {
      const h = planetData.heightmap[i];
      const scale = 1.0 + h * 0.08;
      positions[i * 3] = ico.positions[i * 3] * scale;
      positions[i * 3 + 1] = ico.positions[i * 3 + 1] * scale;
      positions[i * 3 + 2] = ico.positions[i * 3 + 2] * scale;
    }
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setIndex(new THREE.BufferAttribute(ico.indices, 1));

    // Custom attributes
    const aHeight = new THREE.BufferAttribute(new Float32Array(planetData.heightmap), 1);
    const aBiomeId = new THREE.BufferAttribute(new Float32Array(ico.vertexCount), 1);
    const aBrushWeight = new THREE.BufferAttribute(new Float32Array(ico.vertexCount), 1);
    this.geometry.setAttribute('aHeight', aHeight);
    this.geometry.setAttribute('aBiomeId', aBiomeId);
    this.geometry.setAttribute('aBrushWeight', aBrushWeight);
    this.geometry.computeVertexNormals();

    // Gray biome texture for moons
    const biomeData = new Uint8Array(16 * 4);
    for (let i = 0; i < 16; i++) {
      biomeData[i * 4] = 140;
      biomeData[i * 4 + 1] = 135;
      biomeData[i * 4 + 2] = 130;
      biomeData[i * 4 + 3] = 255;
    }
    this.biomeTexture = new THREE.DataTexture(biomeData, 16, 1, THREE.RGBAFormat);
    this.biomeTexture.needsUpdate = true;

    this.material = new THREE.ShaderMaterial({
      vertexShader: planetVert,
      fragmentShader: planetFrag,
      uniforms: {
        uHeightScale: { value: 0.08 },
        uRadius: { value: 1.0 },
        uBiomeColors: { value: this.biomeTexture },
        uSunDirection: { value: new THREE.Vector3(1, 0.5, 0.8).normalize() },
        uSunColor: { value: new THREE.Vector3(1, 0.98, 0.9) },
        uAmbient: { value: 0.15 },
      },
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.scale.setScalar(config.size);
    this.group.add(this.mesh);
  }

  updateOrbit(time: number) {
    const { orbitRadius, orbitSpeed, orbitTilt, phase } = this.config;
    const angle = time * orbitSpeed + phase;

    // Orbit in a tilted plane
    const x = Math.cos(angle) * orbitRadius;
    const z = Math.sin(angle) * orbitRadius;
    const y = Math.sin(angle) * Math.sin(orbitTilt) * orbitRadius;

    this.group.position.set(x, y, z);
  }

  setSunDirection(dir: THREE.Vector3) {
    this.material.uniforms.uSunDirection.value.copy(dir).normalize();
  }

  setSunColor(color: { r: number; g: number; b: number }) {
    this.material.uniforms.uSunColor.value.set(color.r, color.g, color.b);
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
    this.biomeTexture.dispose();
  }
}
