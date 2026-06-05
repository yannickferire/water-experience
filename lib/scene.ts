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
  /** Scroll parallax factor: 0 = static far background, >1 = fast foreground. */
  parallax?: number;
  /** Mirror the layer horizontally (cheap variety when reusing an asset). */
  flipX?: boolean;
};

// Layers are listed back -> front (array index = render order).
// For now the tree asset is reused at several depths to demonstrate the
// camera-travel parallax with zero extra assets (atmospheric perspective:
// distant = smaller + paler + slower parallax). Swap in real elements later.
export const SCENE_LAYERS: LayerDef[] = [
  {
    id: "tree-far",
    src: "/assets/tree-summer.jpg",
    depth: 0.2,
    scale: 0.42,
    x: -0.55,
    y: 0.22,
    parallax: 0.3, // far -> moves slowly
    baseOpacity: 0.28, // pale = distance haze
    distortion: 0.01,
    flipX: true,
  },
  {
    id: "tree",
    src: "/assets/tree-summer.jpg",
    depth: 0.6,
    scale: 0.82,
    x: 0,
    y: -0.04,
    parallax: 1.0, // hero
    blend: "multiply",
    distortion: 0.018,
    baseOpacity: 0.5,
    particles: true,
  },
  {
    id: "tree-front",
    src: "/assets/tree-summer.jpg",
    depth: 0.95,
    scale: 1.35,
    x: 0.6,
    y: -0.55,
    parallax: 1.7, // near -> moves fast
    baseOpacity: 0.5,
    distortion: 0.02,
  },
];

// Off-white background (very subtle gradient for a hint of paper texture).
export const BG_TOP = "#f7f5f0";
export const BG_BOTTOM = "#f1eee6";
