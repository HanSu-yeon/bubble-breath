// Coarse-pointer, narrow-viewport devices (phones) get lighter rendering
// settings; desktops and tablets keep the full-quality visuals.
export function isMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  const coarsePointer = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  return coarsePointer && Math.min(window.innerWidth, window.innerHeight) <= 820;
}
