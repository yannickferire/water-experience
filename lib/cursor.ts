// Bridge between the R3F scene and the DOM custom cursor.
// Layers dispatch a hover event; CustomCursor toggles the `hover-image` class.
export const CURSOR_HOVER_EVENT = "xp:cursor-hover";

export function setCursorHover(hover: boolean) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CURSOR_HOVER_EVENT, { detail: hover }));
}
