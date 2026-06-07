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
const HOLD = 1.0; // seconds with NO absorption at all (water stays put)
const ABSORB_TAU = 2.6; // amplitude fade time constant once it starts drying
const ERODE = 0.05; // shrink rate once drying (eats edges -> contracts)
const SPREAD = 0.006; // diffusion sampling offset (uv): bigger = spreads faster
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
  uniform float uActive;   // 1 if water is being added this frame
  uniform float uRadius;
  uniform float uDecay;    // multiplicative amplitude fade (1 = hold)
  uniform float uErode;    // subtractive shrink (0 = hold)
  uniform float uSpread;
  uniform float uAspect;   // layer width/height (keeps the brush round)

  void main(){
    // Diffusion: blend with neighbors (water spreading on paper).
    float c = texture2D(uPrev, vUv).r;
    float n = texture2D(uPrev, vUv + vec2(0.0, uSpread)).r;
    float s = texture2D(uPrev, vUv - vec2(0.0, uSpread)).r;
    float e = texture2D(uPrev, vUv + vec2(uSpread, 0.0)).r;
    float w = texture2D(uPrev, vUv - vec2(uSpread, 0.0)).r;
    float blur = c * 0.2 + (n + s + e + w) * 0.2;

    // Absorption: hold (decay=1, erode=0), then fade (decay<1) + shrink (erode>0).
    float wet = blur * uDecay - uErode;

    if (uActive > 0.5){
      vec2 asp = vec2(uAspect, 1.0);
      vec2 A = uMouseA * asp;
      vec2 B = uMouseB * asp;
      // ROUND deposit along the movement segment (round caps -> round head at the
      // cursor). The trail forms behind from the motion; the organic look comes
      // from how the layer samples the spreading field, not from the deposit.
      vec2 P = vUv * asp;
      vec2 BA = B - A;
      float h = clamp(dot(P - A, BA) / max(dot(BA, BA), 1e-6), 0.0, 1.0);
      float d = distance(P, A + BA * h);
      float add = smoothstep(uRadius, uRadius * 0.2, d);
      wet = max(wet, add);
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
        uRadius: { value: RADIUS_MIN },
        uDecay: { value: 1 },
        uErode: { value: 0 },
        uSpread: { value: SPREAD },
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
  const lastSplat = useRef(-999);
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
    if (inp.has) activeUntil.current = clock.current + 7;
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

    // Absorption: nothing for HOLD seconds after the last splat, then fade + shrink.
    if (inp.has) lastSplat.current = clock.current;
    const dryT = clock.current - lastSplat.current;
    if (dryT < HOLD) {
      u.uDecay.value = 1;
      u.uErode.value = 0;
    } else {
      u.uDecay.value = Math.exp(-dt / ABSORB_TAU);
      u.uErode.value = ERODE * dt;
    }

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
