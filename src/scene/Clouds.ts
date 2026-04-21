import * as THREE from 'three';
import cloudsVert from '@/shaders/clouds.vert';
import cloudsFrag from '@/shaders/clouds.frag';

export class Clouds {
  public mesh: THREE.Mesh;
  private material: THREE.ShaderMaterial;

  constructor(altitude: number = 0.02) {
    const geometry = new THREE.SphereGeometry(1.0 + altitude, 64, 32);

    this.material = new THREE.ShaderMaterial({
      vertexShader: cloudsVert,
      fragmentShader: cloudsFrag,
      uniforms: {
        uTime: { value: 0 },
        uDensity: { value: 0.5 },
        uRotationSpeed: { value: 0.02 },
        uCloudColor: { value: new THREE.Vector3(1, 1, 1) },
        uSunDirection: { value: new THREE.Vector3(1, 0.5, 0.8).normalize() },
      },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.renderOrder = 2;
  }

  setTime(t: number) {
    this.material.uniforms.uTime.value = t;
  }

  setDensity(d: number) {
    this.material.uniforms.uDensity.value = d;
  }

  setRotationSpeed(s: number) {
    this.material.uniforms.uRotationSpeed.value = s;
  }

  setColor(c: { r: number; g: number; b: number }) {
    this.material.uniforms.uCloudColor.value.set(c.r, c.g, c.b);
  }

  setSunDirection(dir: THREE.Vector3) {
    this.material.uniforms.uSunDirection.value.copy(dir).normalize();
  }

  setAltitude(alt: number) {
    this.mesh.geometry.dispose();
    this.mesh.geometry = new THREE.SphereGeometry(1.0 + alt, 64, 32);
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
