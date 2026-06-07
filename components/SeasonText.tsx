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
    const tick = () => {
      const p = scrollRef.current;
      const winH = window.innerHeight * 0.5; // window height (100% - 30% - 20%)
      const span = (SEASON_TEXTS.length - 1) * winH;
      const ty = -p * span;

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
        el.style.transform = `scaleX(${1 + e * 0.04}) scaleY(${1 - e * 0.02})`;
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
