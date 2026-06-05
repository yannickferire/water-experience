// Diorama description, layer by layer (back to front).
// Each layer = a watercolor visual composited with `multiply` (white background).

export type Blend = "multiply" | "normal" | "screen";

export type LayerDef = {
  id: string;
  /** Asset path under /public. */
  src: string;
  /** Parallax depth: 0 = far background, 1 = foreground. */
  depth: number;
  /** Layer height as a fraction of the viewport height (1 = full). */
  scale: number;
  /** Horizontal position, fraction of half-width (-1 left, +1 right). */
  x: number;
  /** Vertical position, fraction of height (negative = downward). */
  y: number;
  /** Composition mode (default multiply). */
  blend?: Blend;
  /** Max distortion amplitude under the cursor (default 0.016). */
  distortion?: number;
  /** Opacity at rest, 0..1 (default 0.85). 100% under the wet area. */
  baseOpacity?: number;
  /** Emit little leaves when hovering the foliage. */
  particles?: boolean;
};

// Step 1: only the tree so far. Placed centered, sitting on the "ground".
// (other layers will come as the assets arrive)
export const SCENE_LAYERS: LayerDef[] = [
  {
    id: "tree",
    src: "/assets/tree-summer.jpg",
    depth: 0.6,
    scale: 0.82,
    x: 0,
    y: -0.04,
    blend: "multiply",
    distortion: 0.018,
    baseOpacity: 0.5,
    particles: true,
  },
];

// Off-white background (very subtle gradient for a hint of paper texture).
export const BG_TOP = "#f7f5f0";
export const BG_BOTTOM = "#f1eee6";
