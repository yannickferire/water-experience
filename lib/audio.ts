// Audio bridge (like lib/cursor.ts):
//  - AUDIO_EVENT : SeasonAudio -> player UI (current state)
//  - AUDIO_TOGGLE: player UI -> SeasonAudio (play/pause command)
export const AUDIO_EVENT = "xp:audio";
export const AUDIO_TOGGLE = "xp:audio-toggle";

export type AudioState = { playing: boolean; season: number };

export function toggleAudio() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(AUDIO_TOGGLE));
}

// Vivaldi — The Four Seasons: movement title + tempo marking per season.
export const MOVEMENTS = [
  { movement: "Primavera", tempo: "Allegro" },
  { movement: "Estate", tempo: "Presto" },
  { movement: "Autunno", tempo: "Allegro" },
  { movement: "Inverno", tempo: "Allegro non molto" },
];
