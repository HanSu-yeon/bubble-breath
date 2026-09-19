import { tuning } from "../config/tuning";
import type { BubbleInstance } from "./Bubble";

// Bubble visuals are data-driven so a future "bubble style" picker (and a
// future rare Rainbow Bubble variant, via `iridescence`) can swap this out
// without touching the draw call sites.
//
// Depth is sold entirely through radius, transparency, layered soft
// highlights, and a thin, uneven iridescent rim — no 3D guides (sphere
// outline, lat/long lines, axis markers, perspective helpers), no thick
// dark outline (must still read against a bright sky background later),
// and no flat "filled" interior or solid opaque highlight blobs.
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
  // Non-uniform rim: mostly soft/near-transparent with several localized
  // glints of color — not a smooth continuous rainbow band.
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
  // Baseline is soft but visible; several arcs glint brighter, like light
  // catching a real soap film at a few points — not one uniform stroke.
  rimStops: [
    { offset: 0.0, color: "rgba(255,255,255,0.16)" },
    { offset: 0.02, color: "rgba(255,255,255,0.75)" },
    { offset: 0.05, color: "rgba(190,235,255,0.6)" },
    { offset: 0.09, color: "rgba(255,255,255,0.14)" },
    { offset: 0.24, color: "rgba(255,255,255,0.12)" },
    { offset: 0.27, color: "rgba(255,205,232,0.62)" },
    { offset: 0.3, color: "rgba(255,255,255,0.62)" },
    { offset: 0.33, color: "rgba(255,255,255,0.13)" },
    { offset: 0.5, color: "rgba(255,255,255,0.1)" },
    { offset: 0.53, color: "rgba(225,245,190,0.4)" }, // subtle pale green glint
    { offset: 0.56, color: "rgba(255,255,255,0.12)" },
    { offset: 0.62, color: "rgba(255,255,255,0.11)" },
    { offset: 0.655, color: "rgba(195,230,255,0.55)" },
    { offset: 0.69, color: "rgba(255,255,255,0.13)" },
    { offset: 0.86, color: "rgba(255,255,255,0.1)" },
    { offset: 0.89, color: "rgba(230,205,255,0.42)" }, // faint violet glint
    { offset: 0.93, color: "rgba(255,255,255,0.14)" },
    { offset: 1.0, color: "rgba(255,255,255,0.16)" },
  ],
  hazeTints: ["255,255,255", "190,230,255", "255,205,232", "218,200,255"],
  highlights: [
    { dx: -0.26, dy: -0.3, rx: 0.42, ry: 0.36, rot: -0.4, alpha: 0.18, color: "255,255,255", kind: "soft" },
    { dx: -0.24, dy: -0.32, rx: 0.16, ry: 0.11, rot: -0.4, alpha: 0.32, color: "255,255,255", kind: "soft" },
    { dx: -0.23, dy: -0.35, rx: 0.042, ry: 0.036, rot: 0, alpha: 0.92, color: "255,255,255", kind: "sharp" },
    { dx: 0.22, dy: 0.3, rx: 0.018, ry: 0.015, rot: 0, alpha: 0.4, color: "255,255,255", kind: "sharp" },
    { dx: 0.16, dy: 0.26, rx: 0.14, ry: 0.1, rot: 0.4, alpha: 0.11, color: "190,230,255", kind: "soft" },
    { dx: -0.08, dy: 0.4, rx: 0.16, ry: 0.11, rot: -0.2, alpha: 0.08, color: "225,205,255", kind: "soft" },
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
  visibilityBoost = 0
) {
  const k = style.iridescence;
  const breathe = 0.7 + 0.3 * Math.sin(timeSec * 0.25 + seed); // very slow "alive" shimmer
  // Nudges highlight/rim/haze strength up a little against a bright sky so
  // the film never disappears — never a thicker outline, just a bit more
  // contrast in what's already there.
  const vis = 1 + Math.max(0, visibilityBoost);

  // Interior: near-fully transparent. A faint white haze plus a few soft
  // pastel tints scattered around (not a uniform fill), each fading in and
  // out very slowly.
  const hazeA = ctx.createRadialGradient(
    centerX - radius * 0.25,
    centerY - radius * 0.3,
    Math.max(1, radius * 0.1),
    centerX,
    centerY,
    Math.max(2, radius)
  );
  hazeA.addColorStop(0, `rgba(255,255,255,${(0.07 * k * vis).toFixed(3)})`);
  hazeA.addColorStop(0.55, `rgba(255,255,255,${(0.02 * k * vis).toFixed(3)})`);
  hazeA.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = hazeA;
  ctx.fill();

  // Thin, non-uniform iridescent rim: stays thin, but several localized
  // glints make it clearly visible (not a thick outline). Stroked on the
  // SAME path as the haze fill above — must happen before anything below
  // calls beginPath() again (Canvas 2D does not save/restore the current
  // path, only style state).
  const rimWidth = Math.max(0.8, radius * 0.016);

  // A soft blurred bloom behind the crisp rim, so light reads as gently
  // glowing off the film rather than just a hard thin line.
  if (typeof ctx.filter === "string") {
    ctx.save();
    ctx.filter = `blur(${Math.max(0.6, radius * 0.035)}px)`;
    ctx.lineWidth = rimWidth * 3;
    ctx.strokeStyle = `rgba(255,255,255,${(0.14 * k * breathe * vis).toFixed(3)})`;
    ctx.stroke();
    ctx.restore();
  }

  ctx.lineWidth = rimWidth;
  if (typeof ctx.createConicGradient === "function") {
    const conic = ctx.createConicGradient(seed + timeSec * 0.12, centerX, centerY);
    style.rimStops.forEach((stop) => {
      const m = stop.color.match(/rgba?\(([^)]+)\)/);
      if (!m) {
        conic.addColorStop(stop.offset, stop.color);
        return;
      }
      const parts = m[1].split(",").map((s) => parseFloat(s));
      const [r, g, b, a = 1] = parts;
      conic.addColorStop(stop.offset, `rgba(${r},${g},${b},${(a * k * breathe * vis).toFixed(3)})`);
    });
    ctx.strokeStyle = conic;
  } else {
    ctx.strokeStyle = style.rimStops[0].color;
  }
  ctx.stroke();

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const tintPositions = [
    { dx: 0.22, dy: 0.24, r: 0.55 },
    { dx: -0.3, dy: 0.18, r: 0.4 },
    { dx: 0.05, dy: -0.15, r: 0.45 },
    { dx: -0.1, dy: 0.35, r: 0.35 },
  ];
  style.hazeTints.forEach((color, i) => {
    const pos = tintPositions[i % tintPositions.length];
    const phase = seed * (i + 1.7);
    const shimmer = 0.6 + 0.4 * Math.sin(timeSec * 0.18 + phase);
    const cx = centerX + radius * pos.dx;
    const cy = centerY + radius * pos.dy;
    const isWhite = color === "255,255,255";
    const baseAlpha = isWhite ? 0.045 : 0.065; // let the color tints read a bit stronger than the plain haze
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(2, radius * pos.r));
    g.addColorStop(0, `rgba(${color},${(baseAlpha * k * shimmer).toFixed(3)})`);
    g.addColorStop(1, `rgba(${color},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(2, radius * pos.r), 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();

  // Layered highlights: broad soft glow, a smaller soft reflection, tiny
  // sharp specular dots, and a faint colored tint — never one opaque blob.
  for (const h of style.highlights) {
    const cx = centerX + radius * h.dx;
    const cy = centerY + radius * h.dy;
    const isWhite = h.color === "255,255,255";
    const alpha = Math.min(1, h.alpha * (isWhite ? vis : 1));
    if (h.kind === "soft") {
      drawSoftBlob(ctx, cx, cy, Math.max(1, radius * h.rx), Math.max(1, radius * h.ry), h.rot, h.color, alpha);
    } else {
      ctx.beginPath();
      ctx.ellipse(cx, cy, Math.max(0.4, radius * h.rx), Math.max(0.35, radius * h.ry), h.rot, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${h.color},${alpha})`;
      ctx.fill();
    }
  }
}

/** Decaying squash/stretch bounce right after detaching ("뽀용"), settling to round. */
function settleEnvelope(bubble: BubbleInstance, nowMs: number): number {
  const elapsed = nowMs - bubble.detachedAt;
  if (elapsed < 0 || elapsed > tuning.settleDuration) return 0;
  const decay = Math.exp(-elapsed / (tuning.settleDuration / 3));
  return tuning.settleAmplitude * decay * Math.cos((elapsed / 1000) * tuning.settleFrequency);
}

/**
 * The attached bubble bulges in place at the center of the ring as it
 * grows — never a perfect mathematical circle, a very subtle (1-3%)
 * breathing jitter on width/height keeps it feeling like a living film.
 */
export function drawAttachedBubble(
  ctx: CanvasRenderingContext2D,
  style: BubbleStyle,
  bubble: BubbleInstance,
  timeSec: number,
  visibilityBoost = 0
) {
  const liveWobble =
    Math.sin(timeSec * tuning.wobbleSpeed * 0.85 + bubble.wobbleSeed * 1.6) * 0.6 +
    Math.sin(timeSec * tuning.wobbleSpeed * 1.3 + bubble.wobbleSeed) * 0.4;
  const scaleX = 1 + liveWobble * tuning.wobbleAmountAttached;
  const scaleY = 1 - liveWobble * tuning.wobbleAmountAttached * 0.75;

  ctx.save();
  ctx.translate(bubble.x, bubble.y);
  ctx.scale(scaleX, scaleY);
  ctx.beginPath();
  ctx.arc(0, 0, bubble.radius, 0, Math.PI * 2);
  paintPath(ctx, style, 0, 0, bubble.radius, bubble.wobbleSeed, timeSec, visibilityBoost);
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
