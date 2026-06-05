"use client";

import { useMemo } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { SCENE_LAYERS, BG_TOP, BG_BOTTOM } from "@/lib/scene";
import Layer from "./Layer";

// Background plate: soft off-white gradient, rendered first.
// The layers' multiply composites on top of this light background.
function Background() {
  const { viewport } = useThree();
  const uniforms = useMemo(
    () => ({
      uTop: { value: new THREE.Color(BG_TOP) },
      uBottom: { value: new THREE.Color(BG_BOTTOM) },
    }),
    []
  );
  return (
    <mesh
      position={[0, 0, -0.01]}
      scale={[viewport.width, viewport.height, 1]}
      renderOrder={-10}
    >
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        depthWrite={false}
        depthTest={false}
        toneMapped={false}
        uniforms={uniforms}
        vertexShader={/* glsl */ `
          varying vec2 vUv;
          void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
        `}
        fragmentShader={/* glsl */ `
          varying vec2 vUv;
          uniform vec3 uTop;
          uniform vec3 uBottom;
          void main(){
            vec3 c = mix(uBottom, uTop, smoothstep(0.0, 1.0, vUv.y));
            gl_FragColor = vec4(c, 1.0);
          }
        `}
      />
    </mesh>
  );
}

export default function Scene({
  scrollRef,
}: {
  scrollRef: React.MutableRefObject<number>;
}) {
  return (
    <>
      <Background />
      {SCENE_LAYERS.map((def, i) => (
        <Layer key={def.id} def={def} order={i} scrollRef={scrollRef} />
      ))}
    </>
  );
}
