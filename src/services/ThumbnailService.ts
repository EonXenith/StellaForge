import * as THREE from 'three';

/**
 * Captures 256x256 PNG thumbnails of the planet for save slots.
 *
 * Reuses a single WebGLRenderTarget across calls.
 * Saves and restores all renderer state so capture() is invisible
 * to the main render loop.
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
   * - Preserves all renderer state (render target, autoClear, clear color/alpha).
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
      // Save renderer state
      const prevTarget = this.renderer.getRenderTarget();
      const prevAutoClear = this.renderer.autoClear;
      const prevClearColor = new THREE.Color();
      this.renderer.getClearColor(prevClearColor);
      const prevClearAlpha = this.renderer.getClearAlpha();

      // Render to our target
      this.renderer.setRenderTarget(this.target);
      this.renderer.autoClear = true;
      this.renderer.render(this.scene, this.camera);

      // Read pixels
      const size = ThumbnailService.SIZE;
      const pixels = new Uint8Array(size * size * 4);
      this.renderer.readRenderTargetPixels(this.target, 0, 0, size, size, pixels);

      // Restore renderer state
      this.renderer.setRenderTarget(prevTarget);
      this.renderer.autoClear = prevAutoClear;
      this.renderer.setClearColor(prevClearColor, prevClearAlpha);

      // Convert RGBA pixels → PNG via OffscreenCanvas
      // WebGL reads bottom-to-top, so we need to flip Y
      const canvas = new OffscreenCanvas(size, size);
      const ctx = canvas.getContext('2d')!;
      const imageData = ctx.createImageData(size, size);

      for (let y = 0; y < size; y++) {
        const srcRow = (size - 1 - y) * size * 4;
        const dstRow = y * size * 4;
        imageData.data.set(pixels.subarray(srcRow, srcRow + size * 4), dstRow);
      }

      ctx.putImageData(imageData, 0, 0);
      const blob = await canvas.convertToBlob({ type: 'image/png' });
      return blob;
    } finally {
      this.capturing = false;
    }
  }

  dispose() {
    this.target.dispose();
  }
}
