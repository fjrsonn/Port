precision highp float;

uniform sampler2D uTexture;
uniform sampler2D uTargetTexture;
uniform float uMorphProgress;
uniform float uOpacity;

varying vec2 vPUv;
varying vec2 vTargetPUv;
varying vec2 vUv;

void main() {
  vec4 color = vec4(0.0);
  vec2 uv = vUv;
  vec2 puv = vPUv;

  float morphProgress = smoothstep(0.12, 0.74, uMorphProgress);
  vec4 sourceColor = texture2D(uTexture, puv);
  vec4 targetColor = texture2D(uTargetTexture, vTargetPUv);
  vec4 colA = mix(sourceColor, targetColor, morphProgress);

  float grey = colA.r * 0.21 + colA.g * 0.71 + colA.b * 0.07;
  vec4 colB = vec4(grey, grey, grey, 1.0);

  float border = 0.3;
  float radius = 0.5;
  float dist = radius - distance(uv, vec2(0.5));
  float t = smoothstep(0.0, border, dist);

  color = colB;
  color.a = t * uOpacity;

  gl_FragColor = color;
}
