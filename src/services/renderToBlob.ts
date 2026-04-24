import * as THREE from 'three';

export interface RenderToBlobOptions {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.Camera;
  size: number;
  /** If provided, reuses this target instead of allocating a new one. */
  target?: THREE.WebGLRenderTarget;
  /** Clear alpha (0 = transparent, 1 = opaque). Default 1. */
  clearAlpha?: number;
}

/**
 * Shared helper: render a scene to a WebGLRenderTarget and return a PNG Blob.
 *
 * - Saves and restores all renderer state.
 * - Y-flips the pixel readback (WebGL reads bottom-to-top).
 * - Allocates a temporary target if none provided; caller owns disposal.
 *
 * Used by both ThumbnailService and ExportService.
 */
export async function renderToBlob(opts: RenderToBlobOptions): Promise<Blob> {
  const { renderer, scene, camera, size, clearAlpha = 1 } = opts;

  const ownTarget = !opts.target;
  const target = opts.target ?? new THREE.WebGLRenderTarget(size, size, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
  });

  // Resize if existing target doesn't match
  if (target.width !== size || target.height !== size) {
    target.setSize(size, size);
  }

  // Save renderer state
  const prevTarget = renderer.getRenderTarget();
  const prevAutoClear = renderer.autoClear;
  const prevClearColor = new THREE.Color();
  renderer.getClearColor(prevClearColor);
  const prevClearAlpha = renderer.getClearAlpha();

  try {
    // Render
    renderer.setRenderTarget(target);
    renderer.autoClear = true;
    renderer.setClearColor(0x000000, clearAlpha);
    renderer.render(scene, camera);

    // Read pixels
    const pixels = new Uint8Array(size * size * 4);
    renderer.readRenderTargetPixels(target, 0, 0, size, size, pixels);

    // Restore renderer state
    renderer.setRenderTarget(prevTarget);
    renderer.autoClear = prevAutoClear;
    renderer.setClearColor(prevClearColor, prevClearAlpha);

    // Y-flip + encode to PNG via OffscreenCanvas
    const canvas = new OffscreenCanvas(size, size);
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.createImageData(size, size);

    for (let y = 0; y < size; y++) {
      const srcRow = (size - 1 - y) * size * 4;
      const dstRow = y * size * 4;
      imageData.data.set(pixels.subarray(srcRow, srcRow + size * 4), dstRow);
    }

    ctx.putImageData(imageData, 0, 0);
    return await canvas.convertToBlob({ type: 'image/png' });
  } finally {
    // Restore state even on error
    renderer.setRenderTarget(prevTarget);
    renderer.autoClear = prevAutoClear;
    renderer.setClearColor(prevClearColor, prevClearAlpha);

    if (ownTarget) target.dispose();
  }
}
