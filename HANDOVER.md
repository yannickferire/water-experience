# Handover

Project status. Setup → [README.md](README.md) · architecture → [SPECS.md](SPECS.md)
· assets → [ASSETS.md](ASSETS.md).

## Completed

**Travel & structure**
- Data-driven scene — every element is one entry in [`lib/scene.ts`](lib/scene.ts).
- Horizontal scroll journey (Lenis → `scrollRef`) across 4 stations, per-layer
  parallax, mid-journey zoom, inverse-mouse parallax.
- Each layer centered at its station regardless of parallax (`offsetX` for L/R).
- Layers lazy-mount near their station, then reveal: paper shape first, then
  watercolor droplets — time-paced and latched (always visible, never replays).

**Water effect**
- Per-layer GPU sim in a ping-pong FBO ([`useWaterField.ts`](components/Experience/useWaterField.ts),
  256²): deposit along the cursor → diffusion → hold-then-absorb drying
  (wet-first dries first; saturated lasts longer). Brush width tracks speed.
- Clean straight core, organic cloud-like irregular edges (shader, band-limited).
- Sim pauses ~11s after the last interaction (only the hovered layer runs).

**Rendering**
- Alpha compositing from white-background assets (no cut-out): shape opaque over a
  procedural paper base, white paper transparent.
- Eroded interior mask keeps thin structures (trunk/branches) rigid.
- Confined low-frequency animated distortion (no zigzag/swirl).

**Atmosphere & UI**
- Procedural per-season sky gradient ([`Scene.tsx`](components/Experience/Scene.tsx)).
- Leaf particles on foliage hover ([`LeafEmitter.tsx`](components/Experience/LeafEmitter.tsx)).
- Custom cursor, ring + dot ([`CustomCursor.tsx`](components/CustomCursor.tsx)).
- Per-season text column with per-line glass effect + intro rise ([`SeasonText.tsx`](components/SeasonText.tsx)).
- "Scroll to explore" hint ([`ScrollHint.tsx`](components/ScrollHint.tsx)).
- Per-season Vivaldi music: crossfade, lazy-load, autoplay unlock, real-state
  player ([`SeasonAudio.tsx`](components/SeasonAudio.tsx), [`SeasonPlayer.tsx`](components/SeasonPlayer.tsx)).
- `npm run optimize:audio` — ffmpeg trim/compress with `.orig.mp3` backups.

## Known limitations

- **Assets are AI-generated placeholders** — need a final, consistent art pass.
- **Mobile not finalized** — desktop-first; cursor + hover water disabled below
  1024px / touch; layout, scroll distance and text sizing untuned on mobile.
- **Audio licensing** — placeholders; needs a confirmed CC recording, credited.
- **No reduced-motion / a11y pass** — motion- and pointer-heavy; WebGL not exposed
  to assistive tech.
- **Client-only canvas** — minimal SEO; no meta/OG yet.
- **No automated tests** — validated visually.

## Next steps

_Initial list — to be extended._

**Features to build**
- **"Open this concerto" button** — opens a panel where the current season's
  **full concerto** plays (not the loop), with a nice reveal animation.
- **Loading screen** — intro shown while assets/fonts/audio load, easing into the
  experience.
- **Ending** — final screen with closing text and credits (assets, music,
  inspiration, author).

**Polish & production**
- **Finalize assets** — final watercolor set (consistent hero trees + foregrounds).
- **Zoom / dezoom during navigation** — develop richer zoom-in/zoom-out moves as
  you travel between stations (beyond the current subtle mid-journey `ZOOM_AMP`),
  for a more cinematic camera.
- **Mobile / responsive** — scroll distance, layer scale, text sizing, touch
  fallback for the water/hover effect.
- **Blurry text effects** — richer, more immersive text blur (animated focus pull,
  soft glow/defocus on enter/exit) beyond the current glass effect.
- **Reduced motion** — honor `prefers-reduced-motion`.
- **Audio** — final licensed recordings + credits, re-run `npm run optimize:audio`.
- **SEO / sharing** — metadata, Open Graph image, favicon.
- **Polish** — revisit reveal timing (`INTRO_MS`, `REVEAL_START`) and station
  spacing (`SCROLL_SPAN`) with the real assets.
