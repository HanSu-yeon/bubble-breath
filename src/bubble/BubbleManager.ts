import { tuning } from "../config/tuning";
import { createAttachedBubble, detachToFloating, type BubbleInstance } from "./Bubble";
import { spawnPopParticles, updateParticles, type PopParticle } from "../particles/PopParticles";

const BREATH_ACTIVE_THRESHOLD = 0.05;

export class BubbleManager {
  attached: BubbleInstance;
  floating: BubbleInstance[] = [];
  particles: PopParticle[] = [];

  private wandX: number;
  private wandY: number;
  private ringRadius = 62;
  private maxRadius: number = tuning.bubbleMaxRadius;
  private timeSec = 0;
  private releaseHoldMs = 0;
  private burstHoldMs = 0;
  onBurst: (() => void) | null = null;

  /** Fires once when a bubble successfully detaches from the ring. */
  onDetach: (() => void) | null = null;
  /** Fires once when a floating bubble is popped by touch. */
  onPop: (() => void) | null = null;

  constructor(wandX: number, wandY: number) {
    this.wandX = wandX;
    this.wandY = wandY;
    this.attached = createAttachedBubble(wandX, wandY, tuning.bubbleMinRadius);
  }

  setWandPosition(x: number, y: number, ringRadius = 62, maxRadius: number = tuning.bubbleMaxRadius) {
    this.wandX = x;
    this.wandY = y;
    this.ringRadius = ringRadius;
    this.maxRadius = maxRadius;
    this.attached.radius = Math.min(this.attached.radius, maxRadius);
    this.attached.targetRadius = Math.min(this.attached.targetRadius, maxRadius);
    this.updateAttached(0, 0);
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
    // current size until it reaches the automatic release size. Blowing again
    // resumes from here, so a bubble can be built up over several breaths.
    if (blowing) {
      a.targetRadius = Math.min(
        this.maxRadius,
        a.targetRadius + breathStrength * (this.maxRadius - tuning.bubbleMinRadius) / tuning.inflationSeconds * dt
      );
    }
    a.radius += (a.targetRadius - a.radius) * tuning.radiusSmoothing;

    // Lift the body as it grows, keeping its lower neck at the wand.
    const wobble =
      Math.sin(this.timeSec * tuning.wobbleSpeed + a.wobbleSeed) * 0.6 +
      Math.sin(this.timeSec * tuning.wobbleSpeed * 1.7 + a.wobbleSeed) * 0.4;
    const tension = this.burstHoldMs / tuning.burstHoldMs;
    const shake = 1 + tension * tuning.burstWobbleBoost;
    const jitterX = (wobble + Math.sin(this.timeSec * 35) * tension) * tuning.wobbleAmountAttached * a.radius * 1.5 * shake;
    const jitterY =
      Math.sin(this.timeSec * tuning.wobbleSpeed * 0.8 + a.wobbleSeed * 1.4) *
      tuning.wobbleAmountAttached *
      a.radius *
      1.5 * shake;

    a.x = this.wandX + jitterX;
    a.y = this.wandY - this.ringRadius * 0.8 - a.radius * 1.02 + jitterY;
    const releaseRadius = Math.max(tuning.detachMinRadius,
      this.maxRadius * tuning.autoReleaseRatio);
    if (dt > 0) {
      const large = a.radius >= releaseRadius;
      const strong = breathStrength >= tuning.burstBreathStrength;
      this.burstHoldMs = large && strong ? this.burstHoldMs + dt * 1000 : 0;
      this.releaseHoldMs = large && !strong ? this.releaseHoldMs + dt * 1000 : 0;
      if (this.burstHoldMs >= tuning.burstHoldMs) this.burstAttached();
      else if (this.releaseHoldMs >= tuning.autoReleaseHoldMs) this.detachAttached(0, tuning.autoReleaseLift);
    }
  }

  private burstAttached() {
    const bubble = this.attached;
    bubble.state = "popped";
    bubble.poppedAt = performance.now();
    this.floating.push(bubble);
    this.particles.push(...spawnPopParticles(bubble.x, bubble.y, tuning.popParticleCount * 2));
    this.onBurst?.();
    this.attached = createAttachedBubble(this.wandX, this.wandY, tuning.bubbleMinRadius);
    this.releaseHoldMs = this.burstHoldMs = 0;
    this.updateAttached(0, 0);
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

  /** Release automatically at size, or earlier with an upward swipe. */
  detachAttached(flingVx: number, flingBoost: number): boolean {
    const a = this.attached;
    if (a.radius < tuning.detachMinRadius) return false;

    const baseVy = -tuning.floatSpeed * (0.8 + Math.random() * 0.4);
    const detached = detachToFloating(a, baseVy, flingVx, Math.max(0, flingBoost));
    this.floating.push(detached);
    this.onDetach?.();

    this.attached = createAttachedBubble(this.wandX, this.wandY, tuning.bubbleMinRadius);
    this.releaseHoldMs = this.burstHoldMs = 0;
    this.updateAttached(0, 0);
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
