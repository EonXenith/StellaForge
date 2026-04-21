/**
 * Generates an indexed icosphere with shared vertices and adjacency lists.
 * Subdivision level 6 → 40,962 vertices, 81,920 faces.
 */
export interface IcosphereData {
  positions: Float32Array; // 3 floats per vertex (unit sphere)
  indices: Uint32Array;
  adjacency: Uint32Array[]; // per-vertex neighbor indices
  vertexCount: number;
  faceCount: number;
}

export function createIcosphere(subdivisions: number = 6): IcosphereData {
  // Golden ratio
  const t = (1 + Math.sqrt(5)) / 2;

  // 12 initial vertices of icosahedron (normalized)
  const baseVerts: number[] = [];
  const add = (x: number, y: number, z: number) => {
    const len = Math.sqrt(x * x + y * y + z * z);
    baseVerts.push(x / len, y / len, z / len);
  };

  add(-1, t, 0); add(1, t, 0); add(-1, -t, 0); add(1, -t, 0);
  add(0, -1, t); add(0, 1, t); add(0, -1, -t); add(0, 1, -t);
  add(t, 0, -1); add(t, 0, 1); add(-t, 0, -1); add(-t, 0, 1);

  // 20 initial faces
  const baseFaces: number[] = [
    0,11,5, 0,5,1, 0,1,7, 0,7,10, 0,10,11,
    1,5,9, 5,11,4, 11,10,2, 10,7,6, 7,1,8,
    3,9,4, 3,4,2, 3,2,6, 3,6,8, 3,8,9,
    4,9,5, 2,4,11, 6,2,10, 8,6,7, 9,8,1,
  ];

  let vertices = baseVerts;
  let faces = baseFaces;

  // Subdivide
  for (let i = 0; i < subdivisions; i++) {
    const midpointCache = new Map<string, number>();
    const newFaces: number[] = [];

    const getMidpoint = (a: number, b: number): number => {
      const key = a < b ? `${a}_${b}` : `${b}_${a}`;
      const cached = midpointCache.get(key);
      if (cached !== undefined) return cached;

      const ax = vertices[a * 3], ay = vertices[a * 3 + 1], az = vertices[a * 3 + 2];
      const bx = vertices[b * 3], by = vertices[b * 3 + 1], bz = vertices[b * 3 + 2];
      let mx = (ax + bx) / 2, my = (ay + by) / 2, mz = (az + bz) / 2;
      const len = Math.sqrt(mx * mx + my * my + mz * mz);
      mx /= len; my /= len; mz /= len;

      const idx = vertices.length / 3;
      vertices.push(mx, my, mz);
      midpointCache.set(key, idx);
      return idx;
    };

    for (let f = 0; f < faces.length; f += 3) {
      const v0 = faces[f], v1 = faces[f + 1], v2 = faces[f + 2];
      const m01 = getMidpoint(v0, v1);
      const m12 = getMidpoint(v1, v2);
      const m20 = getMidpoint(v2, v0);

      newFaces.push(
        v0, m01, m20,
        v1, m12, m01,
        v2, m20, m12,
        m01, m12, m20,
      );
    }

    faces = newFaces;
  }

  // Build adjacency
  const vertexCount = vertices.length / 3;
  const adjacencySets: Set<number>[] = new Array(vertexCount);
  for (let i = 0; i < vertexCount; i++) adjacencySets[i] = new Set();

  for (let f = 0; f < faces.length; f += 3) {
    const a = faces[f], b = faces[f + 1], c = faces[f + 2];
    adjacencySets[a].add(b); adjacencySets[a].add(c);
    adjacencySets[b].add(a); adjacencySets[b].add(c);
    adjacencySets[c].add(a); adjacencySets[c].add(b);
  }

  const adjacency: Uint32Array[] = adjacencySets.map(s => new Uint32Array(s));

  return {
    positions: new Float32Array(vertices),
    indices: new Uint32Array(faces),
    adjacency,
    vertexCount,
    faceCount: faces.length / 3,
  };
}
