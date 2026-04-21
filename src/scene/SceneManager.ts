import * as THREE from 'three';
import { createIcosphere } from '@/planet/Icosphere';
import { PlanetData } from '@/planet/PlanetData';
import { Planet } from './Planet';
import { Starfield } from './Starfield';
import { Star } from './Star';
import { Atmosphere } from './Atmosphere';
import { CameraController } from './CameraController';
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';

// Extend Three.js prototypes for BVH
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

export class SceneManager {
  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public cameraController: CameraController;
  public planet: Planet;
  public planetData: PlanetData;
  public starfield: Starfield;
  public star: Star;
  public atmosphere: Atmosphere;

  private animationId: number = 0;
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setClearColor(0x000008);
    container.appendChild(this.renderer.domElement);

    // Scene
    this.scene = new THREE.Scene();

    // Camera
    this.camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 200);
    this.camera.position.set(0, 0, 3);

    // Camera controller
    this.cameraController = new CameraController(this.camera, this.renderer.domElement);

    // Planet
    const icosphere = createIcosphere(6);
    this.planetData = new PlanetData(icosphere);
    this.planet = new Planet(this.planetData);
    this.scene.add(this.planet.mesh);

    // Compute BVH for raycasting
    this.planet.geometry.computeBoundsTree();

    // Atmosphere
    this.atmosphere = new Atmosphere(1.15);
    this.scene.add(this.atmosphere.mesh);

    // Star
    this.star = new Star();
    this.scene.add(this.star.group);

    // Starfield
    this.starfield = new Starfield(3000);
    this.scene.add(this.starfield.points);

    // Ambient light
    const ambient = new THREE.AmbientLight(0x404040, 0.3);
    this.scene.add(ambient);

    // Events
    window.addEventListener('resize', this.onResize);

    // Start loop
    this.animate();
  }

  private animate = () => {
    this.animationId = requestAnimationFrame(this.animate);

    // Update camera
    this.cameraController.update();

    // Sync planet data if dirty
    if (this.planetData.dirty.heights || this.planetData.dirty.biomes) {
      this.planet.updateFromData();

      // Refit BVH after geometry changes
      if (this.planetData.dirty.heights && this.planet.geometry.boundsTree) {
        this.planet.geometry.boundsTree.refit();
      }

      this.planetData.clearDirty();
    }

    this.renderer.render(this.scene, this.camera);
  };

  private onResize = () => {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  dispose() {
    window.removeEventListener('resize', this.onResize);
    cancelAnimationFrame(this.animationId);
    this.cameraController.dispose();
    this.planet.dispose();
    this.atmosphere.dispose();
    this.starfield.dispose();
    this.star.dispose();
    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }
}
