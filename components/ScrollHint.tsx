"use client";

import { useEffect, useState } from "react";

// "Scroll to explore" hint below the text: fades in once the intro is done,
// fades out as soon as the user starts scrolling.
export default function ScrollHint({
  scrollRef,
}: {
  scrollRef: React.MutableRefObject<number>;
}) {
  const [shown, setShown] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShown(true), 1400); // mid-intro; slow fade-in
    let raf = 0;
    let done = false;
    const tick = () => {
      if (!done && scrollRef.current > 0.02) {
        done = true;
        setHidden(true);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      clearTimeout(t);
      cancelAnimationFrame(raf);
    };
  }, [scrollRef]);

  return (
    <div
      className={`scroll-hint${shown ? " is-shown" : ""}${hidden ? " is-hidden" : ""}`}
      aria-hidden="true"
    >
      <span>Scroll to explore</span>
    </div>
  );
}
