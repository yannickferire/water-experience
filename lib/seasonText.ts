// Original lines per season — the season name is woven into the prose itself
// (no separate title/subtitle). Shown in the left text block, scrolled on scroll.
export type SeasonText = {
  id: string;
  lines: string[];
};

export const SEASON_TEXTS: SeasonText[] = [
  {
    id: "spring",
    lines: [
      "Spring returns to greet the warmth,",
      "streams whisper under a gentle breeze,",
      "and the meadow wakes to the first violin.",
    ],
  },
  {
    id: "summer",
    lines: [
      "Summer weighs heavy on the still fields,",
      "thunder gathers far beyond the hills,",
      "and the long heat breaks in racing strings.",
    ],
  },
  {
    id: "autumn",
    lines: [
      "Autumn slows the harvest dance to rest,",
      "the village drifts, warm and content,",
      "before a quiet hunt sets out at dawn.",
    ],
  },
  {
    id: "winter",
    lines: [
      "Winter bites with ice and wind,",
      "we stamp against the cold and run,",
      "and by the fire the rain taps at the glass.",
    ],
  },
];

// Scroll position (0..1) where each season is centered.
export const SEASON_AT = [0, 1 / 3, 2 / 3, 1];
