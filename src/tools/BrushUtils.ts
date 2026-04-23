import { IcosphereData } from '@/planet/Icosphere';
import { BrushVertex } from './ITool';

/**
 * Collects vertices within brush radius using BFS on adjacency list.
 * Returns vertices with distance-based falloff weights.
 */
export function collectBrushVertices(
  icosphere: IcosphereData,
  centerIndex: number,
  radius: number,
  falloff: number,
  displacedPositions: Float32Array
): BrushVertex[] {
  const result: BrushVertex[] = [];
  const visited = new Set<number>();
  const queue: number[] = [centerIndex];
  let front = 0; // Front-pointer for O(1) dequeue instead of queue.shift()
  visited.add(centerIndex);

  const cx = displacedPositions[centerIndex * 3];
  const cy = displacedPositions[centerIndex * 3 + 1];
  const cz = displacedPositions[centerIndex * 3 + 2];

  while (front < queue.length) {
    const idx = queue[front++];
    const px = displacedPositions[idx * 3];
    const py = displacedPositions[idx * 3 + 1];
    const pz = displacedPositions[idx * 3 + 2];

    const dx = px - cx, dy = py - cy, dz = pz - cz;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (dist > radius) continue;

    // Compute falloff weight
    const t = dist / radius;
    const weight = Math.pow(1 - t, falloff);
    result.push({ index: idx, weight });

    // BFS neighbors
    const neighbors = icosphere.adjacency[idx];
    for (let i = 0; i < neighbors.length; i++) {
      const n = neighbors[i];
      if (!visited.has(n)) {
        visited.add(n);
        queue.push(n);
      }
    }
  }

  return result;
}
