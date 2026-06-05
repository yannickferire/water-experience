"use client";

import { useEffect, useRef } from "react";
import { CURSOR_HOVER_EVENT } from "@/lib/cursor";

// Custom cursor (desktop only), shown ALONGSIDE the native cursor:
//  - inner dot trails slightly behind the native cursor
//  - outer ring trails further behind the dot
//  - the dot is clamped to always stay inside the ring
export default function CustomCursor() {
  const ref = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLSpanElement>(null);
  const outerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const cont = ref.current;
    const inner = innerRef.current;
    const outer = outerRef.current;
    if (!cont || !inner || !outer) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    // Max gap between dot and ring center so the dot never exits the ring.
    // Default ring r=47.5, hover ring r=22.5 (minus dot radius + margin).
    const GAP_DEFAULT = 42;
    const GAP_HOVER = 17;

    let raf = 0;
    let shown = false;
    let hover = false;
    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const dot = { ...target };
    const ring = { ...target };

    const onMove = (e: MouseEvent) => {
      target.x = e.clientX;
      target.y = e.clientY;
      if (!shown) {
        shown = true;
        cont.style.opacity = "1";
      }
    };

    const render = () => {
      // dot follows the native cursor with lag (smaller factor = more trail)
      dot.x += (target.x - dot.x) * 0.15;
      dot.y += (target.y - dot.y) * 0.15;

      // ring trails behind the dot — less lag when small (hover state)
      const ringEase = hover ? 0.08 : 0.03;
      ring.x += (dot.x - ring.x) * ringEase;
      ring.y += (dot.y - ring.y) * ringEase;

      // clamp the ring so the dot always stays inside it (tighter when small)
      const gap = hover ? GAP_HOVER : GAP_DEFAULT;
      const dx = dot.x - ring.x;
      const dy = dot.y - ring.y;
      const d = Math.hypot(dx, dy);
      if (d > gap) {
        ring.x = dot.x - (dx / d) * gap;
        ring.y = dot.y - (dy / d) * gap;
      }

      inner.style.transform = `translate3d(${dot.x}px, ${dot.y}px, 0) translate(-50%, -50%)`;
      outer.style.transform = `translate3d(${ring.x}px, ${ring.y}px, 0) translate(-50%, -50%)`;
      raf = requestAnimationFrame(render);
    };

    const onHover = (e: Event) => {
      hover = (e as CustomEvent).detail === true;
      cont.classList.toggle("hover-image", hover);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener(CURSOR_HOVER_EVENT, onHover);
    raf = requestAnimationFrame(render);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener(CURSOR_HOVER_EVENT, onHover);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={ref} className="cursor" aria-hidden="true">
      <span ref={outerRef} className="cursor__outer" />
      <span ref={innerRef} className="cursor__inner" />
    </div>
  );
}
