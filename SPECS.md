# Specs — how it works

A WebGL **watercolor diorama** of the **four seasons**, traveled horizontally on
scroll, with a **water-on-paper effect** on hover plus contextual text and music.
Inspired by the David Whyte Experience (Immersive Garden), rebuilt with original
assets and shaders. Setup: see [README.md](README.md).

## Stack

| Role | Tech |
|---|---|
| Framework | Next.js (App Router), client-only experience |
| 3D | Three.js via React Three Fiber + drei |
| Smooth scroll | Lenis |
| Shaders | inline GLSL (TS strings) |
| Fonts | `Caudex` (text), `Sono` (mono / UI) via `next/font` |
| Deploy | Vercel |

## Architecture

```
app/
  layout.tsx         fonts + mounts the custom cursor
  page.tsx           client-only import of Experience (no SSR)
  globals.css        reset, text, cursor, player, scroll hint
components/
  CustomCursor.tsx   ring + dot cursor (dual trailing)
  SeasonText.tsx     fixed left text column (scrolls on scroll)
  ScrollHint.tsx     "Scroll to explore" hint
  SeasonAudio.tsx    one looping track per season, crossfaded on scroll
  SeasonPlayer.tsx   bottom-right play/pause + now-playing label
  Experience/
    Experience.tsx   shell: <Canvas>, Lenis -> scrollRef, scroll height
    Scene.tsx        procedural sky + layer map
    Layer.tsx        one diorama layer (mesh + shader + interactions)
    shaders.ts       layer vertex/fragment (reveal, distortion, edges, alpha)
    useWaterField.ts per-layer GPU water sim (ping-pong FBO)
    LeafEmitter.tsx  leaf particles when hovering foliage
lib/
  scene.ts           data-driven layers (LayerDef[]) + BG_BOTTOM
  seasonText.ts      per-season text
  cursor.ts          WebGL -> DOM bridge (cursor hover)
  audio.ts           audio event bridge + movement labels
```

**Data-driven:** adding an element = one entry in `lib/scene.ts`.

## Features

**1. Diorama travel.** Lenis gives a `scrollRef` (0..1). Layers pan left
(`panX = -scroll·parallax·viewportW·SCROLL_SPAN`); higher `parallax` = faster.
Each layer is **centered at its station** (scroll `0, ⅓, ⅔, 1`) regardless of
parallax, with `offsetX` placing it left/right. Plus a gentle mid-journey zoom
and a subtle inverse-mouse parallax.

**2. Sky.** `Scene.tsx` interpolates a top/bottom gradient between 4 palettes by
scroll. Procedural, no asset.

**3. Water effect (core).** Per-layer ping-pong FBO (`useWaterField.ts`, 256²):
round deposit along the cursor path → diffusion (spreads straight) → a
**hold-then-absorb** drying model (water holds briefly, then drains at a constant
per-pixel rate so wet-first dries first; repeated passes build up to `WET_MAX` and
last longer). Trail width tracks cursor speed. The sim is **paused ~11s after the
last interaction**, so only the hovered layer runs.
The layer **samples** this field (`shaders.ts`): reveals pigment
(`baseOpacity` → 100% where wet), drives a **confined distortion**, and breaks the
trail's **edges into small irregular cloud-like blobs** (band-limited noise — core
stays clean, dry paper untouched).

**4. Alpha compositing.** `alpha = coverage (1 − paper)`: the painted shape is
opaque (textured paper base + watercolor), the white paper around it transparent.
An **eroded interior mask** keeps thin structures (trunk, branches) rigid; only
large masses distort.

**5. Reveal.** Per layer, triggered when its station comes within `REVEAL_START`
of the scroll, then bloomed over `INTRO_MS` by time (latched). Two stages: the
**paper shape** first, then the **watercolor** in waves of droplets (3 staggered
noise layers).

**6. Leaf particles.** Hovering foliage (green, upper part) emits small gray
leaves that spin and fall — GPU pool of 600 points, multiply blend, sparse.

**7. Custom cursor.** A dot trails the mouse, a ring trails further (clamped so
the dot stays inside). Over a WebGL image (bridged via `cursor.ts`) the ring
shrinks to an opaque white circle. Desktop only.

**8. Per-season text.** Fixed left column; seasons scroll through a window. A
per-line glass effect blurs + widens + fades lines near the top/bottom edge.

**9. Per-season music.** One looping movement per season, crossfaded on scroll.
Streaming `HTMLAudioElement`, only spring preloaded (others lazy), inactive tracks
paused, autoplay unlocked on first gesture. `SeasonPlayer.tsx` shows real state
and toggles play/pause.

## Tuning knobs

| Effect | File | Constant |
|---|---|---|
| Station spacing / pan speed | `Layer.tsx` | `SCROLL_SPAN` |
| Journey zoom | `Layer.tsx` | `ZOOM_AMP` |
| Scroll length | `Experience.tsx` | spacer `…vh` |
| Reveal trigger / duration | `Layer.tsx` | `REVEAL_START`, `INTRO_MS` |
| Water drying | `useWaterField.ts` | `ABSORB`, `FILL`, `WET_MAX`, `HOLD_BASE`, `HOLD_PER_WET` |
| Trail width | `useWaterField.ts` | `RADIUS_MIN/MAX`, `SPEED_SLOW/FAST` |
| Trail edge blobs | `shaders.ts` | fringe / blob block |
| Distortion | `scene.ts` (`distortion`) · `shaders.ts` | |
| Text glass | `SeasonText.tsx` | `EDGE`, blur `e*2.5` |
| Sky palettes | `Scene.tsx` | `SKY` |
| Audio crossfade / prefetch | `SeasonAudio.tsx` | `FADE`, `PREFETCH` |
| Content / positions | `lib/scene.ts`, `lib/seasonText.ts` | |

## Notes

- Layers **lazy-mount** near their station and the water sim pauses when idle;
  audio streams and loads lazily; DPR capped at `[1, 2]`.
- Shaders sample sRGB without explicit decode/encode (visually fine; revisit if
  adding color grading).

Status, limitations and roadmap: see [HANDOVER.md](HANDOVER.md).
