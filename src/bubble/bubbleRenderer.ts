import { tuning } from "../config/tuning";
import type { BubbleInstance } from "./Bubble";

// Shared soap-film material for attached, floating, and popping bubbles.
export interface HighlightLayer {
  dx: number;
  dy: number;
  rx: number;
  ry: number;
  rot: number;
  alpha: number;
  color: string; // base color before alpha (rgb triplet string, e.g. "255,255,255")
  kind: "soft" | "sharp"; // soft = blurred gradient blob, sharp = tiny crisp point
}

export interface BubbleStyle {
  rimStops: { offset: number; color: string }[];
  hazeTints: string[]; // a few soft pastel color blobs inside, not a uniform fill
  highlights: HighlightLayer[];
  // Overall strength multiplier for rim + haze visibility. ~1 for a normal
  // bubble; a future Rainbow Bubble variant would pass something like
  // ~1.6-1.8 here (plus more saturated rimStops/hazeTints) to read as
  // clearly rarer without changing any of the drawing code.
  iridescence: number;
}

export const defaultBubbleStyle: BubbleStyle = {
  rimStops: [
    { offset: 0, color: "rgba(167,244,239,0.8)" },
    { offset: 0.12, color: "rgba(191,147,247,0.75)" },
    { offset: 0.24, color: "rgba(250,167,224,0.9)" },
    { offset: 0.34, color: "rgba(255,230,156,0.9)" },
    { offset: 0.43, color: "rgba(143,227,208,0.6)" },
    { offset: 0.55, color: "rgba(137,187,250,0.7)" },
    { offset: 0.66, color: "rgba(217,139,239,0.85)" },
    { offset: 0.77, color: "rgba(255,209,156,0.9)" },
    { offset: 0.88, color: "rgba(186,172,244,0.65)" },
    { offset: 1, color: "rgba(167,244,239,0.8)" },
  ],
  hazeTints: ["161,232,225", "205,137,232", "249,206,133", "134,173,238"],
  highlights: [
    { dx: -0.79, dy: -0.46, rx: 0.16, ry: 0.085, rot: -1.05, alpha: 0.5, color: "255,180,229", kind: "soft" },
    { dx: -0.79, dy: -0.46, rx: 0.085, ry: 0.032, rot: -1.05, alpha: 0.98, color: "255,255,255", kind: "soft" },
    { dx: -0.79, dy: -0.46, rx: 0.057, ry: 0.019, rot: -1.05, alpha: 0.95, color: "255,255,255", kind: "sharp" },
    { dx: -0.7, dy: -0.29, rx: 0.055, ry: 0.025, rot: -1.15, alpha: 0.8, color: "184,255,251", kind: "soft" },
    { dx: -0.7, dy: -0.29, rx: 0.026, ry: 0.011, rot: -1.15, alpha: 0.9, color: "235,255,255", kind: "sharp" },
    { dx: 0.86, dy: -0.34, rx: 0.12, ry: 0.05, rot: 1.15, alpha: 0.55, color: "255,210,244", kind: "soft" },
    { dx: 0.86, dy: -0.34, rx: 0.067, ry: 0.017, rot: 1.15, alpha: 0.95, color: "255,255,255", kind: "sharp" },
    { dx: 0.82, dy: -0.02, rx: 0.08, ry: 0.04, rot: 1.5, alpha: 0.6, color: "175,251,245", kind: "soft" },
    { dx: 0.82, dy: -0.02, rx: 0.036, ry: 0.013, rot: 1.5, alpha: 0.95, color: "255,255,255", kind: "sharp" },
    { dx: -0.7, dy: 0.66, rx: 0.09, ry: 0.035, rot: 0.8, alpha: 0.75, color: "255,235,183", kind: "soft" },
  ],
  iridescence: 1,
};

function idleWobble(seed: number, timeSec: number): number {
  const t = timeSec * tuning.wobbleSpeed + seed;
  return Math.sin(t) * 0.6 + Math.sin(t * 1.7 + seed) * 0.4;
}

/** A soft-edged elliptical blob (radial gradient, never a hard-edged fill). */
function drawSoftBlob(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  rot: number,
  color: string,
  alpha: number
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.scale(1, Math.max(0.05, ry / rx));
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(1, rx));
  g.addColorStop(0, `rgba(${color},${alpha.toFixed(3)})`);
  g.addColorStop(0.6, `rgba(${color},${(alpha * 0.35).toFixed(3)})`);
  g.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, Math.max(1, rx), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Fills + strokes whatever path is currently set on the context (circle or traced neck+body). */
function paintPath(
  ctx: CanvasRenderingContext2D,
  style: BubbleStyle,
  centerX: number,
  centerY: number,
  radius: number,
  seed: number,
  timeSec: number,
  visibilityBoost = 0,
  traceOutline?: () => void
) {
  const k = style.iridescence;
  const vis = 1 + Math.max(0, visibilityBoost);
  const shimmer = 0.92 + 0.08 * Math.sin(timeSec * 0.35 + seed);

  // Preserve the caller's silhouette for every film layer and reflection.
  // Clipping also keeps the broad interference bands inside the surface.
  ctx.save();
  ctx.clip();
  const film = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
  film.addColorStop(0, "rgba(133,123,187,0.015)");
  film.addColorStop(0.7, "rgba(133,123,187,0.025)");
  film.addColorStop(0.88, "rgba(130,161,192,0.07)");
  film.addColorStop(0.96, "rgba(186,156,218,0.12)");
  film.addColorStop(1, "rgba(220,211,246,0.2)");
  ctx.fillStyle = film;
  ctx.fill();

  // Nested, slightly off-center spectral bands suggest thin-film
  // interference. The center stays clear enough to see the scene through it.
  const surfaceAlpha = ctx.globalAlpha;
  for (let layer = 0; layer < 7; layer++) {
    const inset = layer * 0.019;
    const bandRadius = radius * (0.995 - inset);
    const dx = Math.sin(seed + layer * 1.8 + timeSec * 0.12) * radius * inset * 0.2;
    const dy = Math.cos(seed + layer * 1.3) * radius * inset * 0.2;
    const gradient = typeof ctx.createConicGradient === "function"
      ? ctx.createConicGradient(-0.5 + layer * 0.65 + Math.sin(timeSec * 0.14 + seed) * 0.12, centerX, centerY)
      : ctx.createLinearGradient(centerX - radius, centerY - radius, centerX + radius, centerY + radius);
    for (const stop of style.rimStops) gradient.addColorStop(stop.offset, stop.color);
    ctx.globalAlpha = surfaceAlpha * Math.min(1, (layer === 0 ? 1 : 0.48 - layer * 0.055) * k * shimmer * vis);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = Math.max(0.65, radius * (layer === 0 ? 0.009 : 0.035));
    ctx.beginPath();
    if (traceOutline) {
      ctx.save();
      ctx.translate(dx, dy);
      ctx.scale(bandRadius / radius, bandRadius / radius);
      traceOutline();
      ctx.restore();
    } else {
      ctx.ellipse(centerX + dx, centerY + dy, bandRadius, bandRadius, 0, 0, Math.PI * 2);
    }
    ctx.stroke();
    // Restore the caller's opacity, including the pop animation fade.
    ctx.globalAlpha = surfaceAlpha;
  }

  // Broad colored reflections soften the bands without fogging the center.
  style.hazeTints.forEach((color, i) => {
    const angle = -2.5 + i * 1.65 + Math.sin(timeSec * 0.15 + seed) * 0.08;
    drawSoftBlob(ctx,
      centerX + Math.cos(angle) * radius * 0.88,
      centerY + Math.sin(angle) * radius * 0.88,
      radius * 0.4, radius * 0.11, angle + Math.PI / 2,
      color, Math.min(1, 0.34 * k * shimmer));
  });

  for (let i = 0; i < 9; i++) {
    const angle = i * Math.PI * 2 / 9 + Math.sin(timeSec * 0.19 + i) * 0.035;
    const tint = style.hazeTints[i % style.hazeTints.length];
    drawSoftBlob(ctx, centerX + Math.cos(angle) * radius * 0.94,
      centerY + Math.sin(angle) * radius * 0.94,
      radius * (0.16 + 0.06 * Math.sin(i * 2.3)), radius * 0.047,
      angle + Math.PI / 2, tint, 0.36 * shimmer);
  }

  for (const h of style.highlights) {
    const cx = centerX + radius * h.dx;
    const cy = centerY + radius * h.dy;
    const alpha = Math.min(1, h.alpha * vis * shimmer);
    if (h.kind === "soft") {
      drawSoftBlob(ctx, cx, cy, Math.max(1, radius * h.rx), Math.max(1, radius * h.ry), h.rot, h.color, alpha);
    } else {
      ctx.beginPath();
      ctx.ellipse(cx, cy, Math.max(0.4, radius * h.rx), Math.max(0.35, radius * h.ry), h.rot, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${h.color},${alpha})`;
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Decaying squash/stretch bounce right after detaching ("뽀용"), settling to round. */
function settleEnvelope(bubble: BubbleInstance, nowMs: number): number {
  const elapsed = nowMs - bubble.detachedAt;
  if (elapsed < 0 || elapsed > tuning.settleDuration) return 0;
  const decay = Math.exp(-elapsed / (tuning.settleDuration / 3));
  return tuning.settleAmplitude * decay * Math.cos((elapsed / 1000) * tuning.settleFrequency);
}

/** A round body rises above the wand, tapering into a fixed soap-film neck. */
export function drawAttachedBubble(
  ctx: CanvasRenderingContext2D,
  style: BubbleStyle,
  bubble: BubbleInstance,
  timeSec: number,
  visibilityBoost = 0,
  anchor?: { x: number; y: number; radius: number }
) {
  const liveWobble = idleWobble(bubble.wobbleSeed, timeSec);
  const scaleX = 1 + liveWobble * tuning.wobbleAmountAttached;
  const scaleY = 1 - liveWobble * tuning.wobbleAmountAttached * 0.75;
  const r = bubble.radius;
  // Compensate for body wobble so the attachment never slides off the ring.
  const neckX = anchor ? (anchor.x - bubble.x) / scaleX : 0;
  const neckY = anchor ? (anchor.y - anchor.radius * 0.8 - bubble.y) / scaleY : r;
  const neckWidth = anchor ? Math.min(r * 0.32, anchor.radius * 0.52) / scaleX : r * 0.25;
  const trace = () => {
    const angle = 0.52;
    const shoulderX = Math.sin(angle) * r;
    const shoulderY = Math.cos(angle) * r;
    ctx.arc(0, 0, r, Math.PI / 2 + angle, Math.PI * 2 + Math.PI / 2 - angle);
    ctx.bezierCurveTo(shoulderX - r * 0.16, shoulderY + r * 0.1,
      neckX + neckWidth, neckY - r * 0.06, neckX + neckWidth, neckY);
    ctx.quadraticCurveTo(neckX, neckY + r * 0.025, neckX - neckWidth, neckY);
    ctx.bezierCurveTo(neckX - neckWidth, neckY - r * 0.06,
      -shoulderX + r * 0.16, shoulderY + r * 0.1, -shoulderX, shoulderY);
    ctx.closePath();
  };

  ctx.save();
  ctx.translate(bubble.x, bubble.y);
  ctx.scale(scaleX, scaleY);
  ctx.beginPath();
  trace();
  paintPath(ctx, style, 0, 0, r, bubble.wobbleSeed, timeSec, visibilityBoost, trace);
  ctx.restore();
}

/** Floating bubbles are surface-tension round, with a quick settle bounce right after detaching. */
export function drawFloatingBubble(
  ctx: CanvasRenderingContext2D,
  style: BubbleStyle,
  bubble: BubbleInstance,
  timeSec: number,
  nowMs: number,
  visibilityBoost = 0
) {
  const wobble = idleWobble(bubble.wobbleSeed, timeSec);
  const settle = settleEnvelope(bubble, nowMs);
  const scaleX = 1 + tuning.wobbleAmountFloating * wobble - settle * 0.6;
  const scaleY = 1 - tuning.wobbleAmountFloating * wobble + settle;

  ctx.save();
  ctx.translate(bubble.x, bubble.y);
  ctx.scale(scaleX, scaleY);
  ctx.beginPath();
  ctx.arc(0, 0, bubble.radius, 0, Math.PI * 2);
  paintPath(ctx, style, 0, 0, bubble.radius, bubble.wobbleSeed, timeSec, visibilityBoost);
  ctx.restore();
}

export function drawPoppingBubble(
  ctx: CanvasRenderingContext2D,
  style: BubbleStyle,
  bubble: BubbleInstance,
  progress: number,
  timeSec: number,
  visibilityBoost = 0
) {
  const squash = progress < 0.15;
  const scaleX = squash ? 1 + progress * 0.5 : 1.08 + (progress - 0.15) * 0.4;
  const scaleY = squash ? 1 - progress * 0.7 : 0.9 + (progress - 0.15) * 0.4;
  const alpha = Math.max(0, 1 - progress * 1.15);

  ctx.save();
  ctx.translate(bubble.x, bubble.y);
  ctx.scale(scaleX, scaleY);
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.arc(0, 0, bubble.radius, 0, Math.PI * 2);
  paintPath(ctx, style, 0, 0, bubble.radius, bubble.wobbleSeed, timeSec, visibilityBoost);
  ctx.restore();
}
