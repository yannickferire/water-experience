"use client";

import { useEffect } from "react";
import { AUDIO_EVENT, AUDIO_TOGGLE } from "@/lib/audio";

// One looping track per season, crossfaded on scroll.
// Optimizations:
//  - HTMLAudioElement streaming (no full decode -> low memory)
//  - only spring is preloaded; others load lazily when we get near them
//  - approaching tracks start playing SILENTLY (decode ahead -> no hitch on the
//    crossfade); tracks are paused only once they're far away and silent
//  - the manager runs on a light timer (NOT the render rAF) to avoid stealing
//    frame time during scroll
//  - autoplay is unlocked on the first user gesture (browser policy)
const TRACKS = ["spring", "summer", "autumn", "winter"];
const PREFETCH = 0.6; // load + pre-play a track within 0.6 "stations" of it
const FADE = 2.2; // crossfade speed (higher = faster)
const TICK_MS = 40; // audio manager cadence (~25fps, decoupled from render)

export default function SeasonAudio({
  scrollRef,
}: {
  scrollRef: React.MutableRefObject<number>;
}) {
  useEffect(() => {
    const N = TRACKS.length;
    const audios = TRACKS.map((name, i) => {
      const a = new Audio();
      a.src = `/audio/${name}.mp3`;
      a.loop = true;
      a.preload = i === 0 ? "auto" : "none";
      a.volume = 0;
      return a;
    });

    const loaded = new Set<number>([0]);
    const ensure = (i: number) => {
      if (loaded.has(i)) return;
      loaded.add(i);
      audios[i].preload = "auto";
      audios[i].load();
    };

    let unlocked = false;
    let userPaused = false;
    let prev = performance.now();
    let prevPlaying = false;
    let prevActive = -1;

    const step = () => {
      const now = performance.now();
      const dt = Math.min((now - prev) / 1000, 0.25);
      prev = now;

      const pos = scrollRef.current * (N - 1); // position in "stations"
      // bias the switch later (+0.3) so the next track triggers closer to its station.
      const active = Math.max(0, Math.min(N - 1, Math.floor(pos + 0.3)));

      // intent = we WANT to play; uiPlaying = the element is ACTUALLY playing
      // (play() can be blocked by autoplay policy, so the UI must reflect reality).
      const intent = unlocked && !userPaused;
      const uiPlaying = !userPaused && !audios[active].paused;

      // Notify the player UI when the real state changes.
      if (uiPlaying !== prevPlaying || active !== prevActive) {
        prevPlaying = uiPlaying;
        prevActive = active;
        window.dispatchEvent(
          new CustomEvent(AUDIO_EVENT, {
            detail: { playing: uiPlaying, season: active },
          })
        );
      }

      for (let i = 0; i < N; i++) {
        const a = audios[i];
        const near = Math.abs(pos - i) < PREFETCH;
        const target = intent && i === active ? 1 : 0;

        if (intent && near) {
          ensure(i);
          if (a.paused) a.play().catch(() => {}); // pre-play silently (decode ahead)
        }

        a.volume = Math.max(
          0,
          Math.min(1, target + (a.volume - target) * Math.exp(-FADE * dt))
        );

        // pause only when far away AND silent (keeps active + approaching alive)
        if (!near && a.volume < 0.01 && !a.paused) a.pause();
      }
    };

    const id = window.setInterval(step, TICK_MS);

    // Play the current season's track NOW (synchronously, inside a user gesture)
    // so the browser autoplay policy lets it through.
    const playActive = () => {
      const i = Math.max(0, Math.min(N - 1, Math.floor(scrollRef.current * (N - 1) + 0.3)));
      ensure(i);
      audios[i].play().catch(() => {});
    };

    // First scroll/key starts the music (autoplay unlock). NOT pointerdown, so it
    // never conflicts with clicking the player button.
    const start = () => {
      if (unlocked) return;
      unlocked = true;
      if (!userPaused) playActive();
    };
    window.addEventListener("wheel", start, { passive: true });
    window.addEventListener("touchmove", start, { passive: true });
    window.addEventListener("keydown", start);

    // Explicit play/pause from the player UI (runs synchronously on the click).
    const toggle = () => {
      if (!unlocked || userPaused) {
        unlocked = true;
        userPaused = false;
        playActive();
      } else {
        userPaused = true;
      }
    };
    window.addEventListener(AUDIO_TOGGLE, toggle);

    return () => {
      window.clearInterval(id);
      window.removeEventListener("wheel", start);
      window.removeEventListener("touchmove", start);
      window.removeEventListener("keydown", start);
      window.removeEventListener(AUDIO_TOGGLE, toggle);
      audios.forEach((a) => {
        a.pause();
        a.src = "";
      });
    };
  }, [scrollRef]);

  return null;
}
