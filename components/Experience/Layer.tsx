"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import type { LayerDef } from "@/lib/scene";
import { layerFragmentShader, layerVertexShader } from "./shaders";
import LeafEmitter, { type EmitReq } from "./LeafEmitter";
import { useWaterField } from "./useWaterField";

const BLEND: Record<string, THREE.Blending> = {
  multiply: THREE.MultiplyBlending,
  normal: THREE.NormalBlending,
  screen: THREE.AdditiveBlending, // (light-on-dark: handled later)
};

const damp = THREE.MathUtils.damp;

// Static tilt: makes the layer read like a drawing sheet in 3D.
const BASE_TILT_X = -0.05;
const BASE_TILT_Y = 0.1;

// Particles: bottom of the image = grass/trunk -> no leaves there.
const LEAF_MIN_V = 0.32;
// Chance to emit on each move (keeps it subtle).
const LEAF_CHANCE = 0.28;

type Props = { def: LayerDef; order: number };
type Sampler = { data: Uint8ClampedArray; w: number; h: number };

export default function Layer({ def, order }: Props) {
  const { viewport, pointer } = useThree();
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const mouse = useRef(new THREE.Vector2(0, 0));
  const queue = useRef<EmitReq[]>([]);

  const tex = useTexture(def.src);
  useMemo(() => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.anisotropy = 4;
    tex.needsUpdate = true;
  }, [tex]);

  const img = tex.image as { width: number; height: number } | undefined;
  const aspect = img?.width ? img.width / img.height : 1;

  // GPU water field (wetness texture driven by the cursor).
  const water = useWaterField(aspect);

  // CPU sampler (to detect foliage + its color for the leaf particles).
  const sampler = useMemo<Sampler | null>(() => {
    if (!def.particles) return null;
    const image = tex.image as HTMLImageElement | undefined;
    if (!image?.width) return null;
    const c = document.createElement("canvas");
    c.width = image.width;
    c.height = image.height;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(image, 0, 0);
    return {
      data: ctx.getImageData(0, 0, c.width, c.height).data,
      w: c.width,
      h: c.height,
    };
  }, [tex, def.particles]);

  const uniforms = useMemo(
    () => ({
      uMap: { value: tex },
      uWet: { value: null as THREE.Texture | null },
      uTime: { value: 0 },
      uDistort: { value: def.distortion ?? 0.016 },
      uBaseOpacity: { value: def.baseOpacity ?? 0.5 },
    }),
    [tex, def.distortion, def.baseOpacity]
  );

  const h = def.scale * viewport.height;
  const w = h * aspect;
  const baseX = def.x * viewport.width * 0.5;
  const baseY = def.y * viewport.height;

  useFrame((_, dt) => {
    const mesh = meshRef.current;
    const mat = matRef.current;
    if (!mesh || !mat) return;

    mouse.current.x = damp(mouse.current.x, pointer.x, 6, dt);
    mouse.current.y = damp(mouse.current.y, pointer.y, 6, dt);

    mat.uniforms.uTime.value += dt;
    mat.uniforms.uWet.value = water.textureRef.current;

    // INVERSE movement to the mouse (deeper = moves more).
    const amp = def.depth * 0.06;
    mesh.position.x = baseX - mouse.current.x * amp * viewport.width;
    mesh.position.y = baseY - mouse.current.y * amp * viewport.height;

    // "3D sheet" tilt, reacting to the mouse.
    mesh.rotation.y = BASE_TILT_Y + mouse.current.x * 0.12;
    mesh.rotation.x = BASE_TILT_X - mouse.current.y * 0.12;
  });

  const onMove = (e: ThreeEvent<PointerEvent>) => {
    if (!e.uv) return;
    const u = e.uv.x;
    const v = e.uv.y;

    // Add water at the cursor (the field handles spreading + absorption).
    water.splat(u, v);

    // Particles: only over the foliage (green pigment).
    if (!sampler) return;
    const x = Math.min(sampler.w - 1, Math.max(0, Math.floor(u * sampler.w)));
    const y = Math.min(sampler.h - 1, Math.max(0, Math.floor((1 - v) * sampler.h)));
    const i = (y * sampler.w + x) * 4;
    const r = sampler.data[i] / 255;
    const g = sampler.data[i + 1] / 255;
    const b = sampler.data[i + 2] / 255;
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    const sat = Math.max(r, g, b) - Math.min(r, g, b);
    const isPaper = luma > 0.9 && sat < 0.08;
    // foliage = green pigment, upper part (excludes grass + trunk).
    const isLeaf =
      !isPaper && v > LEAF_MIN_V && g >= r * 0.92 && g >= b * 0.85 && luma < 0.92;
    if (!isLeaf || Math.random() > LEAF_CHANCE || queue.current.length > 40) return;

    const p = e.point;
    queue.current.push({ x: p.x, y: p.y, z: p.z, r, g, b });
  };

  return (
    <>
      <mesh ref={meshRef} scale={[w, h, 1]} renderOrder={order} onPointerMove={onMove}>
        <planeGeometry args={[1, 1]} />
        <shaderMaterial
          ref={matRef}
          vertexShader={layerVertexShader}
          fragmentShader={layerFragmentShader}
          uniforms={uniforms}
          transparent
          blending={BLEND[def.blend ?? "multiply"]}
          depthWrite={false}
          depthTest={false}
          toneMapped={false}
        />
      </mesh>
      {def.particles && <LeafEmitter queue={queue} />}
    </>
  );
}
