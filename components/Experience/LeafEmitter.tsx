"use client";

import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export type EmitReq = {
  x: number;
  y: number;
  z: number;
  r: number;
  g: number;
  b: number;
};

const COUNT = 600;

// Small gray flying leaves: leaf-shaped sprites that spin and flutter sideways,
// then fade to white (invisible under multiply = they dissolve).
export default function LeafEmitter({
  queue,
}: {
  queue: React.MutableRefObject<EmitReq[]>;
}) {
  const pool = useMemo(() => {
    const position = new Float32Array(COUNT * 3);
    const color = new Float32Array(COUNT * 3);
    const alpha = new Float32Array(COUNT);
    const size = new Float32Array(COUNT);
    const angle = new Float32Array(COUNT);
    const vel = new Float32Array(COUNT * 3);
    const spin = new Float32Array(COUNT);
    const phase = new Float32Array(COUNT);
    const flutter = new Float32Array(COUNT);
    const age = new Float32Array(COUNT);
    const life = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      alpha[i] = 0;
      size[i] = 0;
      age[i] = 2;
      life[i] = 1;
    }
    return {
      position, color, alpha, size, angle,
      vel, spin, phase, flutter, age, life, cursor: 0,
    };
  }, []);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pool.position, 3));
    g.setAttribute("aColor", new THREE.BufferAttribute(pool.color, 3));
    g.setAttribute("aAlpha", new THREE.BufferAttribute(pool.alpha, 1));
    g.setAttribute("aSize", new THREE.BufferAttribute(pool.size, 1));
    g.setAttribute("aAngle", new THREE.BufferAttribute(pool.angle, 1));
    return g;
  }, [pool]);

  const uniforms = useMemo(
    () => ({ uDpr: { value: 1 }, uSizeScale: { value: 30 } }),
    []
  );

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 1 / 30);
    uniforms.uDpr.value = state.gl.getPixelRatio();

    // Spawn from the queue.
    let spawns = 0;
    while (queue.current.length && spawns < 24) {
      const req = queue.current.shift()!;
      spawns++;
      const i = pool.cursor;
      pool.cursor = (pool.cursor + 1) % COUNT;
      const o = i * 3;
      pool.position[o] = req.x + (Math.random() - 0.5) * 0.06;
      pool.position[o + 1] = req.y + (Math.random() - 0.5) * 0.06;
      pool.position[o + 2] = req.z + 0.001;

      // Desaturated LIGHT gray with a faint leaf tint (soft).
      const lum = 0.299 * req.r + 0.587 * req.g + 0.114 * req.b;
      const gray = 0.74 + 0.1 * lum;
      const tint = 0.18;
      pool.color[o] = gray * (1 - tint) + req.r * tint;
      pool.color[o + 1] = gray * (1 - tint) + req.g * tint;
      pool.color[o + 2] = gray * (1 - tint) + req.b * tint;

      // Flight: small impulse, gentle gravity -> the leaf rises then falls.
      pool.vel[o] = (Math.random() - 0.5) * 0.3;
      pool.vel[o + 1] = 0.12 + Math.random() * 0.28;
      pool.vel[o + 2] = 0;

      pool.age[i] = 0;
      pool.life[i] = 1.4 + Math.random() * 1.4;
      pool.size[i] = 2.5 + Math.random() * 3; // smaller
      pool.alpha[i] = 1;
      pool.angle[i] = Math.random() * Math.PI * 2;
      pool.spin[i] = (Math.random() - 0.5) * 4;
      pool.phase[i] = Math.random() * Math.PI * 2;
      pool.flutter[i] = 2 + Math.random() * 3;
    }

    // Integration.
    for (let i = 0; i < COUNT; i++) {
      if (pool.age[i] >= pool.life[i]) {
        if (pool.alpha[i] !== 0) {
          pool.alpha[i] = 0;
          pool.size[i] = 0;
        }
        continue;
      }
      pool.age[i] += dt;
      const o = i * 3;
      pool.vel[o + 1] -= 0.35 * dt; // gravity: the leaf falls back down
      pool.position[o] +=
        pool.vel[o] * dt +
        Math.sin(pool.age[i] * pool.flutter[i] + pool.phase[i]) * 0.14 * dt;
      pool.position[o + 1] += pool.vel[o + 1] * dt;
      pool.angle[i] += pool.spin[i] * dt;
      const t = pool.age[i] / pool.life[i];
      // low alpha cap (soft/translucent leaves) + fade at end of life.
      pool.alpha[i] = Math.min(0.5, (1 - t) * 1.3);
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.aColor.needsUpdate = true;
    geometry.attributes.aAlpha.needsUpdate = true;
    geometry.attributes.aSize.needsUpdate = true;
    geometry.attributes.aAngle.needsUpdate = true;
  });

  return (
    <points geometry={geometry} renderOrder={50} frustumCulled={false}>
      <shaderMaterial
        uniforms={uniforms}
        transparent
        depthWrite={false}
        depthTest={false}
        toneMapped={false}
        blending={THREE.MultiplyBlending}
        vertexShader={/* glsl */ `
          attribute float aAlpha;
          attribute float aSize;
          attribute float aAngle;
          attribute vec3 aColor;
          varying float vAlpha;
          varying float vAngle;
          varying vec3 vColor;
          uniform float uDpr;
          uniform float uSizeScale;
          void main(){
            vAlpha = aAlpha;
            vAngle = aAngle;
            vColor = aColor;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = aSize * uDpr * (uSizeScale / -mv.z);
            gl_Position = projectionMatrix * mv;
          }
        `}
        fragmentShader={/* glsl */ `
          varying float vAlpha;
          varying float vAngle;
          varying vec3 vColor;
          void main(){
            // centered coords + rotation (leaf spinning)
            vec2 p = (gl_PointCoord - 0.5) * 2.2;
            float c = cos(vAngle), s = sin(vAngle);
            p = mat2(c, -s, s, c) * p;

            // leaf shape: ellipse pointed at both ends
            float taper = 1.0 - clamp(p.y * p.y, 0.0, 1.0); // 1 at center, 0 at tips
            float halfW = taper * 0.62;
            float body = 1.0 - smoothstep(halfW * 0.65, halfW, abs(p.x));
            float within = step(abs(p.y), 1.0);
            float leaf = clamp(body, 0.0, 1.0) * within;

            // central vein (subtle)
            float rib = smoothstep(0.045, 0.0, abs(p.x)) * within;

            float a = leaf * vAlpha;
            vec3 col = mix(vec3(1.0), vColor, a);       // multiply: white = invisible
            col = mix(col, col * 0.82, rib * a * 0.6);  // darken the vein
            gl_FragColor = vec4(col, 1.0);
          }
        `}
      />
    </points>
  );
}
