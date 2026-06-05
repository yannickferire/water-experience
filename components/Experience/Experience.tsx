"use client";

import { Suspense, useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import Lenis from "lenis";
import { BG_BOTTOM } from "@/lib/scene";
import Scene from "./Scene";

// WebGL shell: fixed full-screen canvas. Scroll (Lenis, smoothed) drives a
// virtual progress 0..1 that translates the parallax layers (camera travel).
export default function Experience() {
  const scrollRef = useRef(0);

  useEffect(() => {
    const lenis = new Lenis();
    let id = 0;
    const raf = (t: number) => {
      lenis.raf(t);
      id = requestAnimationFrame(raf);
    };
    id = requestAnimationFrame(raf);

    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      scrollRef.current = max > 0 ? window.scrollY / max : 0;
    };
    lenis.on("scroll", onScroll);
    onScroll();

    return () => {
      cancelAnimationFrame(id);
      lenis.destroy();
    };
  }, []);

  return (
    <>
      <main
        style={{
          position: "fixed",
          inset: 0,
          width: "100vw",
          height: "100vh",
          background: BG_BOTTOM,
        }}
      >
        <Canvas dpr={[1, 2]} camera={{ position: [0, 0, 5], fov: 50 }} gl={{ antialias: true }}>
          <Suspense fallback={null}>
            <Scene scrollRef={scrollRef} />
          </Suspense>
        </Canvas>
      </main>

      {/* Scroll height that drives the camera travel (canvas is fixed above). */}
      <div style={{ height: "300vh" }} aria-hidden />
    </>
  );
}
