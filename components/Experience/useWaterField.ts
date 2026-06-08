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
// Constant absorption: each pixel loses ABSORB wetness/second, so what was wet
// first reaches 0 first; FILL lets lingered/repeated passes build wetness above
// 1 (up to WET_MAX) -> wetter areas take proportionally LONGER to absorb.
const ABSORB = 0.36; // wetness units drained per second (constant, per pixel)
const FILL = 1.3; // build-up rate per second while the brush is over a spot
const WET_MAX = 1.8; // max stored wetness (longer to absorb)
// Per-pixel delay before absorption starts (stored in the G channel). Longer
// when the spot is more saturated.
const HOLD_BASE = 1.0; // seconds of "no absorption" for a normally-wet spot
const HOLD_PER_WET = 1.3; // extra seconds per unit of wetness above 1 (saturation)
const SPREAD = 0.006; // diffusion sampling offset (uv): bigger = spreads faster
const SPREAD_GAIN = 0.5; // how strongly water spreads while wet (decays as it dries)
// Brush radius (uv) scales with cursor speed: slow -> narrow, fast -> wider (capped).
const RADIUS_MIN = 0.03;
const RADIUS_MAX = 0.07;
const SPEED_SLOW = 0.15; // uv/s -> min radius
const SPEED_FAST = 1.5; // uv/s -> max radius

const simFrag = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uPrev;
  uniform vec2  uMouseA;   // segment start (prev frame)
  uniform vec2  uMouseB;   // segment end (this frame = cursor)
  uniform float uActive;     // 1 if water is being added this frame
  uniform float uRadius;
  uniform float uAbsorb;     // wetness drained this frame once holding ends (ABSORB * dt)
  uniform float uFill;       // build-up this frame while over a spot (FILL * dt)
  uniform float uMaxWet;     // max stored wetness
  uniform float uDt;         // frame delta (s) — counts down the hold timer
  uniform float uHoldBase;   // base "no absorption" delay (s)
  uniform float uHoldPerWet; // extra delay per unit of wetness above 1 (s)
  uniform float uSpread;
  uniform float uSpreadGain; // spread strength (scaled by wetness -> decelerates)
  uniform float uAspect;     // layer width/height (keeps the brush round)

  // R = wetness, G = hold timer (seconds left before absorption starts).
  void main(){
    float c = texture2D(uPrev, vUv).r;
    float hold = texture2D(uPrev, vUv).g;
    float n = texture2D(uPrev, vUv + vec2(0.0, uSpread)).r;
    float s = texture2D(uPrev, vUv - vec2(0.0, uSpread)).r;
    float e = texture2D(uPrev, vUv + vec2(uSpread, 0.0)).r;
    float w = texture2D(uPrev, vUv - vec2(uSpread, 0.0)).r;
    float avg = (n + s + e + w) * 0.25;
    float local = max(c, max(max(n, s), max(e, w)));
    float k = clamp(local * uSpreadGain, 0.0, 0.5);
    float wet;

    if (hold > 0.0) {
      // EXPANSION phase (still wet, NO absorption): plain diffusion spreads the
      // trail STRAIGHT/round, following the stroke. The organic, irregular borders
      // are added by the LAYER shader (warped sampling) so the trail stays clean.
      hold = max(0.0, hold - uDt);
      wet = mix(c, avg, k);
    } else {
      // ABSORPTION phase: gentle decelerating diffusion + constant drain ->
      // wet-first dries-first, wetter lasts longer.
      wet = mix(c, avg, k) - uAbsorb;
    }

    if (uActive > 0.5){
      vec2 asp = vec2(uAspect, 1.0);
      vec2 A = uMouseA * asp;
      vec2 B = uMouseB * asp;
      vec2 P = vUv * asp;
      vec2 BA = B - A;
      float h = clamp(dot(P - A, BA) / max(dot(BA, BA), 1e-6), 0.0, 1.0);
      float d = distance(P, A + BA * h);
      float add = smoothstep(uRadius, uRadius * 0.2, d);
      wet = max(wet, add);    // instant visibility up to 1
      wet += add * uFill;     // lingered/repeated passes build up beyond 1
      wet = min(wet, uMaxWet);
      // refresh the hold while wetting; longer when more saturated (wet > 1).
      if (add > 0.02) {
        hold = max(hold, uHoldBase + max(0.0, wet - 1.0) * uHoldPerWet);
      }
    }

    gl_FragColor = vec4(clamp(wet, 0.0, uMaxWet), clamp(hold, 0.0, 6.0), 0.0, 1.0);
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
        uRadius: { value: RADIUS_MIN },
        uAbsorb: { value: 0 },
        uFill: { value: 0 },
        uMaxWet: { value: WET_MAX },
        uDt: { value: 0.016 },
        uHoldBase: { value: HOLD_BASE },
        uHoldPerWet: { value: HOLD_PER_WET },
        uSpread: { value: SPREAD },
        uSpreadGain: { value: SPREAD_GAIN },
        uAspect: { value: aspect },
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
  const radius = useRef(RADIUS_MIN);

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
    if (inp.has) activeUntil.current = clock.current + 11;
    if (clock.current > activeUntil.current) {
      inp.has = false;
      return;
    }

    const { read, write } = targets.current;
    const u = sim.material.uniforms;

    u.uPrev.value = read.texture;
    u.uAspect.value = aspect;

    // Brush width from movement speed (slow -> narrow, fast -> wide, capped).
    let targetR = RADIUS_MIN;
    if (inp.has) {
      const speed = inp.cur.distanceTo(inp.prev) / dt; // uv/s
      const tt = THREE.MathUtils.clamp(
        (speed - SPEED_SLOW) / (SPEED_FAST - SPEED_SLOW),
        0,
        1
      );
      targetR = RADIUS_MIN + (RADIUS_MAX - RADIUS_MIN) * tt;
    }
    radius.current = THREE.MathUtils.damp(radius.current, targetR, 8, dt);
    u.uRadius.value = radius.current;

    // Constant per-frame absorption + build-up rate + hold countdown.
    u.uAbsorb.value = ABSORB * dt;
    u.uFill.value = FILL * dt;
    u.uDt.value = dt;

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
