import * as THREE from 'three';
import ringsVert from '@/shaders/rings.vert';
import ringsFrag from '@/shaders/rings.frag';

export class Rings {
  public mesh: THREE.Mesh;
  private material: THREE.ShaderMaterial;
  private geometry: THREE.RingGeometry;

  constructor(innerRadius: number = 1.3, outerRadius: number = 2.0, tilt: number = 0.3) {
    this.geometry = new THREE.RingGeometry(innerRadius, outerRadius, 128, 8);

    this.material = new THREE.ShaderMaterial({
      vertexShader: ringsVert,
      fragmentShader: ringsFrag,
      uniforms: {
        uRingColor: { value: new THREE.Vector3(0.8, 0.7, 0.5) },
        uOpacity: { value: 0.8 },
        uInnerRadius: { value: innerRadius },
        uOuterRadius: { value: outerRadius },
        uSunDirection: { value: new THREE.Vector3(1, 0.5, 0.8).normalize() },
        uPlanetCenter: { value: new THREE.Vector3(0, 0, 0) },
      },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.rotation.x = Math.PI / 2 - tilt;
    this.mesh.renderOrder = 3;
  }

  setRadii(inner: number, outer: number) {
    this.geometry.dispose();
    this.geometry = new THREE.RingGeometry(inner, outer, 128, 8);
    this.mesh.geometry = this.geometry;
    this.material.uniforms.uInnerRadius.value = inner;
    this.material.uniforms.uOuterRadius.value = outer;
  }

  setTilt(tilt: number) {
    this.mesh.rotation.x = Math.PI / 2 - tilt;
  }

  setColor(c: { r: number; g: number; b: number }) {
    this.material.uniforms.uRingColor.value.set(c.r, c.g, c.b);
  }

  setOpacity(o: number) {
    this.material.uniforms.uOpacity.value = o;
  }

  setSunDirection(dir: THREE.Vector3) {
    this.material.uniforms.uSunDirection.value.copy(dir).normalize();
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}
