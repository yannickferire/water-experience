"use client";

import { Suspense, useMemo, useRef, useState } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import type { LayerDef } from "@/lib/scene";
import { layerFragmentShader, layerVertexShader } from "./shaders";
import LeafEmitter, { type EmitReq } from "./LeafEmitter";
import { useWaterField } from "./useWaterField";
import { setCursorHover } from "@/lib/cursor";

const damp = THREE.MathUtils.damp;

// Static tilt: makes the layer read like a drawing sheet in 3D.
const BASE_TILT_X = -0.05;
const BASE_TILT_Y = 0.1;

// Particles: bottom of the image = grass/trunk -> no leaves there.
const LEAF_MIN_V = 0.32;
// Chance to emit on each move (keeps it subtle).
const LEAF_CHANCE = 0.28;
// Horizontal travel over the full scroll (viewport widths, parallax=1).
// Bigger = more empty space between the season stations.
const SCROLL_SPAN = 3.5;
// Zoom amplitude over the journey (subtle, so stations stay roughly centered).
const ZOOM_AMP = 0.18;
// Mount (lazy-load the texture) when the scroll is within this of the station.
const ENTER_MARGIN = 0.55;
// Reveal TRIGGERS when the station comes within this of the scroll, then blooms
// over time (below). 0.28 < the 0.333 station gap so neighbours don't pre-reveal.
const REVEAL_START = 0.28;
const INTRO_MS = 2.8; // bloom duration once a layer's reveal is triggered

type Props = {
  def: LayerDef;
  order: number;
  scrollRef: React.MutableRefObject<number>;
};
type Sampler = { data: Uint8ClampedArray; w: number; h: number };

// Wrapper: nothing is loaded/rendered until the layer's station nears the view.
// Once mounted it stays mounted (no reload / no re-reveal).
export default function Layer({ def, order, scrollRef }: Props) {
  const [mounted, setMounted] = useState(false);

  useFrame(() => {
    if (mounted) return;
    if (Math.abs(scrollRef.current - def.station) < ENTER_MARGIN) setMounted(true);
  });

  if (!mounted) return null;
  return (
    <Suspense fallback={null}>
      <LayerContent def={def} order={order} scrollRef={scrollRef} />
    </Suspense>
  );
}

// Content: loaded only once mounted; its reveal starts on mount (= on view enter).
function LayerContent({ def, order, scrollRef }: Props) {
  const { viewport, pointer } = useThree();
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const mouse = useRef(new THREE.Vector2(0, 0));
  const queue = useRef<EmitReq[]>([]);
  const hoverObj = useRef(false); // currently over the painted object (not paper)
  const elapsed = useRef(0); // bloom clock (counts up once the reveal is triggered)
  const revealStarted = useRef(false); // latched: has the reveal begun?
  const maxAppear = useRef(0); // latched reveal (so it stays revealed once shown)

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

  // CPU sampler (to detect paper vs object for hover + foliage for particles).
  const sampler = useMemo<Sampler | null>(() => {
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
  }, [tex]);

  const uniforms = useMemo(
    () => ({
      uMap: { value: tex },
      uWet: { value: null as THREE.Texture | null },
      uTime: { value: 0 },
      uDistort: { value: def.distortion ?? 0.016 },
      uBaseOpacity: { value: def.baseOpacity ?? 0.5 },
      uAppear: { value: 0 },
    }),
    [tex, def.distortion, def.baseOpacity]
  );

  const h = def.scale * viewport.height;
  const w = h * aspect;
  // Centered at scroll = def.station regardless of parallax: at that scroll the
  // pan exactly cancels, leaving only offsetX. (screen_x = offsetX*W/2 at station)
  const baseX =
    (def.offsetX ?? 0) * viewport.width * 0.5 +
    def.station * (def.parallax ?? 1) * viewport.width * SCROLL_SPAN;
  const baseY = def.y * viewport.height;

  useFrame((_, dt) => {
    const mesh = meshRef.current;
    const mat = matRef.current;
    if (!mesh || !mat) return;

    mouse.current.x = damp(mouse.current.x, pointer.x, 6, dt);
    mouse.current.y = damp(mouse.current.y, pointer.y, 6, dt);

    mat.uniforms.uTime.value += dt;
    mat.uniforms.uWet.value = water.textureRef.current;

    const scroll = scrollRef.current;

    // The reveal TRIGGERS once the station comes within REVEAL_START of the scroll
    // (so the layer in view at load, d=0, blooms immediately), then runs over
    // INTRO_MS by TIME — always visible however fast you scroll. Latched via
    // revealStarted + maxAppear so it never restarts or un-reveals. uAppear feeds
    // the two-stage (paper then pigment) droplet reveal in the shader.
    const d = Math.abs(scroll - def.station);
    if (revealStarted.current || d < REVEAL_START) {
      revealStarted.current = true;
      elapsed.current += dt;
      const e = THREE.MathUtils.clamp(elapsed.current / INTRO_MS, 0, 1);
      maxAppear.current = Math.max(maxAppear.current, 1 - Math.pow(1 - e, 3));
    }
    mat.uniforms.uAppear.value = maxAppear.current;
    const panX = -scroll * (def.parallax ?? 1) * viewport.width * SCROLL_SPAN;
    const zoom = 1 + ZOOM_AMP * Math.sin(scroll * Math.PI);

    const amp = def.depth * 0.06;
    const px = baseX + panX - mouse.current.x * amp * viewport.width;
    const py = baseY - mouse.current.y * amp * viewport.height;

    mesh.position.set(px * zoom, py * zoom, 0);
    mesh.scale.set((def.flipX ? -w : w) * zoom, h * zoom, 1);

    if (def.tilt) {
      mesh.rotation.y = BASE_TILT_Y + mouse.current.x * 0.12;
      mesh.rotation.x = BASE_TILT_X - mouse.current.y * 0.12;
    }
  });

  const setHover = (over: boolean) => {
    if (over === hoverObj.current) return;
    hoverObj.current = over;
    setCursorHover(over);
  };

  const onMove = (e: ThreeEvent<PointerEvent>) => {
    if (!e.uv || !sampler) return;
    const u = e.uv.x;
    const v = e.uv.y;

    water.splat(u, v);

    const x = Math.min(sampler.w - 1, Math.max(0, Math.floor(u * sampler.w)));
    const y = Math.min(sampler.h - 1, Math.max(0, Math.floor((1 - v) * sampler.h)));
    const i = (y * sampler.w + x) * 4;
    const r = sampler.data[i] / 255;
    const g = sampler.data[i + 1] / 255;
    const b = sampler.data[i + 2] / 255;
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    const sat = Math.max(r, g, b) - Math.min(r, g, b);
    const isPaper = luma > 0.9 && sat < 0.08;

    setHover(!isPaper);

    if (!def.particles) return;
    const isLeaf =
      !isPaper && v > LEAF_MIN_V && g >= r * 0.92 && g >= b * 0.85 && luma < 0.92;
    if (!isLeaf || Math.random() > LEAF_CHANCE || queue.current.length > 40) return;

    const p = e.point;
    queue.current.push({ x: p.x, y: p.y, z: p.z, r, g, b });
  };

  return (
    <>
      <mesh
        ref={meshRef}
        scale={[def.flipX ? -w : w, h, 1]}
        renderOrder={order}
        onPointerMove={onMove}
        onPointerOut={() => setHover(false)}
      >
        <planeGeometry args={[1, 1]} />
        <shaderMaterial
          ref={matRef}
          vertexShader={layerVertexShader}
          fragmentShader={layerFragmentShader}
          uniforms={uniforms}
          transparent
          side={THREE.DoubleSide}
          blending={THREE.NormalBlending}
          depthWrite={false}
          depthTest={false}
          toneMapped={false}
        />
      </mesh>
      {def.particles && <LeafEmitter queue={queue} />}
    </>
  );
}
