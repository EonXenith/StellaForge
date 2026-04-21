import * as THREE from 'three';
import atmosphereVert from '@/shaders/atmosphere.vert';
import atmosphereFrag from '@/shaders/atmosphere.frag';

export class Atmosphere {
  public mesh: THREE.Mesh;
  private material: THREE.ShaderMaterial;

  constructor(radius: number = 1.15) {
    const geometry = new THREE.SphereGeometry(radius, 64, 64);

    this.material = new THREE.ShaderMaterial({
      vertexShader: atmosphereVert,
      fragmentShader: atmosphereFrag,
      uniforms: {
        uAtmosphereColor: { value: new THREE.Vector3(0.3, 0.6, 1.0) },
        uAtmosphereIntensity: { value: 1.2 },
        uSunDirection: { value: new THREE.Vector3(1, 0.5, 0.8).normalize() },
      },
      side: THREE.BackSide,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.mesh = new THREE.Mesh(geometry, this.material);
  }

  setColor(r: number, g: number, b: number) {
    this.material.uniforms.uAtmosphereColor.value.set(r, g, b);
  }

  setIntensity(intensity: number) {
    this.material.uniforms.uAtmosphereIntensity.value = intensity;
  }

  setSunDirection(dir: THREE.Vector3) {
    this.material.uniforms.uSunDirection.value.copy(dir).normalize();
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
