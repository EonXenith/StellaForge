precision highp float;

varying vec2 vUv;
varying vec3 vWorldPos;

uniform vec3 uRingColor;
uniform float uOpacity;
uniform float uInnerRadius;
uniform float uOuterRadius;
uniform vec3 uSunDirection;
uniform vec3 uPlanetCenter;

// Simple hash noise for banding
float hash1D(float n) {
  return fract(sin(n) * 43758.5453);
}

void main() {
  // Radial distance from center
  float dist = length(vWorldPos.xz - uPlanetCenter.xz);
  float t = (dist - uInnerRadius) / (uOuterRadius - uInnerRadius);

  // Edge falloff
  float edgeFade = smoothstep(0.0, 0.05, t) * smoothstep(1.0, 0.95, t);

  // Procedural banding
  float band = 0.5 + 0.3 * sin(t * 80.0) + 0.2 * sin(t * 200.0 + 3.0);
  band *= 0.7 + 0.3 * hash1D(floor(t * 40.0));

  // Planet shadow
  vec3 L = normalize(uSunDirection);
  vec3 toFrag = vWorldPos - uPlanetCenter;
  // Project fragment position onto sun direction, check if behind planet
  float projLen = dot(toFrag, L);
  vec3 closest = toFrag - projLen * L;
  float closestDist = length(closest);
  float shadow = (projLen < 0.0 && closestDist < 1.0) ? 0.3 : 1.0;

  vec3 color = uRingColor * band * shadow;
  float alpha = uOpacity * edgeFade * band;

  gl_FragColor = vec4(color, alpha);
}
