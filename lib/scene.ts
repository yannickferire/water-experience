// Diorama description, layer by layer (back to front). Each layer is a watercolor
// image composited with ALPHA: the painted shape is opaque (a textured paper base
// + the watercolor), the white paper around it is transparent (see shaders.ts).

export type LayerDef = {
  id: string;
  /** Asset path under /public. */
  src: string;
  /** Scroll position (0..1) where this layer is CENTERED (its "season station"). */
  station: number;
  /** Screen offset at the station, fraction of half-width (-1 left, +1 right). */
  offsetX?: number;
  /** Vertical position, fraction of height (negative = downward). */
  y: number;
  /** Layer height as a fraction of the viewport height (1 = full). */
  scale: number;
  /** Depth for the mouse parallax (0 far .. 1 near). */
  depth: number;
  /** Scroll parallax factor (speed): <1 far/slow, >1 near/fast. */
  parallax?: number;
  /** Max distortion amplitude under the cursor (default 0.016). */
  distortion?: number;
  /** Pigment strength at rest, 0..1 (default 0.5). 100% under the wet area. */
  baseOpacity?: number;
  /** Emit little leaves when hovering the foliage. */
  particles?: boolean;
  /** Mirror the layer horizontally (cheap variety when reusing an asset). */
  flipX?: boolean;
  /** Give the layer a 3D sheet tilt that reacts to the mouse (else flat 2D). */
  tilt?: boolean;
};

// 4 stations along the scroll (0, ⅓, ⅔, 1). Each layer is CENTERED at its station
// (regardless of its parallax — see Layer.tsx); offsetX places it left/right within
// the scene. Listed back -> front (array index = render order).
export const SCENE_LAYERS: LayerDef[] = [
  // 🌸 Spring (station 0) — the first hero gets the 3D tilt.
  {
    id: "spring-ducks",
    src: "/assets/ducks-spring.jpg",
    station: 0, offsetX: 0.7, y: -0.02, scale: 0.78,
    depth: 0.5, parallax: 1.0, baseOpacity: 0.6, distortion: 0.016,
  },
  {
    id: "spring-tree",
    src: "/assets/tree-spring.jpg",
    station: 0, offsetX: -0.12, y: 0, scale: 0.88,
    depth: 0.85, parallax: 1.15, baseOpacity: 0.5, distortion: 0.02,
    particles: true, tilt: true,
  },

  // ☀️ Summer (station ⅓)
  {
    id: "summer-sunflower",
    src: "/assets/sunflower-summer.jpg",
    station: 0.3333, offsetX: 0.7, y: -0.02, scale: 0.78,
    depth: 0.5, parallax: 1.0, baseOpacity: 0.6, distortion: 0.016,
  },
  {
    id: "summer-tree",
    src: "/assets/tree-summer.jpg",
    station: 0.3333, offsetX: -0.1, y: 0, scale: 0.85,
    depth: 0.85, parallax: 1.15, baseOpacity: 0.5, distortion: 0.02, particles: true,
  },

  // 🍂 Autumn (station ⅔) — deer as a close foreground on the right (faster, lower).
  {
    id: "autumn-tree",
    src: "/assets/tree-autumn.jpg",
    station: 0.6667, offsetX: -0.12, y: 0, scale: 0.85,
    depth: 0.85, parallax: 1.0, baseOpacity: 0.5, distortion: 0.02, particles: true,
  },
  {
    id: "autumn-deer",
    src: "/assets/deer-autumn.jpg",
    station: 0.6667, offsetX: 0.65, y: -0.18, scale: 0.62,
    depth: 0.95, parallax: 1.25, baseOpacity: 0.6, distortion: 0.016,
  },

  // ❄️ Winter (station 1) — snowman further back on the LEFT, snowy tree close by.
  {
    id: "winter-snowman",
    src: "/assets/squirrel-winter.jpg",
    station: 1, offsetX: -0.45, y: 0.05, scale: 0.5,
    depth: 0.3, parallax: 0.92, baseOpacity: 0.45, distortion: 0.012,
  },
  {
    id: "winter-tree",
    src: "/assets/tree-winter.jpg",
    station: 1, offsetX: 0.1, y: 0, scale: 0.85,
    depth: 0.85, parallax: 1.15, baseOpacity: 0.5, distortion: 0.02,
  },
];

// Off-white page background (behind the canvas; matches the scene on load).
export const BG_BOTTOM = "#f1eee6";
