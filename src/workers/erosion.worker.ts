import type { ErosionRequest, ErosionConfig } from '../planet/Erosion';

function getNeighbors(
  idx: number,
  adjacencyFlat: Float32Array,
  adjacencyOffsets: Uint32Array,
  adjacencyLengths: Uint32Array
): number[] {
  const start = adjacencyOffsets[idx];
  const len = adjacencyLengths[idx];
  const result: number[] = [];
  for (let i = 0; i < len; i++) {
    result.push(adjacencyFlat[start + i]);
  }
  return result;
}

function erode(
  heightmap: Float32Array,
  adjacencyFlat: Float32Array,
  adjacencyOffsets: Uint32Array,
  adjacencyLengths: Uint32Array,
  vertexCount: number,
  config: ErosionConfig
): Map<number, { oldValue: number; newValue: number }> {
  const deltas = new Map<number, { oldValue: number; newValue: number }>();
  const { iterations, sedimentCapacity, depositionRate, evaporationRate, maxSteps } = config;

  const trackDelta = (idx: number, oldH: number) => {
    if (!deltas.has(idx)) {
      deltas.set(idx, { oldValue: oldH, newValue: heightmap[idx] });
    } else {
      deltas.get(idx)!.newValue = heightmap[idx];
    }
  };

  const erosionSpeed = 0.3;
  const progressInterval = Math.max(1, Math.floor(iterations / 100));

  for (let i = 0; i < iterations; i++) {
    // Report progress periodically
    if (i % progressInterval === 0) {
      self.postMessage({ type: 'progress', percent: (i / iterations) * 100 });
    }

    // Spawn at a random vertex
    let currentIdx = Math.floor(Math.random() * vertexCount);
    let water = 1.0;
    let sediment = 0.0;

    for (let step = 0; step < maxSteps; step++) {
      const currentHeight = heightmap[currentIdx];
      const neighbors = getNeighbors(currentIdx, adjacencyFlat, adjacencyOffsets, adjacencyLengths);

      // Find steepest downhill neighbor
      let bestNeighbor = -1;
      let bestDh = 0;
      for (const n of neighbors) {
        const dh = currentHeight - heightmap[n];
        if (dh > bestDh) {
          bestDh = dh;
          bestNeighbor = n;
        }
      }

      // Pit: deposit all sediment and break
      if (bestNeighbor === -1 || bestDh <= 0) {
        const oldH = heightmap[currentIdx];
        heightmap[currentIdx] += sediment * depositionRate;
        trackDelta(currentIdx, oldH);
        break;
      }

      // Compute sediment capacity
      const capacity = Math.max(bestDh, 0.01) * water * sedimentCapacity;

      if (sediment > capacity) {
        // Deposit excess sediment
        const deposit = (sediment - capacity) * depositionRate;
        const oldH = heightmap[currentIdx];
        heightmap[currentIdx] += deposit;
        trackDelta(currentIdx, oldH);
        sediment -= deposit;
      } else {
        // Erode
        const erodeAmount = Math.min((capacity - sediment) * erosionSpeed, bestDh);
        const oldH = heightmap[currentIdx];
        heightmap[currentIdx] -= erodeAmount;
        trackDelta(currentIdx, oldH);
        sediment += erodeAmount;
      }

      // Move to neighbor
      currentIdx = bestNeighbor;

      // Evaporate
      water *= (1 - evaporationRate);
      if (water < 0.01) {
        const oldH2 = heightmap[currentIdx];
        heightmap[currentIdx] += sediment * depositionRate;
        trackDelta(currentIdx, oldH2);
        break;
      }
    }
  }

  return deltas;
}

self.onmessage = (e: MessageEvent<ErosionRequest>) => {
  const { heightmap, adjacencyFlat, adjacencyOffsets, adjacencyLengths, vertexCount, config } = e.data;

  const deltas = erode(heightmap, adjacencyFlat, adjacencyOffsets, adjacencyLengths, vertexCount, config);

  // Convert deltas to transferable arrays
  const deltaIndices = new Uint32Array(deltas.size);
  const deltaOldValues = new Float32Array(deltas.size);
  const deltaNewValues = new Float32Array(deltas.size);
  let i = 0;
  deltas.forEach((val, idx) => {
    deltaIndices[i] = idx;
    deltaOldValues[i] = val.oldValue;
    deltaNewValues[i] = val.newValue;
    i++;
  });

  self.postMessage(
    {
      type: 'done',
      heightmap,
      deltaIndices,
      deltaOldValues,
      deltaNewValues,
    },
    {
      transfer: [heightmap.buffer, deltaIndices.buffer, deltaOldValues.buffer, deltaNewValues.buffer],
    }
  );
};
