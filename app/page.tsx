"use client";

import dynamic from "next/dynamic";

// The experience is fully client-side (WebGL + Web Audio), so we skip SSR.
const Experience = dynamic(() => import("@/components/Experience/Experience"), {
  ssr: false,
});

export default function Home() {
  return <Experience />;
}
