# Water Experience

A WebGL **watercolor diorama of the four seasons** that you travel through
horizontally on scroll — with a "water on paper" effect on hover, contextual
floating text, and one movement of Vivaldi's *Four Seasons* per season.
Inspired by the David Whyte Experience (Immersive Garden), rebuilt from scratch
with original assets and custom shaders.

> 🌸 Spring → ☀️ Summer → 🍂 Autumn → ❄️ Winter

---

## Stack

| Role | Tech |
|---|---|
| Framework | [Next.js](https://nextjs.org/) 15 (App Router), client-only experience |
| 3D / WebGL | [Three.js](https://threejs.org/) via [React Three Fiber](https://r3f.docs.pmnd.rs/) + [`drei`](https://github.com/pmndrs/drei) |
| Smooth scroll | [Lenis](https://github.com/darkroomengineering/lenis) |
| Shaders | inline GLSL (TypeScript template strings) |
| Fonts | `Caudex` (text), `Inter` (UI), `Sono` (mono / player) via `next/font` |
| Language | TypeScript |
| Deploy | [Vercel](https://vercel.com/) |

---

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000
```

Open in a desktop browser — the experience is **desktop-first** (custom cursor,
hover water effect; the custom cursor is hidden on touch / < 1024px).

### Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start the dev server (HMR) |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Next.js lint |
| `npm run optimize:audio` | Trim + compress the Vivaldi tracks with ffmpeg (keeps `.orig.mp3` backups) |

> ⚠️ **Dev gotcha:** never run `npm run build` while `next dev` is running — the
> prod build overwrites `.next` and the dev server starts throwing
> `Cannot find module './xyz.js'`. If that happens: `rm -rf .next`, **kill and
> restart** the dev process, then hard-refresh (Cmd+Shift+R).
>
> Shader (`*.ts` GLSL string) edits are **not** hot-recompiled by HMR — do a full
> page reload to pick them up.

---

## How it works (short version)

Everything is **data-driven**: the whole scene is described by an array of layers
in [`lib/scene.ts`](lib/scene.ts). Adding a painted element = one entry, no logic
to touch.

- **Travel** — Lenis smooth scroll produces a `scrollRef` (0..1) that pans the
  layers horizontally with per-layer parallax + a gentle mid-journey zoom.
- **4 stations** — seasons at scroll `0, ⅓, ⅔, 1`; each layer is centered at its
  station regardless of its parallax speed.
- **Water effect** — a per-layer GPU water simulation in a ping-pong FBO
  ([`useWaterField.ts`](components/Experience/useWaterField.ts)); the layer shader
  ([`shaders.ts`](components/Experience/shaders.ts)) samples it to reveal pigment,
  drive a subtle distortion, and break the trail's edges into little irregular
  blobs.
- **Alpha compositing** — the painted shape is opaque (textured paper + pigment),
  the white paper around it is transparent. Assets are exported on a **white
  background, no cut-out** — the shader does the knockout.
- **Reveal** — each layer blooms in (paper first, then watercolor droplets) over
  time when its station is approached.
- **Sky / text / music** — procedural per-season sky gradient, a fixed
  glass-effect text column on the left, and one crossfaded Vivaldi movement per
  season.

📖 Full architecture and per-feature specs: **[SPECS.md](SPECS.md)**.

---

## Assets

User-generated watercolor images live in [`public/assets/`](public/assets/) and
audio in [`public/audio/`](public/audio/). How to generate/prompt new assets and
the compositing rules are documented in **[ASSETS.md](ASSETS.md)**.

---

## Deploy

Standard Next.js → Vercel. Push the repo and import it on Vercel; no special
configuration is required. Audio files are streamed (`HTMLAudioElement`), so keep
them reasonably compressed (`npm run optimize:audio`).

---

## Project status

See **[HANDOVER.md](HANDOVER.md)** for what's done, known limitations, and next
steps.
