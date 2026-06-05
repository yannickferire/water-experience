"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { BG_BOTTOM } from "@/lib/scene";
import Scene from "./Scene";

// WebGL shell: full-screen canvas hosting the diorama scene.

export default function Experience() {
  return (
    <main
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        background: BG_BOTTOM,
      }}
    >
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0, 5], fov: 50 }}
        gl={{ antialias: true }}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
    </main>
  );
}
