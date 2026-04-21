import * as THREE from 'three';
import oceanVert from '@/shaders/ocean.vert';
import oceanFrag from '@/shaders/ocean.frag';

export class Ocean {
  public mesh: THREE.Mesh;
  private material: THREE.ShaderMaterial;
  private geometry: THREE.SphereGeometry;

  constructor(seaLevel: number = 0.0) {
    this.geometry = new THREE.SphereGeometry(1.0 + seaLevel, 128, 64);

    this.material = new THREE.ShaderMaterial({
      vertexShader: oceanVert,
      fragmentShader: oceanFrag,
      uniforms: {
        uTime: { value: 0 },
        uWaveAmplitude: { value: 0.003 },
        uWaveSpeed: { value: 0.1 },
        uShallowColor: { value: new THREE.Vector3(0.2, 0.5, 0.8) },
        uDeepColor: { value: new THREE.Vector3(0.05, 0.15, 0.4) },
        uSunDirection: { value: new THREE.Vector3(1, 0.5, 0.8).normalize() },
        uSunColor: { value: new THREE.Vector3(1, 0.98, 0.9) },
      },
      transparent: true,
      depthWrite: false,
      side: THREE.FrontSide,
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.renderOrder = 1;
  }

  setTime(t: number) {
    this.material.uniforms.uTime.value = t;
  }

  setSeaLevel(level: number) {
    this.geometry.dispose();
    this.geometry = new THREE.SphereGeometry(1.0 + level, 128, 64);
    this.mesh.geometry = this.geometry;
  }

  setColors(shallow: { r: number; g: number; b: number }, deep: { r: number; g: number; b: number }) {
    this.material.uniforms.uShallowColor.value.set(shallow.r, shallow.g, shallow.b);
    this.material.uniforms.uDeepColor.value.set(deep.r, deep.g, deep.b);
  }

  setWaveParams(speed: number, amplitude: number) {
    this.material.uniforms.uWaveSpeed.value = speed;
    this.material.uniforms.uWaveAmplitude.value = amplitude;
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
  }
}
