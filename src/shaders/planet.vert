attribute float aHeight;
attribute float aBiomeId;
attribute float aBrushWeight;

varying float vHeight;
varying float vBiomeId;
varying float vBrushWeight;
varying vec3 vNormal;
varying vec3 vWorldPos;

uniform float uHeightScale;
uniform float uRadius;

void main() {
  vec3 normal = normalize(normalMatrix * normal);
  vNormal = normal;
  vHeight = aHeight;
  vBiomeId = aBiomeId;
  vBrushWeight = aBrushWeight;

  // Displace vertex along its normal (unit sphere direction = position normalized)
  vec3 dir = normalize(position);
  vec3 displaced = dir * (uRadius + aHeight * uHeightScale);

  vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
  vWorldPos = worldPos.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
