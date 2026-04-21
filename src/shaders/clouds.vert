varying vec3 vWorldPos;
varying vec3 vNormal;
varying vec3 vLocalPos;

void main() {
  vLocalPos = position;
  vNormal = normalize(normalMatrix * normal);
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPos = worldPos.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
