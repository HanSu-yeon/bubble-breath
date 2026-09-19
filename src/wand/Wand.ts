// Wand rendering is data-driven so a future style picker can swap the ring
// look without touching the draw call sites.
export interface WandStyle {
  ringRadius: number;
  ringThickness: number;
  toothCount: number;
  toothLength: number;
  color: string;
  colorLight: string;
  colorShadow: string;
  handleLength: number;
  handleWidth: number;
}

export const defaultWandStyle: WandStyle = {
  ringRadius: 62,
  ringThickness: 15,
  toothCount: 26,
  toothLength: 6,
  color: "#e9e4da",
  colorLight: "#ffffff",
  colorShadow: "#bdb6aa",
  handleLength: 34,
  handleWidth: 18,
};

/**
 * Draws the wand ring facing the camera (always a true circle, never
 * skewed into an ellipse), with a short handle stub running off the
 * bottom edge of the screen.
 */
export function drawWand(
  ctx: CanvasRenderingContext2D,
  style: WandStyle,
  cx: number,
  cy: number,
  scale: number
) {
  const ringRadius = style.ringRadius * scale;
  const ringThickness = style.ringThickness * scale;
  const toothLength = style.toothLength * scale;
  const handleWidth = style.handleWidth * scale;
  const handleLength = style.handleLength * scale;

  ctx.save();

  // Handle stub: attaches at the bottom of the ring and runs off the
  // bottom edge of the screen, so only a short connector is ever visible.
  const hw = handleWidth / 2;
  const handleTopY = cy + ringRadius * 0.5;
  ctx.fillStyle = style.colorShadow;
  ctx.beginPath();
  ctx.moveTo(cx - hw, handleTopY);
  ctx.lineTo(cx - hw * 0.7, handleTopY + handleLength);
  ctx.lineTo(cx + hw * 0.7, handleTopY + handleLength);
  ctx.lineTo(cx + hw, handleTopY);
  ctx.closePath();
  ctx.fill();

  // Gear-style teeth around the outer edge of the ring.
  const outer = ringRadius + ringThickness / 2;
  ctx.fillStyle = style.color;
  for (let i = 0; i < style.toothCount; i++) {
    const angle = (i / style.toothCount) * Math.PI * 2;
    const tx = cx + Math.cos(angle) * outer;
    const ty = cy + Math.sin(angle) * outer;
    ctx.beginPath();
    ctx.arc(tx, ty, toothLength, 0, Math.PI * 2);
    ctx.fill();
  }

  // Main ring torus, always a perfect circle (equal radii, no perspective skew).
  const gradient = ctx.createLinearGradient(
    cx - ringRadius,
    cy - ringRadius,
    cx + ringRadius,
    cy + ringRadius
  );
  gradient.addColorStop(0, style.colorLight);
  gradient.addColorStop(0.55, style.color);
  gradient.addColorStop(1, style.colorShadow);

  ctx.lineWidth = ringThickness;
  ctx.strokeStyle = gradient;
  ctx.beginPath();
  ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
  ctx.stroke();

  // Faint inner rim shadow for depth.
  ctx.lineWidth = Math.max(1, 2 * scale);
  ctx.strokeStyle = "rgba(0,0,0,0.18)";
  ctx.beginPath();
  ctx.arc(cx, cy, ringRadius - ringThickness / 2 + 1 * scale, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}
