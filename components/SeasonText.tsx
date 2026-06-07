"use client";

import { useEffect, useRef } from "react";
import { SEASON_TEXTS } from "@/lib/seasonText";

const EDGE = 0.3; // top/bottom 30% of the window = the "glass" zone
const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// Fixed text window on the left (30% top -> 20% bottom). The seasons scroll
// through it. A glass-like effect is applied PER LINE according to its position
// in the window: lines near the top/bottom edge get blurred + widened + faded,
// lines in the center stay sharp. Only the text is affected (no scene, no seams).
export default function SeasonText({
  scrollRef,
}: {
  scrollRef: React.MutableRefObject<number>;
}) {
  const columnRef = useRef<HTMLDivElement>(null);
  const lines = useRef<(HTMLParagraphElement | null)[]>([]);
  const centers = useRef<number[]>([]); // each line's center Y in column coords (px)

  useEffect(() => {
    const measure = () => {
      centers.current = lines.current.map((el) =>
        el ? el.offsetTop + el.offsetHeight / 2 : 0
      );
    };

    let id = 0;
    const t0 = performance.now();
    const INTRO_DELAY = 100; // ms before the rise starts
    const INTRO_MS = 2200; // intro rise duration (slower)
    const INTRO_RISE = 0.9; // how far below it starts (in window-heights)

    const tick = () => {
      const p = scrollRef.current;
      const winH = window.innerHeight * 0.5; // window height (100% - 30% - 20%)
      const span = (SEASON_TEXTS.length - 1) * winH;

      // Intro: the column starts pushed DOWN and rises into place. easeOutExpo =
      // fast off the line, long slow glide to a stop. The per-line glass effect
      // below shows naturally as the text sweeps up through the bottom zone.
      const intro = Math.min(
        1,
        Math.max(0, (performance.now() - t0 - INTRO_DELAY) / INTRO_MS)
      );
      const eased = intro >= 1 ? 1 : 1 - Math.pow(2, -10 * intro);
      const ty = -p * span + (1 - eased) * winH * INTRO_RISE;

      const col = columnRef.current;
      if (col) col.style.transform = `translateY(${ty}px)`;

      for (let i = 0; i < lines.current.length; i++) {
        const el = lines.current[i];
        if (!el) continue;
        const pos = (centers.current[i] + ty) / winH; // 0 = top of window, 1 = bottom
        const e = Math.max(
          1 - smoothstep(0, EDGE, pos), // near top edge
          1 - smoothstep(0, EDGE, 1 - pos) // near bottom edge
        );
        el.style.filter = e > 0.002 ? `blur(${e * 2.5}px)` : "none";
        el.style.transform = `scaleX(${1 + e * 0.025}) scaleY(${1 - e * 0.015})`;
        el.style.opacity = String(1 - e);
      }
      id = requestAnimationFrame(tick);
    };

    // measure after first layout (and once fonts are ready), and on resize.
    measure();
    requestAnimationFrame(measure);
    if (document.fonts?.ready) document.fonts.ready.then(measure);
    window.addEventListener("resize", measure);
    id = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("resize", measure);
    };
  }, [scrollRef]);

  let li = 0;
  return (
    <div className="season-text" aria-hidden="true">
      <div className="season-text__scroll" ref={columnRef}>
        {SEASON_TEXTS.map((season) => (
          <div key={season.id} className="season-text__block">
            {season.lines.map((line, j) => {
              const idx = li++;
              return (
                <p
                  key={j}
                  ref={(el) => {
                    lines.current[idx] = el;
                  }}
                >
                  {line}
                </p>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
