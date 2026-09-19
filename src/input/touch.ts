// Touch pops floating bubbles and reports upward swipes to release them.
export interface PointerBreathCallbacks {
  hitTestPop: (x: number, y: number) => boolean;
  onDown: () => void;
  onMove: (dx: number, dy: number, elapsedMs: number) => void;
  onUp: () => void;
}

export function attachPointerInput(
  canvas: HTMLCanvasElement,
  callbacks: PointerBreathCallbacks
): () => void {
  let activePointerId: number | null = null;
  let startX = 0;
  let startY = 0;
  let startTime = 0;

  function toLocal(e: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function onPointerDown(e: PointerEvent) {
    const { x, y } = toLocal(e);
    if (callbacks.hitTestPop(x, y)) {
      return;
    }
    activePointerId = e.pointerId;
    startX = x;
    startY = y;
    startTime = performance.now();
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // Pointer capture can be unavailable for some input sources; the
      // gesture still works via the listeners below.
    }
    callbacks.onDown();
  }

  function onPointerMove(e: PointerEvent) {
    if (e.pointerId !== activePointerId) return;
    const { x, y } = toLocal(e);
    callbacks.onMove(x - startX, y - startY, performance.now() - startTime);
  }

  function onPointerUp(e: PointerEvent) {
    if (e.pointerId !== activePointerId) return;
    activePointerId = null;
    callbacks.onUp();
  }

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);

  return () => {
    canvas.removeEventListener("pointerdown", onPointerDown);
    canvas.removeEventListener("pointermove", onPointerMove);
    canvas.removeEventListener("pointerup", onPointerUp);
    canvas.removeEventListener("pointercancel", onPointerUp);
  };
}
