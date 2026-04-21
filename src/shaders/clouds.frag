precision highp float;

varying vec3 vWorldPos;
varying vec3 vNormal;
varying vec3 vLocalPos;

uniform float uTime;
uniform float uDensity;
uniform float uRotationSpeed;
uniform vec3 uCloudColor;
uniform vec3 uSunDirection;

// Simple 3D hash-based noise
float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise3D(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);

  float n = mix(
    mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
        mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
    mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
        mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
    f.z);
  return n;
}

float fbm(vec3 p) {
  float val = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) {
    val += amp * noise3D(p);
    p *= 2.1;
    amp *= 0.5;
  }
  return val;
}

void main() {
  vec3 N = normalize(vNormal);

  // Rotate sample position for cloud movement
  float angle = uTime * uRotationSpeed;
  float c = cos(angle);
  float s = sin(angle);
  vec3 rotPos = vec3(
    vLocalPos.x * c - vLocalPos.z * s,
    vLocalPos.y,
    vLocalPos.x * s + vLocalPos.z * c
  );

  // Sample noise
  float n = fbm(rotPos * 5.0);

  // Threshold for cloud coverage
  float threshold = 1.0 - uDensity;
  float cloud = smoothstep(threshold - 0.1, threshold + 0.1, n);

  // Lighting
  float NdotL = max(dot(N, normalize(uSunDirection)), 0.0);
  float lighting = 0.2 + 0.8 * NdotL;

  vec3 color = uCloudColor * lighting;
  float alpha = cloud * 0.8;

  gl_FragColor = vec4(color, alpha);
}
