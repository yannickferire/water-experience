// Shaders for a single diorama layer.
//
// The "wetness" comes from a GPU water field (see useWaterField): a texture in
// uv space where water is added along the mouse, spreads (diffusion) and is
// absorbed by the paper (decay). Here we just SAMPLE it (uWet) and derive:
//   - core: high wetness  -> opacity to 100% + drives the distortion
//   - halo: lower wetness -> opacity to ~65%
// Multiply compositing is handled by the material blending, not here.

export const layerVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const layerFragmentShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;

  uniform sampler2D uMap;
  uniform sampler2D uWet;       // wetness field (.r = wetness 0..1)
  uniform float uTime;
  uniform float uDistort;       // max distortion amplitude
  uniform float uBaseOpacity;   // opacity at rest (~0.5)

  // --- 2D Simplex noise (Ashima) ---
  vec3 mod289(vec3 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
  vec2 mod289(vec2 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
  vec3 permute(vec3 x){ return mod289(((x*34.0)+1.0)*x); }
  float snoise(vec2 v){
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                       -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0,0.0) : vec2(0.0,1.0);
    vec4 x12 = x0.xyxy + C.xxzz; x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0))
                              + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m; m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  void main(){
    // Sample the wetness field with a small noise warp -> organic, wavy edges.
    vec2 warp = vec2(snoise(vUv * 4.0 + 7.3), snoise(vUv * 4.0 + 19.1));
    float wet = texture2D(uWet, vUv + warp * 0.02).r;

    // Two levels derived from the same field.
    float halo = smoothstep(0.06, 0.30, wet);
    float core = smoothstep(0.40, 0.75, wet);

    // Local distortion follows the wet area, fades as it gets absorbed.
    float t = uTime * 0.5;
    vec2 dwarp = vec2(
      snoise(vUv * 3.0 + vec2(t, 1.7)),
      snoise(vUv * 3.0 + vec2(-1.3, t))
    );
    vec2 uv = vUv + dwarp * (uDistort * halo);

    vec3 col = texture2D(uMap, uv).rgb;

    // Paper knockout: light & low-saturation pixels (white paper) -> pure white,
    // invisible under multiply. Colored leaves untouched.
    float luma = dot(col, vec3(0.299, 0.587, 0.114));
    float mx = max(col.r, max(col.g, col.b));
    float mn = min(col.r, min(col.g, col.b));
    float sat = mx - mn;
    float paper = smoothstep(0.86, 0.98, luma) * (1.0 - smoothstep(0.05, 0.13, sat));
    col = mix(col, vec3(1.0), paper);

    // Opacity, three levels: base (~50%) -> halo to 65% -> core to 100%.
    // (Under multiply, "less opaque" = pigment pushed toward white.)
    float opacity = uBaseOpacity;
    opacity = max(opacity, mix(uBaseOpacity, 0.65, halo));
    opacity = max(opacity, mix(uBaseOpacity, 1.00, core));
    col = mix(vec3(1.0), col, opacity);

    gl_FragColor = vec4(col, 1.0);
  }
`;
