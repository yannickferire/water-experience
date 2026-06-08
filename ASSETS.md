# Assets

Watercolor diorama of the four seasons, traveled horizontally on scroll
(Spring → Summer → Autumn → Winter, Vivaldi's order). Each season is a "station"
with 1–2 painted elements over a procedural sky.

## Format & compositing

- **Export on a WHITE background. Do NOT cut out.** The shader derives
  transparency from luminance: the painted shape becomes opaque, the white paper
  around it becomes transparent.
- PNG or JPG, sRGB, ~1500–2048 px, subject **centered and whole, with margin**.
- At render time the shape sits on a procedural **textured paper base**, with the
  watercolor revealed on top.

## Style bible

Paste into every prompt to keep the set consistent:

```
loose watercolour painting, soft translucent washes, wet-on-wet bleeding edges,
visible paper grain, delicate pigment blooms, gentle light from the upper-left,
light airy palette, single isolated subject, plain white background, no hard
outline, no cast shadow, no frame, no text, centered with generous padding
```

Rules: one aesthetic across all assets, **light from the upper-left** everywhere,
and **consistent framing** for the four hero trees (same "species" changing with
the season). Free tools: Leonardo.ai, Bing Image Creator (DALL·E 3), Google
ImageFX, Draw Things (Mac).

## Current assets (`/public/assets/`)

| Season | Hero | Foreground |
|---|---|---|
| 🌸 Spring | `tree-spring.jpg` | `ducks-spring.jpg` |
| ☀️ Summer | `tree-summer.jpg` | `sunflower-summer.jpg` |
| 🍂 Autumn | `tree-autumn.jpg` | `deer-autumn.jpg` |
| ❄️ Winter | `tree-winter.jpg` | `squirrel-winter.jpg` |

Each file is one entry in [`lib/scene.ts`](lib/scene.ts) (`station`, `offsetX`,
`y`, `scale`, `parallax`, `baseOpacity`, `distortion`, `particles`, `tilt`,
`flipX`). Adding an element = one line.

The **skies are procedural** (a gradient interpolated per season) — no asset.

## Audio — Vivaldi, The Four Seasons

One movement per season, crossfaded on scroll. Use a **freely-licensed**
recording (e.g. Musopen → John Harrison / Wichita State University, CC-BY).

```
/public/audio/  spring.mp3  summer.mp3  autumn.mp3  winter.mp3
```

Compress/trim with `npm run optimize:audio` (keeps `.orig.mp3` backups).
