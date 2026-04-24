precision highp float;

// --- Current shader audit ---
// Uniforms: uBiomeColors (16x1 DataTexture, alpha=emissive flag), uSunDirection,
//   uSunColor, uAmbient, uCityLightColor, uDayNightEnabled, uSeaLevel, uSnowLevel
// Varyings: vHeight (elevation -1..1), vBiomeId, vBrushWeight, vNormal (world),
//   vWorldPos, vViewDir
// Pipeline: biome lookup → elevation tint → water branch → lambert + specular →
//   atmosphere rim → city lights → brush overlay

varying float vHeight;
varying float vBiomeId;
varying float vBrushWeight;
varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec3 vViewDir;

uniform sampler2D uBiomeColors; // 16x1 RGBA DataTexture, alpha = emissive flag
uniform vec3 uSunDirection;
uniform vec3 uSunColor;
uniform float uAmbient;
uniform vec3 uCityLightColor;
uniform float uDayNightEnabled;
uniform float uSeaLevel;
uniform float uSnowLevel;

void main() {
  // --- Biome base color from DataTexture ---
  float u = (vBiomeId + 0.5) / 16.0;
  vec4 biomeSample = texture2D(uBiomeColors, vec2(u, 0.5));
  vec3 baseColor = biomeSample.rgb;
  float isEmissive = biomeSample.a;

  vec3 N = normalize(vNormal);
  vec3 V = normalize(vViewDir);
  vec3 L = normalize(uSunDirection);

  // --- Biome IDs that should NOT get snow caps ---
  // 0=Ocean, 4=Desert, 7=Volcanic
  int biomeInt = int(vBiomeId + 0.5);
  bool noSnow = (biomeInt == 0 || biomeInt == 4 || biomeInt == 7);

  // --- Water branch ---
  bool isWater = vHeight < uSeaLevel;
  vec3 color;

  if (isWater) {
    // Depth-modulated ocean color
    float depth = clamp((uSeaLevel - vHeight) / 0.3, 0.0, 1.0);
    vec3 shallow = vec3(0.12, 0.40, 0.55);
    vec3 deep    = vec3(0.02, 0.08, 0.22);
    color = mix(shallow, deep, depth);

    // Specular highlight from sun
    vec3 R = reflect(-L, N);
    float spec = pow(max(dot(R, V), 0.0), 48.0);
    color += vec3(1.0) * spec * 0.5;

    // Fresnel rim brightening at grazing angles
    float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.0);
    color += vec3(0.15, 0.25, 0.35) * fresnel;
  } else {
    // --- Elevation-based color modulation for land ---
    float elev = vHeight;

    // Shoreline tint near sea level
    float shoreBlend = 1.0 - smoothstep(uSeaLevel, uSeaLevel + 0.04, elev);
    vec3 shoreColor = vec3(0.75, 0.72, 0.55);
    color = mix(baseColor, shoreColor, shoreBlend * 0.4);

    // High elevation: blend toward gray rock
    float rockBlend = smoothstep(0.45, 0.65, elev);
    vec3 rockColor = vec3(0.50, 0.47, 0.43);
    color = mix(color, rockColor, rockBlend * 0.5);

    // Very high elevation: snow caps (skip for desert/volcanic/ocean biomes)
    if (!noSnow) {
      float snowBlend = smoothstep(uSnowLevel - 0.05, uSnowLevel + 0.05, elev);
      color = mix(color, vec3(0.95, 0.96, 0.98), snowBlend);
    }
  }

  // --- Directional (Lambert) lighting ---
  float NdotL = max(dot(N, L), 0.0);
  color *= (uAmbient + (1.0 - uAmbient) * NdotL) * uSunColor;

  // --- Atmospheric rim glow ---
  float rim = pow(1.0 - max(dot(N, V), 0.0), 2.5);
  color += vec3(0.4, 0.6, 0.9) * rim * 0.3;

  // --- City lights on dark side (emissive biomes only) ---
  if (uDayNightEnabled > 0.5 && isEmissive > 0.5) {
    float darkSide = smoothstep(0.05, -0.1, NdotL);
    color += uCityLightColor * darkSide * 0.6;
  }

  // --- Brush preview overlay (composited LAST so it's always visible) ---
  color = mix(color, vec3(1.0, 1.0, 0.6), vBrushWeight * 0.4);

  gl_FragColor = vec4(color, 1.0);
}
