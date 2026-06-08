# Handover

Status snapshot of the **Water Experience** project. For setup see
[README.md](README.md); for architecture see [SPECS.md](SPECS.md); for assets see
[ASSETS.md](ASSETS.md).

---

## Completed

### Core experience
- **Data-driven scene** — the whole diorama is one array of layers in
  [`lib/scene.ts`](lib/scene.ts) (`LayerDef`); adding/moving an element is a
  one-line change, no logic to touch.
- **Horizontal scroll travel** — Lenis smooth scroll → `scrollRef` (0..1) drives
  the camera journey across 4 season **stations** (scroll `0, ⅓, ⅔, 1`).
  Per-layer **parallax** (speed), gentle mid-journey **zoom**, and subtle
  **inverse-mouse parallax**.
- **Station-correct placement** — each layer is centered at its station
  *regardless* of its parallax factor; horizontal placement within a scene via
  `offsetX`. (Fixed an earlier bug where parallax broke alignment.)
- **Lazy mount + reveal on approach** — a layer's texture is only loaded when its
  station nears the viewport; it then **blooms in over time** (paper shape first,
  then watercolor in droplet waves). Reveal is **time-paced and latched**, so the
  animation is always visible however fast you scroll, and never replays.

### Water effect (the centerpiece)
- **Per-layer GPU water simulation** in a ping-pong HalfFloat FBO
  ([`useWaterField.ts`](components/Experience/useWaterField.ts), 256²):
  round deposit along the cursor path, diffusion (spreading), then a
  **hold-then-absorb** drying model (water freezes briefly, then is soaked up
  wet-first-dries-first; saturated spots last longer).
- **Speed-driven brush width** (slow = narrow, fast = wider, capped).
- **Clean straight trail core** with **organic, cloud-like irregular edges**
  added in the layer shader ([`shaders.ts`](components/Experience/shaders.ts)) via
  a band-limited noise warp/blob (edges only, never the dry image or the core).
- **Idle-pause optimization** — a layer's sim is paused ~11s after the last
  interaction, so only the hovered layer actually runs on the GPU.

### Rendering / compositing
- **Alpha compositing from white-background assets** — the shader computes
  coverage from luminance/saturation: the painted shape becomes opaque (over a
  procedural **textured paper base** + the watercolor), the white paper around it
  becomes transparent. **No manual cut-out needed.**
- **Eroded interior mask** — thin structures (trunks, branches) don't distort and
  stay rigid; only large masses (canopy) ripple. Silhouette stays fixed.
- **Distortion** — subtle low-frequency *animated* image displacement, confined to
  the wet area and the shape interior (no per-pixel zigzag/swirl).

### Atmosphere & UI
- **Procedural per-season sky** — gradient interpolated between 4 palettes by
  scroll ([`Scene.tsx`](components/Experience/Scene.tsx)); no asset.
- **Leaf particles** — small gray leaves spin/fall when hovering foliage (green,
  upper part only — not trunk/grass); GPU point pool, sparse emission
  ([`LeafEmitter.tsx`](components/Experience/LeafEmitter.tsx)).
- **Custom cursor** — dual-trailing ring + dot; over a WebGL image the ring
  shrinks to an opaque white circle ([`CustomCursor.tsx`](components/CustomCursor.tsx),
  bridged from WebGL via [`lib/cursor.ts`](lib/cursor.ts)). Desktop only.
- **Per-season floating text** — fixed left column that scrolls through a window
  with a per-line glass effect (blur + slight widen + fade by position); intro
  rise on load ([`SeasonText.tsx`](components/SeasonText.tsx),
  [`lib/seasonText.ts`](lib/seasonText.ts)).
- **"Scroll to explore" hint** — fades in after the text settles, animated
  underline loop, fades out on first scroll ([`ScrollHint.tsx`](components/ScrollHint.tsx)).
- **Per-season music** — one looping Vivaldi movement per season, crossfaded on
  scroll; streamed `HTMLAudioElement`, lazy-loaded, autoplay unlocked on first
  gesture, inactive tracks paused ([`SeasonAudio.tsx`](components/SeasonAudio.tsx),
  [`lib/audio.ts`](lib/audio.ts)).
- **Audio player UI** — bottom-right, click to play/pause, shows the current
  movement/tempo, reflects **real** playing state ([`SeasonPlayer.tsx`](components/SeasonPlayer.tsx)).

### Tooling / docs
- `scripts/optimize-audio.mjs` (`npm run optimize:audio`) — ffmpeg trim + compress
  with `.orig.mp3` backups.
- Docs: [README.md](README.md), [SPECS.md](SPECS.md), [ASSETS.md](ASSETS.md), this file.

---

## Known limitations

- **Assets are AI-generated placeholders** — the watercolor images in
  `public/assets/` are temporary; quality/consistency across the 4 hero trees and
  foreground elements still needs a final art pass.
- **Mobile optimization not finalized** — desktop-first; the custom cursor and
  hover water effect are disabled below 1024px / on touch, but layout, scroll
  distance, text sizing and performance on mobile haven't been tuned.
- **Audio licensing** — current tracks are placeholders; final build needs a
  confirmed CC-licensed recording (e.g. Musopen / John Harrison) credited properly.
- **No reduced-motion / accessibility pass** — no `prefers-reduced-motion`
  fallback, the experience is motion- and pointer-heavy, and the WebGL content is
  not exposed to assistive tech.
- **Client-only / no SSR for the canvas** — minimal SEO surface; no meta/OG/social
  cards set up yet.
- **No automated tests** — behavior is validated visually.
- **Water feel is hand-tuned** — the constants in `useWaterField.ts` /
  `shaders.ts` are dialed in by eye and may need re-tuning if assets or scale
  change.

---

## Next steps

_Initial list — to be extended._

### Features to build
- **"Open this concerto" button** — a control that opens a panel/overlay where the
  **full concerto** of the current season plays (not just the looping snippet),
  with a **nice reveal animation** opening the panel (and presumably switching the
  audio source from the looping movement to the complete recording).
- **Loading screen** — an intro/loading screen shown while assets, fonts and the
  first audio track load, transitioning smoothly into the experience.
- **Ending** — a final screen at the end of the journey with closing **text and
  credits** (assets, music, inspiration, author).

### Polish & production
- **Finalize assets** — replace placeholders with the final, style-consistent
  watercolor set (matching hero trees + a foreground element for each season;
  autumn/winter could use a 2nd foreground element — one line each in
  `lib/scene.ts`).
- **Mobile / responsive** — tune scroll distance, layer scale and text sizing for
  small screens; decide on a touch fallback for the water/hover interaction.
- **Blurry text effects** — push the text further toward something singular and
  immersive with richer blur (e.g. stronger/animated focus pull, soft glow or
  defocus on enter/exit, depth-of-field feel) beyond the current per-line glass
  effect in [`SeasonText.tsx`](components/SeasonText.tsx).
- **Reduced motion** — honor `prefers-reduced-motion` (skip the bloom/parallax,
  freeze or simplify the water).
- **Audio** — lock in the final licensed recordings, add proper credits, and
  re-run `npm run optimize:audio`.
- **SEO / sharing** — page metadata, Open Graph image, favicon, title/description.
- **Polish** — review reveal timing (`INTRO_MS`, `REVEAL_START`) and station
  spacing (`SCROLL_SPAN`) once the real assets are in.
