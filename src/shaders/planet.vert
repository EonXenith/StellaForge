attribute float aHeight;
attribute float aBiomeId;
attribute float aBrushWeight;

varying float vHeight;
varying float vBiomeId;
varying float vBrushWeight;
varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec3 vViewDir;

uniform float uHeightScale;
uniform float uRadius;

void main() {
  // Pass per-vertex data to fragment shader
  vHeight = aHeight;
  vBiomeId = aBiomeId;
  vBrushWeight = aBrushWeight;

  // Displace vertex along its unit-sphere direction
  vec3 dir = normalize(position);
  vec3 displaced = dir * (uRadius + aHeight * uHeightScale);

  vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
  vWorldPos = worldPos.xyz;

  // World-space normal from geometry normals (recomputed on CPU after displacement)
  vNormal = normalize(normalMatrix * normal);

  // View direction for specular / fresnel in fragment shader
  vViewDir = normalize(cameraPosition - worldPos.xyz);

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
