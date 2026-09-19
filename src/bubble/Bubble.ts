export type BubbleState = "attached" | "floating" | "popped";

export interface BubbleInstance {
  id: number;
  state: BubbleState;
  x: number;
  y: number;
  radius: number;
  targetRadius: number;
  vx: number;
  vy: number;
  baseVy: number; // resting buoyancy speed, randomized per bubble
  flingVx: number; // extra horizontal speed from the detach swipe, decays to 0
  flingVyBoost: number; // extra upward speed from the detach swipe, decays to 0
  wobbleSeed: number;
  driftSeed: number;
  detachedAt: number;
  poppedAt: number;
}

let nextId = 1;

export function createAttachedBubble(x: number, y: number, restRadius: number): BubbleInstance {
  return {
    id: nextId++,
    state: "attached",
    x,
    y,
    radius: restRadius,
    targetRadius: restRadius,
    vx: 0,
    vy: 0,
    baseVy: 0,
    flingVx: 0,
    flingVyBoost: 0,
    wobbleSeed: Math.random() * Math.PI * 2,
    driftSeed: Math.random() * Math.PI * 2,
    detachedAt: 0,
    poppedAt: 0,
  };
}

export function detachToFloating(
  bubble: BubbleInstance,
  baseVy: number,
  flingVx: number,
  flingVyBoost: number
): BubbleInstance {
  return {
    ...bubble,
    id: nextId++,
    state: "floating",
    baseVy,
    flingVx,
    flingVyBoost,
    vx: flingVx,
    vy: baseVy - flingVyBoost,
    detachedAt: performance.now(),
  };
}
