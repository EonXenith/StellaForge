import * as THREE from 'three';
import { createIcosphere } from '@/planet/Icosphere';
import { PlanetData } from '@/planet/PlanetData';
import { Planet } from './Planet';
import { Starfield } from './Starfield';
import { Star } from './Star';
import { Atmosphere } from './Atmosphere';
import { Ocean } from './Ocean';
import { Clouds } from './Clouds';
import { Rings } from './Rings';
import { Moon } from './Moon';
import { CameraController } from './CameraController';
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';
import { usePlanetStore, getSunDirection, MoonConfig } from '@/store/usePlanetStore';

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
  public ocean: Ocean;
  public clouds: Clouds;
  public rings: Rings;
  public moonInstances: Map<string, Moon> = new Map();

  private animationId: number = 0;
  private container: HTMLElement;
  private frameTimes: number[] = [];
  private lastFrameTime: number = 0;
  private clock = new THREE.Clock();

  // Day/night cycle local state (bypass store for per-frame perf)
  private dayNightActive = false;
  private dayNightSpeed = 0.1;
  private localSunAzimuth = 0;

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

    // Ocean
    this.ocean = new Ocean(0.0);
    this.scene.add(this.ocean.mesh);

    // Clouds
    this.clouds = new Clouds(0.02);
    this.scene.add(this.clouds.mesh);

    // Atmosphere
    this.atmosphere = new Atmosphere(1.15);
    this.scene.add(this.atmosphere.mesh);

    // Rings (initially hidden)
    this.rings = new Rings();
    this.rings.mesh.visible = false;
    this.scene.add(this.rings.mesh);

    // Star
    this.star = new Star();
    this.scene.add(this.star.group);

    // Starfield
    this.starfield = new Starfield(3000);
    this.scene.add(this.starfield.points);

    // Ambient light
    const ambient = new THREE.AmbientLight(0x404040, 0.3);
    this.scene.add(ambient);

    // Initialize local sun azimuth from store
    const state = usePlanetStore.getState();
    this.localSunAzimuth = state.starParams.sunAzimuth;

    // Events
    window.addEventListener('resize', this.onResize);

    // Start loop
    this.animate();
  }

  getFps(): number {
    if (this.frameTimes.length < 2) return 0;
    const sum = this.frameTimes.reduce((a, b) => a + b, 0);
    return Math.round((this.frameTimes.length / sum) * 1000);
  }

  setDayNight(active: boolean, speed: number) {
    this.dayNightActive = active;
    this.dayNightSpeed = speed;
    if (active) {
      this.localSunAzimuth = usePlanetStore.getState().starParams.sunAzimuth;
    }
  }

  syncSunFromStore() {
    const { sunAzimuth } = usePlanetStore.getState().starParams;
    this.localSunAzimuth = sunAzimuth;
  }

  reconcileMoons(configs: MoonConfig[]) {
    const currentIds = new Set(this.moonInstances.keys());
    const newIds = new Set(configs.map((c) => c.id));

    // Remove deleted moons
    for (const id of currentIds) {
      if (!newIds.has(id)) {
        const moon = this.moonInstances.get(id)!;
        this.scene.remove(moon.group);
        moon.dispose();
        this.moonInstances.delete(id);
      }
    }

    // Add new moons
    for (const config of configs) {
      if (!this.moonInstances.has(config.id)) {
        const moon = new Moon(config);
        this.moonInstances.set(config.id, moon);
        this.scene.add(moon.group);
      } else {
        // Update config
        this.moonInstances.get(config.id)!.config = config;
      }
    }
  }

  private animate = () => {
    this.animationId = requestAnimationFrame(this.animate);

    // FPS measurement
    const now = performance.now();
    if (this.lastFrameTime > 0) {
      this.frameTimes.push(now - this.lastFrameTime);
      if (this.frameTimes.length > 60) this.frameTimes.shift();
    }
    this.lastFrameTime = now;

    const dt = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    // Day/night cycle
    if (this.dayNightActive) {
      this.localSunAzimuth += this.dayNightSpeed * dt;
      // Sync back to store at ~10Hz to keep UI updated without per-frame overhead
      if (Math.floor(elapsed * 10) !== Math.floor((elapsed - dt) * 10)) {
        usePlanetStore.getState().setStarParams({ sunAzimuth: this.localSunAzimuth });
      }
      // Update scene directly
      const elev = usePlanetStore.getState().starParams.sunElevation;
      const sunDir = getSunDirection(this.localSunAzimuth, elev);
      const sunVec = new THREE.Vector3(sunDir.x, sunDir.y, sunDir.z);
      this.planet.material.uniforms.uSunDirection.value.copy(sunVec);
      this.atmosphere.setSunDirection(sunVec);
      this.star.setDirection(sunVec.clone());
      this.ocean.setSunDirection(sunVec);
      this.clouds.setSunDirection(sunVec);
      this.rings.setSunDirection(sunVec);
      for (const moon of this.moonInstances.values()) {
        moon.setSunDirection(sunVec);
      }
    }

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

    // Update time-based uniforms
    this.ocean.setTime(elapsed);
    this.clouds.setTime(elapsed);

    // Update moon orbits
    for (const moon of this.moonInstances.values()) {
      moon.updateOrbit(elapsed);
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
    this.ocean.dispose();
    this.clouds.dispose();
    this.rings.dispose();
    for (const moon of this.moonInstances.values()) {
      moon.dispose();
    }
    this.starfield.dispose();
    this.star.dispose();
    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }
}
