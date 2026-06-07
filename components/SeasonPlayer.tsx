"use client";

import { useEffect, useState } from "react";
import { AUDIO_EVENT, MOVEMENTS, toggleAudio, type AudioState } from "@/lib/audio";

// Bottom-right control: what's playing + a dot indicator (right of the text).
// Click to play / pause.
export default function SeasonPlayer() {
  const [state, setState] = useState<AudioState>({ playing: false, season: 0 });
  const [hasPlayed, setHasPlayed] = useState(false);

  useEffect(() => {
    const on = (e: Event) => {
      const s = (e as CustomEvent).detail as AudioState;
      setState(s);
      if (s.playing) setHasPlayed(true);
    };
    window.addEventListener(AUDIO_EVENT, on);
    return () => window.removeEventListener(AUDIO_EVENT, on);
  }, []);

  const m = MOVEMENTS[state.season] ?? MOVEMENTS[0];

  return (
    <button
      type="button"
      className={`player${state.playing ? " is-playing" : ""}`}
      onClick={toggleAudio}
      aria-label={state.playing ? "Pause music" : "Play music"}
    >
      {state.playing ? (
        <span className="player__label">
          playing Vivaldi – Four Seasons
          <br />
          <b>{m.movement}</b> - {m.tempo}
        </span>
      ) : (
        <span className="player__label player__label--off">
          {hasPlayed ? "paused" : "play sound"}
        </span>
      )}
      <span className="player__dot" />
    </button>
  );
}
