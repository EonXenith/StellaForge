import * as THREE from 'three';
import { renderToBlob } from './renderToBlob';

/**
 * Captures 256x256 PNG thumbnails of the planet for save slots.
 *
 * Reuses a single WebGLRenderTarget across calls.
 * Delegates rendering to the shared renderToBlob helper.
 */
export class ThumbnailService {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private target: THREE.WebGLRenderTarget;
  private camera: THREE.PerspectiveCamera;
  private capturing = false;

  static readonly SIZE = 256;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene) {
    this.renderer = renderer;
    this.scene = scene;

    // Reusable render target — allocated once
    this.target = new THREE.WebGLRenderTarget(
      ThumbnailService.SIZE,
      ThumbnailService.SIZE,
      { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter },
    );

    // Fixed flattering camera angle:
    // distance 3.5, 15° elevation, 30° azimuth
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
    const elevRad = (15 * Math.PI) / 180;
    const aziRad = (30 * Math.PI) / 180;
    const dist = 3.5;
    this.camera.position.set(
      Math.sin(aziRad) * Math.cos(elevRad) * dist,
      Math.sin(elevRad) * dist,
      Math.cos(aziRad) * Math.cos(elevRad) * dist,
    );
    this.camera.lookAt(0, 0, 0);
  }

  /**
   * Capture the current scene as a 256x256 PNG Blob.
   *
   * - Rejects if the GL context is lost.
   * - Queues if another capture is in flight.
   */
  async capture(): Promise<Blob | null> {
    // Scene not ready guard
    if (!this.scene.children.length) return null;

    // GL context lost
    const gl = this.renderer.getContext();
    if (gl.isContextLost()) {
      throw new Error('WebGL context lost — cannot capture thumbnail');
    }

    // Concurrency guard: queue behind any in-flight capture
    if (this.capturing) {
      return new Promise<Blob | null>((resolve, reject) => {
        const check = () => {
          if (!this.capturing) {
            this.capture().then(resolve, reject);
          } else {
            requestAnimationFrame(check);
          }
        };
        requestAnimationFrame(check);
      });
    }

    this.capturing = true;

    try {
      return await renderToBlob({
        renderer: this.renderer,
        scene: this.scene,
        camera: this.camera,
        size: ThumbnailService.SIZE,
        target: this.target,
      });
    } finally {
      this.capturing = false;
    }
  }

  dispose() {
    this.target.dispose();
  }
}
