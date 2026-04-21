/**
 * Erosion parameters and types shared between main thread and worker.
 */
export interface ErosionConfig {
  iterations: number;
  sedimentCapacity: number;
  depositionRate: number;
  evaporationRate: number;
  inertia: number;
  maxSteps: number;
}

export interface ErosionRequest {
  type: 'erode';
  heightmap: Float32Array;
  adjacencyFlat: Float32Array; // Flattened adjacency with offsets
  adjacencyOffsets: Uint32Array; // Start index per vertex into adjacencyFlat
  adjacencyLengths: Uint32Array; // Neighbor count per vertex
  vertexCount: number;
  config: ErosionConfig;
}

export interface ErosionProgress {
  type: 'progress';
  percent: number;
}

export interface ErosionResult {
  type: 'done';
  heightmap: Float32Array;
  deltaIndices: Uint32Array;
  deltaOldValues: Float32Array;
  deltaNewValues: Float32Array;
}

export type ErosionMessage = ErosionProgress | ErosionResult;

/**
 * Flatten adjacency Uint32Array[] into transferable arrays.
 */
export function flattenAdjacency(adjacency: Uint32Array[]): {
  flat: Float32Array;
  offsets: Uint32Array;
  lengths: Uint32Array;
} {
  let totalLen = 0;
  for (const a of adjacency) totalLen += a.length;

  const flat = new Float32Array(totalLen);
  const offsets = new Uint32Array(adjacency.length);
  const lengths = new Uint32Array(adjacency.length);

  let offset = 0;
  for (let i = 0; i < adjacency.length; i++) {
    offsets[i] = offset;
    lengths[i] = adjacency[i].length;
    for (let j = 0; j < adjacency[i].length; j++) {
      flat[offset++] = adjacency[i][j];
    }
  }

  return { flat, offsets, lengths };
}
