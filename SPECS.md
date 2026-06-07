# Water Experience — Specs & how it works

A WebGL experience: a **watercolor diorama** of the **four seasons** that you
travel through horizontally on scroll, with a **water effect** on hover and
contextual text + music. Inspired by the David Whyte Experience (Immersive
Garden), rebuilt with our own assets and code.

---

## Stack

| Role | Tech |
|---|---|
| Framework | Next.js (App Router), client-only for the experience |
| 3D rendering | Three.js via React Three Fiber (`@react-three/fiber`, `@react-three/drei`) |
| Smooth scroll | Lenis |
| Shaders | inline GLSL (TS strings) |
| Type | `Caudex` (text) + `Inter` (UI) via `next/font` |
| Deploy | Vercel |

---

## File architecture

```
app/
  layout.tsx        fonts + mounts the custom cursor
  page.tsx          client-only import of Experience (no SSR)
  globals.css       reset, text block, custom cursor
components/
  CustomCursor.tsx  custom cursor (ring + dot, dual trailing)
  SeasonText.tsx    fixed text block on the left (scrolls on scroll)
  SeasonAudio.tsx   one looping track per season, crossfaded on scroll
  Experience/
    Experience.tsx  shell: <Canvas>, Lenis -> scrollRef, scrollable height
    Scene.tsx       background (sky per season) + layer map
    Layer.tsx       one diorama layer (mesh + shader + interactions)
    shaders.ts      layer vertex/fragment (reveal, distortion, alpha)
    useWaterField.ts GPU water simulation (ping-pong FBO) per layer
    LeafEmitter.tsx  "leaf" particles when hovering foliage
lib/
  scene.ts          data-driven layer description (LayerDef[])
  seasonText.ts     per-season text
  cursor.ts         WebGL -> DOM event bridge (cursor hover state)
```

Cross-cutting principle: **data-driven**. Adding an element = one entry in
`lib/scene.ts` (no logic to touch).

---

## Features & specs

### 1. Layered diorama (horizontal parallax + zoom)
- Each layer is a textured plane positioned along an X axis (`scene.ts`).
- Scroll (Lenis, smoothed) gives a `scrollRef` 0..1 that **pans** the layers
  left: `panX = -scroll * parallax * viewportW * SCROLL_SPAN`. The more
  "foreground" a layer is (higher `parallax`), the faster it moves.
- 4 **stations** (seasons) at `x = s * 4.8`, s ∈ {0, ⅓, ⅔, 1}.
- Gentle **zoom** mid-journey: `zoom = 1 + 0.18·sin(scroll·π)`.
- Subtle **inverse mouse parallax** (layers shift opposite to the cursor).

### 2. Sky per season
`Scene.tsx` interpolates a gradient (top/bottom) between 4 palettes based on
scroll (spring → summer → autumn → winter). No asset, fully procedural.

### 3. Water effect on hover (the core)
Simulated per layer in a **ping-pong FBO** (`useWaterField.ts`, 256²):
- **round deposit** along the cursor path (the cursor is the head);
- **diffusion** (water spreads);
- **absorption**: `HOLD` 1s with nothing, then **fade** (`ABSORB_TAU`) **+
  shrink** (`ERODE`) → the puddle is "soaked up" by the paper;
- trace **width** driven by cursor **speed** (`RADIUS_MIN/MAX`);
- **optimization**: a layer's sim is **paused** ~7s after the last interaction →
  only the hovered layer runs.

The layer **samples** this field (`shaders.ts`):
- reveals the watercolor (rest pigment `baseOpacity` → 100% where wet);
- **organic** edges only away from the center (warp ∝ how faint the water is);
- **distortion** = a subtle low-frequency animated image displacement, **confined**
  to the wet area **and** to the inside of the shape (silhouette/trunk stay fixed).

### 4. Alpha compositing + paper base
- `alpha` = "coverage" (1 - paper) → the **shape is opaque** (covers what's
  behind it), the **white paper around it is transparent**.
- Inside: a **textured paper base** + the watercolor on top.
- **Eroded interior mask**: thin structures (trunk, branches) don't distort →
  they stay straight; only large masses ripple.

### 5. Reveal on load
`uAppear` (per layer, staggered by depth):
1. the **paper shape** appears first;
2. then the **watercolor** reveals in **waves of droplets** (3 staggered, blended
   noise layers — the method described by the original studio).

### 6. Leaf particles
When hovering the **foliage** (green, upper part), `LeafEmitter.tsx` emits small
gray leaves that spin and fall (GPU pool of 600 points, multiply blend). Emission
is sparse (probabilistic).

### 7. Custom cursor
`CustomCursor.tsx`: a **dot** trailing the mouse + a **ring** trailing further
(clamped so the dot stays inside). Over a WebGL image (event via `cursor.ts`),
the ring **shrinks, turns opaque white** and the dot turns white (CSS
transition). Desktop only.

### 8. Per-season text
`SeasonText.tsx`: a **fixed block on the left** (30% top → 20% bottom). Seasons
are stacked and **scroll** through this window. A glass-like effect is applied
**per line** based on its position: a line near the top/bottom is **blurred +
slightly widened + faded**; centered it's sharp. The first season has top padding
so that on load (before scrolling) no text sits in the effect zone.

### 9. Per-season music
`SeasonAudio.tsx`: one looping track per season, **crossfaded** on scroll.
- Streaming `HTMLAudioElement` (no full decode → low memory).
- Only `spring` is preloaded; the others **load lazily** when we get near them.
- Inactive tracks are **paused** (no CPU / no network).
- Autoplay is **unlocked on the first user gesture** (browser policy) → music
  starts on the first scroll/click.

---

## Key tuning knobs (where to touch)

| Effect | File | Constant |
|---|---|---|
| Station spacing / pan speed | `Layer.tsx` | `SCROLL_SPAN` |
| Journey zoom | `Layer.tsx` | `ZOOM_AMP` |
| Scroll length | `Experience.tsx` | `…vh` height |
| Water absorption | `useWaterField.ts` | `HOLD`, `ABSORB_TAU`, `ERODE` |
| Trace width | `useWaterField.ts` | `RADIUS_MIN/MAX`, `SPEED_*` |
| Distortion strength/shape | `scene.ts` (`distortion`) · `shaders.ts` | |
| Reveal (duration/stagger) | `Layer.tsx` | `/2.6`, `order*0.3` |
| Text glass effect | `SeasonText.tsx` | `EDGE`, blur `e*2.5`, scaleX `e*0.025` |
| Sky palettes | `Scene.tsx` | `SKY` |
| Audio crossfade / prefetch | `SeasonAudio.tsx` | `FADE`, `PREFETCH` |
| Content / positions | `lib/scene.ts`, `lib/seasonText.ts` | |

---

## Performance

- **Off-screen layers are frustum-culled** → their shader doesn't run.
- The **water sim is paused** on non-hovered layers.
- Audio **streams** and loads lazily; inactive tracks are paused.
- DPR capped at `[1, 2]`.

---

## Improvable / known

- **Color space**: raw shaders sample sRGB without decoding and don't encode the
  output ("accidentally correct" visually). Worth fixing if we add grading or
  colors drift.
- **Reactive waveform**: the music plays but isn't yet visualized; an
  `AnalyserNode` (via `MediaElementSource`) could drive a waveform and feed the
  shader (e.g., distortion reacting to the strings).
- **Autumn & winter**: a single element each (missing a 2nd foreground asset).
- **"Spread only behind"**: diffusion is isotropic; a directional (anisotropic,
  movement-biased) spread would be more faithful.
- **Baked noise**: the studio bakes its noise into a texture (perf). We compute
  it live; fine here, but worth considering if the layer count grows.
- **Mobile / responsive**: built desktop-first. The custom cursor and some
  values are disabled/unoptimized on touch; layer framing would benefit from
  responsive values.
- **Per-layer CPU sampler**: each layer reads its pixels via a canvas (for
  hover/particles). Watch memory for very large images.
- **Audio file weight**: re-encode to ~96–128 kbps and/or trim to a loopable
  ~60–90s segment (e.g. `ffmpeg -i in.mp3 -b:a 112k -t 90 out.mp3`).
