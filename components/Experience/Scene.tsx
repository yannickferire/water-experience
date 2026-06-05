"use client";

import { useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { SCENE_LAYERS } from "@/lib/scene";
import Layer from "./Layer";

type SeasonRef = React.MutableRefObject<number>;

// Sky palettes per station [top, bottom], at scroll positions 0, 0.5, 1.
const SKY: [string, string][] = [
  ["#e9eff2", "#eef0e2"], // spring — pale blue / fresh green-cream
  ["#dfeaf3", "#f3efe2"], // summer — blue / warm cream
  ["#ece2d4", "#ecdcc4"], // autumn — soft grey-tan
];
const SKY_AT = [0, 0.5, 1];

// Background plate: gradient sky that shifts between stations as you scroll.
function Background({ scrollRef }: { scrollRef: SeasonRef }) {
  const { viewport } = useThree();
  const { uniforms, tops, bottoms } = useMemo(() => {
    const tops = SKY.map(([t]) => new THREE.Color(t));
    const bottoms = SKY.map(([, b]) => new THREE.Color(b));
    return {
      uniforms: {
        uTop: { value: tops[0].clone() },
        uBottom: { value: bottoms[0].clone() },
      },
      tops,
      bottoms,
    };
  }, []);

  useFrame(() => {
    const s = scrollRef.current;
    let tr = 0, tg = 0, tb = 0, br = 0, bg = 0, bb = 0, wsum = 0;
    for (let i = 0; i < SKY.length; i++) {
      const w = Math.max(0, 1 - Math.abs(s - SKY_AT[i]) / 0.5);
      if (w <= 0) continue;
      wsum += w;
      tr += w * tops[i].r; tg += w * tops[i].g; tb += w * tops[i].b;
      br += w * bottoms[i].r; bg += w * bottoms[i].g; bb += w * bottoms[i].b;
    }
    if (wsum > 0) {
      uniforms.uTop.value.setRGB(tr / wsum, tg / wsum, tb / wsum);
      uniforms.uBottom.value.setRGB(br / wsum, bg / wsum, bb / wsum);
    }
  });
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

export default function Scene({ scrollRef }: { scrollRef: SeasonRef }) {
  return (
    <>
      <Background scrollRef={scrollRef} />
      {SCENE_LAYERS.map((def, i) => (
        <Layer key={def.id} def={def} order={i} scrollRef={scrollRef} />
      ))}
    </>
  );
}
