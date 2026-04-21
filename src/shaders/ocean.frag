precision highp float;

varying vec3 vNormal;
varying vec3 vWorldPos;
varying float vFresnel;

uniform vec3 uShallowColor;
uniform vec3 uDeepColor;
uniform vec3 uSunDirection;
uniform vec3 uSunColor;

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(cameraPosition - vWorldPos);
  vec3 L = normalize(uSunDirection);

  // Color blend based on view angle
  float fresnelPow = pow(vFresnel, 3.0);
  vec3 oceanColor = mix(uShallowColor, uDeepColor, fresnelPow);

  // Diffuse
  float NdotL = max(dot(N, L), 0.0);
  vec3 diffuse = oceanColor * (0.2 + 0.8 * NdotL) * uSunColor;

  // Specular (Blinn-Phong)
  vec3 H = normalize(L + V);
  float spec = pow(max(dot(N, H), 0.0), 64.0);
  vec3 specular = uSunColor * spec * 0.6;

  // Opacity: more transparent at direct view, more opaque at edges
  float alpha = mix(0.5, 0.85, fresnelPow);

  gl_FragColor = vec4(diffuse + specular, alpha);
}
