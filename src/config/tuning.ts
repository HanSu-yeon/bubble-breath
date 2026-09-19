// Central tuning values. Adjust these while testing instead of hard-coding
// numbers elsewhere. See docs/03_Technical_Specs/00_DEVELOPMENT_PRINCIPLES.md.
export const tuning = {
  // Microphone calibration and ambient-relative breath detection.
  micCalibrationMs: 1200,
  micNoiseFloor: 0.002, // numerical floor for otherwise silent input
  micNoiseMultiplier: 1.6,
  micFullStrengthLevel: 0.07,
  micAttackMs: 90,
  micResponseExponent: 0.65, // lift gentle breath without amplifying below-gate noise

  // At release size, gentle breath lets the bubble fly; sustained strong breath bursts it.
  bubbleMinRadius: 22, // resting film radius ~= wand inner opening
  bubbleMaxRadius: 150,
  inflationSeconds: 2.5, // full-strength breath duration, independent of screen size
  radiusSmoothing: 0.22, // per-frame easing of rendered radius toward target

  autoReleaseRatio: 0.68, // relative to the available screen space
  autoReleaseHoldMs: 250, // brief pause before the smaller bubble lifts off
  autoReleaseLift: 55,
  burstBreathStrength: 0.72,
  burstHoldMs: 400,
  burstWobbleBoost: 3.5,

  // Swiping upward can release a smaller bubble early.
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
