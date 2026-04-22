import * as THREE from 'three';

function createGlowTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const half = size / 2;
  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
  gradient.addColorStop(0, 'rgba(255, 255, 230, 1.0)');
  gradient.addColorStop(0.15, 'rgba(255, 240, 200, 0.8)');
  gradient.addColorStop(0.4, 'rgba(255, 220, 160, 0.3)');
  gradient.addColorStop(0.7, 'rgba(255, 200, 120, 0.08)');
  gradient.addColorStop(1, 'rgba(255, 180, 80, 0.0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export class Star {
  public group: THREE.Group;
  private light: THREE.DirectionalLight;
  private glowTexture: THREE.CanvasTexture;

  constructor() {
    this.group = new THREE.Group();

    // Emissive sphere (core of the star)
    const sphereGeo = new THREE.SphereGeometry(0.3, 32, 32);
    const sphereMat = new THREE.MeshBasicMaterial({ color: 0xffffcc });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    this.group.add(sphere);

    // Sprite glow with radial gradient texture
    this.glowTexture = createGlowTexture();
    const spriteMat = new THREE.SpriteMaterial({
      map: this.glowTexture,
      color: 0xffeeaa,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(4, 4, 1);
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
    this.glowTexture.dispose();
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        (obj.material as THREE.Material).dispose();
      }
    });
  }
}
