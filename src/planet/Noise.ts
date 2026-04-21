import { createNoise3D, NoiseFunction3D } from 'simplex-noise';
import alea from 'alea';

export interface NoiseParams {
  seed: string;
  octaves: number;
  lacunarity: number;
  persistence: number;
  amplitude: number;
  ridgeWeight: number; // 0 = pure fbm, 1 = full ridge
}

export function createSeededNoise(seed: string): NoiseFunction3D {
  const prng = alea(seed);
  return createNoise3D(prng);
}

/**
 * Fractional Brownian Motion with optional ridge multifractal.
 */
export function ridgedMultifractal3D(
  noise3D: NoiseFunction3D,
  x: number,
  y: number,
  z: number,
  params: NoiseParams
): number {
  const { octaves, lacunarity, persistence, amplitude, ridgeWeight } = params;

  let sum = 0;
  let freq = 1;
  let amp = 1;
  let maxAmp = 0;

  for (let i = 0; i < octaves; i++) {
    let n = noise3D(x * freq, y * freq, z * freq);

    // Ridge transform: fold the noise
    if (ridgeWeight > 0) {
      const ridge = 1 - Math.abs(n);
      n = n * (1 - ridgeWeight) + ridge * ridge * ridgeWeight;
    }

    sum += n * amp;
    maxAmp += amp;
    freq *= lacunarity;
    amp *= persistence;
  }

  return (sum / maxAmp) * amplitude;
}
