"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useFBO } from "@react-three/drei";
import * as THREE from "three";

// GPU water field simulated in a ping-pong FBO (in the layer's uv space, 0..1).
// Each frame: diffuse (water spreading) + decay (absorbed by the paper), and
// water is added along the mouse segment. The result is a single-channel
// "wetness" texture sampled by the layer shader.
//
//  - splat(u, v): add water at uv (called on pointer move)
//  - textureRef.current: the latest wetness texture

const SIM_RES = 256;
const ABSORB_TAU = 2.5; // absorption time constant (s) once it starts drying
const HOLD_TAU = 9.0; // near-hold while saturated -> delay before absorption
const SPREAD = 0.008; // diffusion sampling offset (uv): bigger = spreads faster
const BRUSH = 0.09; // radius of water added under the cursor (uv) — wider

const simFrag = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uPrev;
  uniform vec2  uMouseA;   // segment start (prev frame)
  uniform vec2  uMouseB;   // segment end (this frame)
  uniform float uActive;   // 1 if water is being added this frame
  uniform float uRadius;
  uniform float uDt;       // frame delta (s)
  uniform float uTau;      // absorption time constant once drying
  uniform float uTauHold;  // near-hold time constant while saturated
  uniform float uSpread;
  uniform float uAspect;   // layer width/height (keeps the brush round)
  uniform float uSeed;

  float hash(vec2 p){
    p = fract(p * vec2(123.34, 345.45));
    p += dot(p, p + 34.345);
    return fract(p.x * p.y);
  }

  void main(){
    // Diffusion: blend with neighbors (water spreading on paper).
    float c = texture2D(uPrev, vUv).r;
    float n = texture2D(uPrev, vUv + vec2(0.0, uSpread)).r;
    float s = texture2D(uPrev, vUv - vec2(0.0, uSpread)).r;
    float e = texture2D(uPrev, vUv + vec2(uSpread, 0.0)).r;
    float w = texture2D(uPrev, vUv - vec2(uSpread, 0.0)).r;
    float blur = c * 0.2 + (n + s + e + w) * 0.2;

    // Absorption: near-hold while saturated, then absorbs over ~uTau seconds.
    float hold = smoothstep(0.80, 1.0, blur);
    float tau = mix(uTau, uTauHold, hold);
    float wet = blur * exp(-uDt / tau);

    // Add water along the mouse segment (aspect-corrected -> round brush).
    if (uActive > 0.5){
      vec2 asp = vec2(uAspect, 1.0);
      vec2 P = vUv * asp;
      vec2 A = uMouseA * asp;
      vec2 B = uMouseB * asp;
      vec2 BA = B - A;
      float h = clamp(dot(P - A, BA) / max(dot(BA, BA), 1e-6), 0.0, 1.0);
      float d = distance(P, A + BA * h);
      float add = smoothstep(uRadius, uRadius * 0.25, d);
      // uneven absorption front -> organic edges
      float nz = 0.7 + 0.5 * hash(vUv * 220.0 + uSeed);
      wet = max(wet, add * nz);
    }

    gl_FragColor = vec4(clamp(wet, 0.0, 1.0), 0.0, 0.0, 1.0);
  }
`;

export function useWaterField(aspect: number) {
  const gl = useThree((s) => s.gl);

  const rtA = useFBO(SIM_RES, SIM_RES, { type: THREE.HalfFloatType, depthBuffer: false });
  const rtB = useFBO(SIM_RES, SIM_RES, { type: THREE.HalfFloatType, depthBuffer: false });
  const targets = useRef({ read: rtA, write: rtB });
  const textureRef = useRef<THREE.Texture>(rtA.texture);

  const sim = useMemo(() => {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uPrev: { value: null as THREE.Texture | null },
        uMouseA: { value: new THREE.Vector2(-1, -1) },
        uMouseB: { value: new THREE.Vector2(-1, -1) },
        uActive: { value: 0 },
        uRadius: { value: BRUSH },
        uDt: { value: 0.016 },
        uTau: { value: ABSORB_TAU },
        uTauHold: { value: HOLD_TAU },
        uSpread: { value: SPREAD },
        uAspect: { value: aspect },
        uSeed: { value: 0 },
      },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: simFrag,
      depthTest: false,
      depthWrite: false,
    });
    const scene = new THREE.Scene();
    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    return { material, scene, cam };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const input = useRef({
    cur: new THREE.Vector2(),
    prev: new THREE.Vector2(),
    has: false,
    wasActive: false,
  });

  // Run the sim only while the sheet is "active" (recently wet). Idle sheets are
  // paused entirely -> with N layers, only the one being interacted with runs.
  const clock = useRef(0);
  const activeUntil = useRef(0);

  function splat(u: number, v: number) {
    input.current.cur.set(u, v);
    input.current.has = true;
  }

  // Clear both targets once at startup.
  useEffect(() => {
    const prev = gl.getRenderTarget();
    gl.setRenderTarget(rtA);
    gl.setClearColor(0x000000, 1);
    gl.clear();
    gl.setRenderTarget(rtB);
    gl.clear();
    gl.setRenderTarget(prev);
  }, [gl, rtA, rtB]);

  useFrame((_, dtRaw) => {
    const inp = input.current;
    const dt = Math.min(dtRaw, 1 / 30);
    clock.current += dt;

    // Keep the sim alive for a cooldown after the last splat (covers absorption),
    // then pause it entirely. Skipping idle sheets saves most of the GPU cost.
    if (inp.has) activeUntil.current = clock.current + 8;
    if (clock.current > activeUntil.current) {
      inp.has = false;
      return;
    }

    const { read, write } = targets.current;
    const u = sim.material.uniforms;

    u.uPrev.value = read.texture;
    u.uAspect.value = aspect;
    u.uDt.value = dt;
    u.uSeed.value += dt * 60.0;

    if (inp.has) {
      if (!inp.wasActive) inp.prev.copy(inp.cur); // resumed -> no jump line
      u.uActive.value = 1;
      u.uMouseA.value.copy(inp.prev);
      u.uMouseB.value.copy(inp.cur);
    } else {
      u.uActive.value = 0;
    }

    const prevTarget = gl.getRenderTarget();
    gl.setRenderTarget(write);
    gl.render(sim.scene, sim.cam);
    gl.setRenderTarget(prevTarget);

    // ping-pong swap
    targets.current.read = write;
    targets.current.write = read;
    textureRef.current = write.texture;

    if (inp.has) inp.prev.copy(inp.cur);
    inp.wasActive = inp.has;
    inp.has = false;
  });

  return { textureRef, splat };
}
