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
  /** Give the layer a 3D sheet tilt that reacts to the mouse (else flat 2D). */
  tilt?: boolean;
};

// Horizontal journey of "stations" (seasons) spread along X. Scroll pans the
// layers left so each station comes to center in turn:
//   station center scroll s  ->  x = s * SCROLL_SPAN * 2  (= s * 3.6)
//   spring s=0 (x 0), summer s=0.5 (x 1.8), autumn s=1 (x 3.6).
// Parallax kept near 1 (0.85..1.15) so a station's layers stay grouped while
// still giving depth. Distant layers = smaller + paler (atmospheric perspective).
// Listed back -> front (array index = render order). Winter station: add when
// the asset exists.
export const SCENE_LAYERS: LayerDef[] = [
  // 🌸 Spring (x 0) — the first hero gets the 3D tilt; everything else is flat.
  {
    id: "spring-ducks",
    src: "/assets/ducks-spring.jpg",
    depth: 0.5, scale: 0.78, x: 0.45, y: -0.02,
    parallax: 1.0, baseOpacity: 0.6, distortion: 0.016,
  },
  {
    id: "spring-tree",
    src: "/assets/tree-spring.jpg",
    depth: 0.85, scale: 0.88, x: -0.08, y: 0,
    parallax: 1.15, baseOpacity: 0.5, distortion: 0.02, particles: true,
    tilt: true,
  },

  // ☀️ Summer (x 1.6) — sunflowers as a foreground scene (like the ducks)
  {
    id: "summer-sunflower",
    src: "/assets/sunflower-summer.jpg",
    depth: 0.5, scale: 0.78, x: 2.05, y: -0.02,
    parallax: 1.0, baseOpacity: 0.6, distortion: 0.016,
  },
  {
    id: "summer-tree",
    src: "/assets/tree-summer.jpg",
    depth: 0.85, scale: 0.85, x: 1.6, y: 0,
    parallax: 1.15, baseOpacity: 0.5, distortion: 0.02, particles: true,
  },

  // 🍂 Autumn (x 3.2) — single tree (no duplicate)
  {
    id: "autumn-tree",
    src: "/assets/tree-autumn.jpg",
    depth: 0.85, scale: 0.85, x: 3.2, y: 0,
    parallax: 1.0, baseOpacity: 0.5, distortion: 0.02, particles: true,
  },

  // ❄️ Winter (x 4.8)
  {
    id: "winter-tree",
    src: "/assets/tree-winter.jpg",
    depth: 0.85, scale: 0.85, x: 4.8, y: 0,
    parallax: 1.0, baseOpacity: 0.5, distortion: 0.02,
  },
];

// Off-white background (very subtle gradient for a hint of paper texture).
export const BG_TOP = "#f7f5f0";
export const BG_BOTTOM = "#f1eee6";
