import * as THREE from 'three';

export class Star {
  public group: THREE.Group;
  private light: THREE.DirectionalLight;

  constructor() {
    this.group = new THREE.Group();

    // Emissive sphere
    const sphereGeo = new THREE.SphereGeometry(0.5, 16, 16);
    const sphereMat = new THREE.MeshBasicMaterial({ color: 0xffffcc });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    this.group.add(sphere);

    // Sprite glow
    const spriteMat = new THREE.SpriteMaterial({
      color: 0xffeeaa,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(3, 3, 1);
    this.group.add(sprite);

    // Directional light
    this.light = new THREE.DirectionalLight(0xffffff, 1.5);
    this.group.add(this.light);

    // Position the star
    this.group.position.set(10, 5, 8);
  }

  setColor(color: THREE.Color) {
    (this.group.children[0] as THREE.Mesh).material = new THREE.MeshBasicMaterial({ color });
    ((this.group.children[1] as THREE.Sprite).material as THREE.SpriteMaterial).color = color;
    this.light.color = color;
  }

  setIntensity(intensity: number) {
    this.light.intensity = intensity;
  }

  setDirection(dir: THREE.Vector3) {
    this.group.position.copy(dir.normalize().multiplyScalar(10));
  }

  dispose() {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        (obj.material as THREE.Material).dispose();
      }
    });
  }
}
