precision highp float;

varying float vHeight;
varying float vBiomeId;
varying float vBrushWeight;
varying vec3 vNormal;
varying vec3 vWorldPos;

uniform sampler2D uBiomeColors; // 1D DataTexture (16x1)
uniform vec3 uSunDirection;
uniform vec3 uSunColor;
uniform float uAmbient;

void main() {
  // Sample biome color from DataTexture (16 biomes, centered texel)
  float u = (vBiomeId + 0.5) / 16.0;
  vec3 biomeColor = texture2D(uBiomeColors, vec2(u, 0.5)).rgb;

  // Diffuse lighting
  vec3 N = normalize(vNormal);
  float NdotL = max(dot(N, normalize(uSunDirection)), 0.0);
  vec3 diffuse = biomeColor * (uAmbient + (1.0 - uAmbient) * NdotL) * uSunColor;

  // Rim lighting
  vec3 viewDir = normalize(cameraPosition - vWorldPos);
  float rim = 1.0 - max(dot(viewDir, N), 0.0);
  rim = pow(rim, 3.0) * 0.3;

  vec3 color = diffuse + vec3(rim * 0.2, rim * 0.3, rim * 0.5);

  // Brush highlight overlay
  color = mix(color, vec3(1.0, 1.0, 0.6), vBrushWeight * 0.4);

  gl_FragColor = vec4(color, 1.0);
}
