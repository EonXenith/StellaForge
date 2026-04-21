uniform float uTime;
uniform float uWaveAmplitude;
uniform float uWaveSpeed;

varying vec3 vNormal;
varying vec3 vWorldPos;
varying float vFresnel;

void main() {
  vec3 norm = normalize(position);

  // Simple wave displacement using sine offsets
  float wave = sin(norm.x * 20.0 + uTime * uWaveSpeed * 5.0) *
               sin(norm.y * 15.0 + uTime * uWaveSpeed * 3.0) *
               sin(norm.z * 18.0 + uTime * uWaveSpeed * 4.0);
  vec3 displaced = position + norm * wave * uWaveAmplitude;

  vNormal = normalize(normalMatrix * norm);
  vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
  vWorldPos = worldPos.xyz;

  vec3 viewDir = normalize(cameraPosition - worldPos.xyz);
  vFresnel = 1.0 - max(dot(viewDir, vNormal), 0.0);

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
