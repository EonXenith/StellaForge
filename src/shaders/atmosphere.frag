precision highp float;

varying vec3 vNormal;
varying vec3 vWorldPos;

uniform vec3 uAtmosphereColor;
uniform float uAtmosphereIntensity;
uniform vec3 uSunDirection;

void main() {
  vec3 viewDir = normalize(cameraPosition - vWorldPos);
  vec3 N = normalize(vNormal);

  // Fresnel glow - stronger at edges
  float fresnel = 1.0 - dot(viewDir, N);
  fresnel = pow(fresnel, 3.0) * uAtmosphereIntensity;

  // Sun-facing enhancement
  float sunFacing = max(dot(N, normalize(uSunDirection)), 0.0);
  fresnel *= (0.5 + 0.5 * sunFacing);

  gl_FragColor = vec4(uAtmosphereColor, fresnel);
}
