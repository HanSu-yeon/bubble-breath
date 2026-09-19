// Central tuning values. Adjust these while testing instead of hard-coding
// numbers elsewhere. See docs/03_Technical_Specs/00_DEVELOPMENT_PRINCIPLES.md.
export const tuning = {
  // fake breath input (Phase 1 dev input, replaced by mic in Phase 3)
  breathRamp: 0.16, // exponential smoothing toward pressed target, per frame

  // attached bubble growth (body). Growth only happens while actively
  // blowing; pausing holds the current size — it never shrinks or
  // auto-detaches on its own. Blowing again resumes growth from where it
  // left off, so a bubble can be built up over several separate breaths.
  bubbleMinRadius: 22, // resting film radius ~= wand inner opening
  bubbleMaxRadius: 150,
  growthRate: 120, // px/sec of target body radius growth at full breath strength
  radiusSmoothing: 0.22, // per-frame easing of rendered radius toward target

  // detach gesture: swiping the held bubble upward releases it from the
  // ring and flings it into a floating bubble. This is the only way a
  // bubble detaches — breath stopping never does.
  detachMinRadius: 30, // must have grown at least this much for a swipe to do anything
  swipeDetachThreshold: 34, // px of upward drag before it counts as a detach swipe
  swipeFlingMultiplier: 0.8, // fraction of drag speed that carries into the initial fling
  swipeFlingMaxBoost: 320, // px/s cap on the extra upward fling speed
  flingDecayTau: 320, // ms time-constant for fling velocity to decay to normal buoyancy

  // post-detach settle ("뽀용"): a quick decaying squash/stretch bounce back
  // to round, layered on top of the normal floating wobble.
  settleDuration: 380, // ms
  settleAmplitude: 0.26,
  settleFrequency: 17, // radians/sec of the decaying oscillation

  // wobble (render-only deformation, never affects hit-testing radius). A
  // bubble is never a perfect mathematical circle, attached or floating.
  wobbleAmountAttached: 0.016,
  wobbleAmountFloating: 0.045,
  wobbleSpeed: 2.6,

  // overinflate burst ("팡ㅋㅋ"): if you keep blowing after the body has
  // already reached max size, there's a small per-second chance it bursts
  // right there in the ring — a playful accident, not a punishment.
  // Pausing at max size is always safe; only continuing to blow risks it.
  overinflatePopChancePerSecond: 1.1, // ~0.9s average once at max size while still blowing
  overinflateTensionRamp: 0.6, // seconds to reach full tension (max wobble) while overinflating
  overinflateTensionRelax: 0.3, // seconds for tension to fade once you stop
  overinflateWobbleBoost: 2.5, // extra wobble multiplier at full tension, as a warning tell
  overinflateParticleCount: 16, // bigger burst than a normal pop

  // floating bubble motion. Fast enough that a freshly detached bubble
  // clears the wand area before the next one grows large, so they don't
  // visually stack on top of each other.
  floatSpeed: 46, // px/sec base upward buoyancy
  floatSpeedVariance: 0.35,
  horizontalDrift: 22,
  driftNoiseSpeed: 0.55,

  // lifecycle
  maxBubbleCount: 28,
  popDuration: 260, // ms
  popParticleCount: 9,
} as const;
