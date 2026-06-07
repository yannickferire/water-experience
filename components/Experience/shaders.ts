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
  uniform float uAppear;        // 0..1 organic "ink-bloom" reveal

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

  // "Paper-ness" (0 pigment, 1 paper) of the image at a given uv.
  float paperAt(vec2 p){
    vec3 c = texture2D(uMap, p).rgb;
    float l = dot(c, vec3(0.299, 0.587, 0.114));
    float s = max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b));
    return smoothstep(0.86, 0.98, l) * (1.0 - smoothstep(0.05, 0.13, s));
  }

  void main(){
    // Sample the wet field. The organic edge warp is scaled by how FAINT the
    // wetness is: ~0 at the strong center (round spot near the cursor), full at
    // the faint spreading edges (organic only when it spreads further out).
    float wet0 = texture2D(uWet, vUv).r;
    float warpAmt = 1.0 - smoothstep(0.0, 0.55, wet0);
    vec2 warp = (vec2(snoise(vUv * 4.0 + 7.3), snoise(vUv * 4.0 + 19.1)) * 0.03
              +  vec2(snoise(vUv * 9.0 + 31.0), snoise(vUv * 9.0 + 43.0)) * 0.015) * warpAmt;
    float wet = texture2D(uWet, vUv + warp).r;

    // Single sharp waterline (one layer only — no halo).
    float shape = smoothstep(0.30, 0.46, wet);

    // ERODED interior mask: take the max "paper-ness" over a neighborhood, so any
    // structure thinner than the erosion radius (trunk, branches) drops to 0 and
    // never distorts, while large masses (canopy) keep distorting. The silhouette
    // also stays fixed since distortion -> 0 near every pigment/paper boundary.
    float o = 0.045; // erosion radius (uv) ~ half the trunk width
    float paperMax = paperAt(vUv);
    paperMax = max(paperMax, paperAt(vUv + vec2(o, 0.0)));
    paperMax = max(paperMax, paperAt(vUv - vec2(o, 0.0)));
    paperMax = max(paperMax, paperAt(vUv + vec2(0.0, o)));
    paperMax = max(paperMax, paperAt(vUv - vec2(0.0, o)));
    paperMax = max(paperMax, paperAt(vUv + vec2(o, o) * 0.7));
    paperMax = max(paperMax, paperAt(vUv - vec2(o, o) * 0.7));
    paperMax = max(paperMax, paperAt(vUv + vec2(o, -o) * 0.7));
    paperMax = max(paperMax, paperAt(vUv - vec2(o, -o) * 0.7));
    float interior = 1.0 - paperMax;

    // Reveal in TWO stages: the textured PAPER shape comes in first (paperReveal),
    // then the watercolor pigment reveals on top via several staggered noise
    // "droplet" layers (pigReveal) -> the painting appears in waves of drops.
    float paperReveal = smoothstep(0.0, 0.3, uAppear);
    float prog = clamp((uAppear - 0.28) / 0.72, 0.0, 1.0) * 1.4 - 0.2;
    float n1 = snoise(vUv * 2.0 + 4.0) * 0.5 + 0.5;
    float n2 = snoise(vUv * 3.3 + 21.0) * 0.5 + 0.5;
    float n3 = snoise(vUv * 5.0 + 60.0) * 0.5 + 0.5;
    float l1 = smoothstep(n1 - 0.25, n1 + 0.25, prog + 0.18);
    float l2 = smoothstep(n2 - 0.25, n2 + 0.25, prog);
    float l3 = smoothstep(n3 - 0.25, n3 + 0.25, prog - 0.18);
    float pigReveal = (l1 + l2 + l3) / 3.0;

    // Distortion: displace the sampled image a few px in a slowly-shifting,
    // locally-uniform direction (low-freq + ANIMATED -> the shift is felt, but no
    // per-pixel zigzag/swirl). Confined to the wet area + interior (edges fixed).
    vec2 off = vec2(
      snoise(vUv * 1.2 + vec2(uTime * 0.3, 0.0)),
      snoise(vUv * 1.2 + vec2(0.0, uTime * 0.3) + 30.0)
    );
    vec2 uv = vUv + off * (uDistort * shape * interior);

    vec3 img = texture2D(uMap, uv).rgb;

    // Coverage = ALPHA: pigment is opaque, the white paper around is transparent.
    // -> the element is OPAQUE over whatever is behind it (no see-through).
    float luma = dot(img, vec3(0.299, 0.587, 0.114));
    float sat = max(img.r, max(img.g, img.b)) - min(img.r, min(img.g, img.b));
    float paper = smoothstep(0.86, 0.98, luma) * (1.0 - smoothstep(0.05, 0.13, sat));
    float cov = 1.0 - paper;

    // Opaque textured paper base sitting in the element's shape (subtle grain).
    float grain = snoise(vUv * 230.0) * 0.5 + 0.5;
    vec3 paperCol = vec3(0.97, 0.96, 0.93) - grain * 0.05;

    // Pigment: paper reveals first, then the watercolor; base strength at rest,
    // full where wet. The shape stays opaque (the paper); only the pigment fades.
    float pig = mix(uBaseOpacity, 1.0, shape) * pigReveal;
    vec3 col = mix(paperCol, img, pig);

    float alpha = cov * paperReveal;
    gl_FragColor = vec4(col, alpha);
  }
`;
