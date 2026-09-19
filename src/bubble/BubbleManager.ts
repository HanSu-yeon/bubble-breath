import { tuning } from "../config/tuning";
import { createAttachedBubble, detachToFloating, type BubbleInstance } from "./Bubble";
import { spawnPopParticles, updateParticles, type PopParticle } from "../particles/PopParticles";

const BREATH_ACTIVE_THRESHOLD = 0.08;

export class BubbleManager {
  attached: BubbleInstance;
  floating: BubbleInstance[] = [];
  particles: PopParticle[] = [];

  private wandX: number;
  private wandY: number;
  private timeSec = 0;
  private overinflateTension = 0; // 0..1, ramps while blowing at max radius

  /** Fires once when a bubble successfully detaches from the ring. */
  onDetach: (() => void) | null = null;
  /** Fires once when a floating bubble is popped by touch. */
  onPop: (() => void) | null = null;
  /** Fires once when an attached bubble bursts from being overinflated. */
  onBurst: (() => void) | null = null;

  constructor(wandX: number, wandY: number) {
    this.wandX = wandX;
    this.wandY = wandY;
    this.attached = createAttachedBubble(wandX, wandY, tuning.bubbleMinRadius);
  }

  setWandPosition(x: number, y: number) {
    this.wandX = x;
    this.wandY = y;
  }

  update(dtMs: number, breathStrength: number) {
    const dt = dtMs / 1000;
    this.timeSec += dt;

    this.updateAttached(dt, breathStrength);
    this.updateFloating(dt);
    this.particles = updateParticles(this.particles, dtMs);
  }

  private updateAttached(dt: number, breathStrength: number) {
    const a = this.attached;
    const blowing = breathStrength > BREATH_ACTIVE_THRESHOLD;

    // Growth only advances while actively blowing. Pausing holds the
    // current size exactly — no shrinking, no auto-detach. Blowing again
    // resumes from here, so a bubble can be built up over several breaths.
    if (blowing) {
      a.targetRadius = Math.min(
        tuning.bubbleMaxRadius,
        a.targetRadius + breathStrength * tuning.growthRate * dt
      );
    }
    a.radius += (a.targetRadius - a.radius) * tuning.radiusSmoothing;

    // Overinflate burst: continuing to blow after the body is already at
    // max size risks a playful accidental pop, right there on the pipe.
    // Pausing at max size is always safe — tension only builds while
    // actively blowing, and fades quickly once you stop.
    const atMax = a.radius >= tuning.bubbleMaxRadius - 0.5;
    if (blowing && atMax) {
      this.overinflateTension = Math.min(1, this.overinflateTension + dt / tuning.overinflateTensionRamp);
      if (Math.random() < tuning.overinflatePopChancePerSecond * dt) {
        this.burstAttached();
        return;
      }
    } else {
      this.overinflateTension = Math.max(0, this.overinflateTension - dt / tuning.overinflateTensionRelax);
    }

    // Body position: centered on the ring, bulging toward the camera as it
    // grows rather than rising above the wand like a balloon — plus a
    // small idle jiggle so a paused bubble still feels alive. The jiggle
    // grows more pronounced as overinflate tension builds, as a warning
    // tell before it bursts.
    const wobbleBoost = 1 + this.overinflateTension * tuning.overinflateWobbleBoost;
    const wobble =
      Math.sin(this.timeSec * tuning.wobbleSpeed + a.wobbleSeed) * 0.6 +
      Math.sin(this.timeSec * tuning.wobbleSpeed * 1.7 + a.wobbleSeed) * 0.4;
    const jitterX = wobble * tuning.wobbleAmountAttached * wobbleBoost * a.radius * 1.5;
    const jitterY =
      Math.sin(this.timeSec * tuning.wobbleSpeed * 0.8 + a.wobbleSeed * 1.4) *
      tuning.wobbleAmountAttached *
      wobbleBoost *
      a.radius *
      1.5;

    a.x = this.wandX + jitterX;
    a.y = this.wandY + jitterY;
  }

  /** Bursts the currently attached bubble in place (overinflate accident). */
  private burstAttached() {
    const a = this.attached;
    a.state = "popped";
    a.poppedAt = performance.now();
    this.floating.push(a);
    this.particles.push(...spawnPopParticles(a.x, a.y, tuning.overinflateParticleCount));
    this.onBurst?.();

    this.attached = createAttachedBubble(this.wandX, this.wandY, tuning.bubbleMinRadius);
    this.overinflateTension = 0;
    this.enforceMaxCount();
  }

  private updateFloating(dt: number) {
    const nowMs = performance.now();
    for (const b of this.floating) {
      if (b.state !== "floating") continue;
      const elapsedS = Math.max(0, (nowMs - b.detachedAt) / 1000);
      const decay = Math.exp(-elapsedS / (tuning.flingDecayTau / 1000));
      b.vy = b.baseVy - b.flingVyBoost * decay;
      b.vx = Math.sin(this.timeSec * tuning.driftNoiseSpeed + b.driftSeed) * tuning.horizontalDrift + b.flingVx * decay;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
    }

    this.floating = this.floating.filter((b) => {
      if (b.state === "popped") {
        return nowMs - b.poppedAt < tuning.popDuration;
      }
      return b.y + b.radius > -40;
    });
  }

  private enforceMaxCount() {
    const overflow = this.floating.length - tuning.maxBubbleCount;
    if (overflow > 0) {
      this.floating.splice(0, overflow);
    }
  }

  /**
   * The only way a bubble detaches: an explicit upward swipe on the held
   * bubble releases it from the ring and flings it free. Breath stopping
   * never detaches on its own. Returns false if there isn't enough of a
   * bubble yet for the gesture to do anything.
   */
  detachAttached(flingVx: number, flingBoost: number): boolean {
    const a = this.attached;
    if (a.radius < tuning.detachMinRadius) return false;

    const baseVy = -tuning.floatSpeed * (0.8 + Math.random() * 0.4);
    const detached = detachToFloating(a, baseVy, flingVx, Math.max(0, flingBoost));
    this.floating.push(detached);
    this.onDetach?.();

    this.attached = createAttachedBubble(this.wandX, this.wandY, tuning.bubbleMinRadius);
    this.enforceMaxCount();
    return true;
  }

  /** Hit-tests floating bubbles topmost-first; pops and returns true if one was hit. */
  tryPopAt(x: number, y: number): boolean {
    for (let i = this.floating.length - 1; i >= 0; i--) {
      const b = this.floating[i];
      if (b.state !== "floating") continue;
      const dx = x - b.x;
      const dy = y - b.y;
      if (dx * dx + dy * dy <= b.radius * b.radius) {
        b.state = "popped";
        b.poppedAt = performance.now();
        this.particles.push(...spawnPopParticles(b.x, b.y, tuning.popParticleCount));
        this.onPop?.();
        return true;
      }
    }
    return false;
  }
}
