import { drawDroneShow } from "./DroneShow";
import { drawBridge, drawBridgeLife } from "./Bridge";
import { computeSkyState, currentHour, type SkyState } from "./skyTime";

type Color = [number, number, number];
const TAU = Math.PI * 2;
const hash = (n: number) => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
const mix = (a: Color, b: Color, t: number) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(",")})`;

// Cache the scenery; water, clouds, and bridge activity animate separately.
let scenery: HTMLCanvasElement | null = null;
let sceneryKey = "";

function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, "rgba(255,220,175,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

function city(ctx: CanvasRenderingContext2D, w: number, h: number, sky: SkyState) {
  const horizon = h * 0.735;
  const unit = Math.min(w, h * 0.95);
  for (let layer = 0; layer < 3; layer++) {
    const count = Math.ceil(w / (unit * 0.065));
    for (let i = -1; i < count; i++) {
      const seed = i + 90 + layer * 81;
      const bw = unit * (0.043 + hash(seed) * 0.04);
      const bh = unit * (0.055 + hash(seed + 9) * (0.13 + layer * 0.055));
      const x = i * unit * 0.065;
      const y = horizon - bh - (2 - layer) * h * 0.008;
      const depth = 0.18 + layer * 0.2 + sky.citySilhouetteDarkness * 0.2;
      ctx.fillStyle = mix(sky.bottomColor, [22, 25, 43], depth);
      ctx.beginPath();
      ctx.roundRect(x, y, bw, horizon - y, [2, 2, 0, 0]);
      ctx.fill();
      if (hash(seed + 12) > 0.6) {
        ctx.fillRect(x + bw * 0.3, y - unit * 0.018, bw * 0.4, unit * 0.02);
      }
      if (layer === 0) continue;
      const cols = Math.max(2, Math.floor(bw / (unit * 0.014)));
      const rows = Math.floor(bh / (unit * 0.021));
      for (let row = 1; row < rows; row++) {
        for (let col = 1; col < cols; col++) {
          const lit = hash(seed * 13 + row * 7 + col * 19);
          const strength = Math.max(0, Math.min(1, (sky.lightChance - lit) * 7));
          ctx.fillStyle = strength > 0
            ? `rgba(255,218,153,${strength * (layer === 2 ? 0.8 : 0.4)})`
            : `rgba(185,207,219,${sky.brightness * 0.12})`;
          ctx.fillRect(x + col * bw / cols, y + row * unit * 0.021, unit * 0.005, unit * 0.011);
        }
      }
    }
  }
}

function paintScenery(ctx: CanvasRenderingContext2D, w: number, h: number, sky: SkyState) {
  const unit = Math.min(w, h);
  const night = sky.starOpacity;
  const gradient = ctx.createLinearGradient(0, 0, 0, h * 0.8);
  gradient.addColorStop(0, mix(sky.topColor, sky.topColor, 0));
  gradient.addColorStop(0.55, mix(sky.topColor, sky.bottomColor, 0.48));
  gradient.addColorStop(1, mix(sky.bottomColor, sky.bottomColor, 0));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  // A restrained halo and a warm sun / moon, clear of the central bubble.
  const orbX = w * 0.84;
  const orbY = h * (0.2 + (1 - night) * 0.045);
  const orbR = unit * 0.033;
  glow(ctx, orbX, orbY, orbR * 5, `rgba(255,218,170,${0.13 + night * 0.08})`);
  const orb = ctx.createLinearGradient(orbX, orbY - orbR, orbX, orbY + orbR);
  orb.addColorStop(0, "#fff1cb");
  orb.addColorStop(1, night > 0.3 ? "#e9cb9a" : "#ffd9a3");
  ctx.fillStyle = orb;
  ctx.beginPath();
  ctx.arc(orbX, orbY, orbR, 0, TAU);
  ctx.fill();

  // Hazy hills give the distant buildings a softer edge.
  for (let layer = 0; layer < 2; layer++) {
    ctx.fillStyle = mix(sky.bottomColor, sky.topColor, 0.23 + layer * 0.13);
    ctx.beginPath();
    ctx.moveTo(0, h * 0.74);
    for (let i = 0; i <= 12; i++) {
      const x = w * i / 12;
      const y = h * (0.67 - hash(i + layer * 31) * 0.035 + layer * 0.025);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h * 0.76);
    ctx.closePath();
    ctx.fill();
  }
  city(ctx, w, h, sky);

  const water = ctx.createLinearGradient(0, h * 0.735, 0, h * 0.93);
  water.addColorStop(0, mix(sky.bottomColor, [39, 55, 75], 0.3 + night * 0.28));
  water.addColorStop(1, mix(sky.topColor, [25, 30, 47], 0.45));
  ctx.fillStyle = water;
  ctx.fillRect(0, h * 0.735, w, h * 0.22);

  drawBridge(ctx, w, h, sky);

  // Foreground terrace: quiet architectural lines, no clutter in the center.
  const floor = ctx.createLinearGradient(0, h * 0.91, 0, h);
  floor.addColorStop(0, mix(sky.bottomColor, [41, 43, 56], 0.65));
  floor.addColorStop(1, mix(sky.topColor, [28, 31, 44], 0.65));
  ctx.fillStyle = floor;
  ctx.fillRect(0, h * 0.915, w, h * 0.085);
  ctx.strokeStyle = `rgba(190,185,192,${0.06 + sky.brightness * 0.07})`;
  ctx.lineWidth = 1;
  for (let i = -2; i < 8; i++) {
    ctx.beginPath();
    ctx.moveTo(w * 0.5 + (i - 2.5) * w * 0.09, h * 0.915);
    ctx.lineTo(w * 0.5 + (i - 2.5) * w * 0.22, h);
    ctx.stroke();
  }
  ctx.fillStyle = mix(sky.bottomColor, [21, 25, 36], 0.85);
  for (let i = 0; i < 6; i++) ctx.fillRect(w * (0.06 + i * 0.19), h * 0.858, unit * 0.009, h * 0.065);
  ctx.fillRect(0, h * 0.853, w, Math.max(5, h * 0.012));
  ctx.fillStyle = mix(sky.bottomColor, [105, 103, 119], 0.6);
  ctx.fillRect(0, h * 0.853, w, Math.max(1, h * 0.002));
}

// A tiny wave glyph for the fountain column: one flat 1px stroke, no fill.
function fountainIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - r * 0.55);
  ctx.lineTo(cx, cy + r * 0.05);
  ctx.moveTo(cx - r * 0.35, cy - r * 0.2);
  ctx.lineTo(cx, cy - r * 0.55);
  ctx.lineTo(cx + r * 0.35, cy - r * 0.2);
  ctx.moveTo(cx - r * 0.65, cy + r * 0.35);
  ctx.bezierCurveTo(cx - r * 0.3, cy + r * 0.1, cx + r * 0.3, cy + r * 0.6, cx + r * 0.65, cy + r * 0.35);
  ctx.stroke();
}
// A quadcopter-from-above glyph for the drone column: a cross with four rotor rings.
function droneIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.5, cy - r * 0.5); ctx.lineTo(cx + r * 0.5, cy + r * 0.5);
  ctx.moveTo(cx + r * 0.5, cy - r * 0.5); ctx.lineTo(cx - r * 0.5, cy + r * 0.5);
  ctx.stroke();
  for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    ctx.beginPath();
    ctx.arc(cx + dx * r * 0.5, cy + dy * r * 0.5, r * 0.22, 0, Math.PI * 2);
    ctx.stroke();
  }
}

const GOTHIC = '"Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
// Shrinks the font until `text` fits `maxWidth`, so the sign never overflows its own columns.
function fitFont(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, weight: number, startPx: number, minPx: number, family = GOTHIC) {
  let size = startPx;
  ctx.font = `${weight} ${size}px ${family}`;
  while (size > minPx && ctx.measureText(text).width > maxWidth) {
    size -= 0.5;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

/** A small, narrow park signboard: a flat metal panel, the same graphic language as the skyline behind it. */
function drawNoticeboard(ctx: CanvasRenderingContext2D, w: number, h: number, sky: SkyState) {
  const boardW = Math.min(58, w * 0.1, h * 0.075);
  const boardH = boardW * 1.55;
  const legH = boardH * 0.22;
  const x = w - boardW - Math.max(12, w * 0.025);
  const y = Math.min(h * 0.83, h - boardH - legH - 8);
  ctx.save();

  // Short, thin steel legs plant the panel back on the terrace.
  const legColor = mix(sky.bottomColor, [20, 22, 34], 0.86);
  ctx.fillStyle = legColor;
  for (const ratio of [0.16, 0.84]) {
    ctx.fillRect(x + boardW * ratio - 1, y + boardH - 1, 2, legH);
  }

  // Flat charcoal-navy panel, the same family of color as the building faces.
  const panelColor = mix(sky.bottomColor, [27, 29, 47], 0.8);
  const borderColor = mix(sky.bottomColor, [150, 148, 188], 0.35);
  const radius = Math.max(1, boardW * 0.012);
  ctx.fillStyle = panelColor;
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x + 0.5, y + 0.5, boardW - 1, boardH - 1, radius);
  ctx.fill();
  ctx.stroke();

  const cream = "rgba(246,226,184,0.75)";
  const creamDim = "rgba(246,226,184,0.4)";
  const textX = x + boardW * 0.14;
  const textPad = boardW * 0.78;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  ctx.fillStyle = cream;
  fitFont(ctx, "별빛공원", textPad, 600, boardH * 0.115, boardH * 0.07);
  ctx.fillText("별빛공원", textX, y + boardH * 0.115);
  ctx.fillStyle = creamDim;
  fitFont(ctx, "NIGHT PARK", textPad, 500, boardH * 0.05, boardH * 0.03, "-apple-system, BlinkMacSystemFont, sans-serif");
  ctx.fillText("NIGHT PARK", textX, y + boardH * 0.185);

  ctx.strokeStyle = mix(sky.bottomColor, [110, 108, 145], 0.3);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + boardW * 0.1, y + boardH * 0.245);
  ctx.lineTo(x + boardW * 0.9, y + boardH * 0.245);
  ctx.stroke();

  ctx.strokeStyle = cream;
  ctx.lineWidth = 1;
  for (const [icon, label, value, rowY] of [
    [fountainIcon, "무지개 분수", "18:00 — 04:00", 0.4],
    [droneIcon, "별빛 드론쇼", "매시 35분", 0.68],
  ] as const) {
    const iconCy = y + boardH * rowY;
    icon(ctx, x + boardW * 0.15, iconCy, boardH * 0.045);
    ctx.fillStyle = cream;
    fitFont(ctx, label, textPad - boardW * 0.16, 500, boardH * 0.075, boardH * 0.045);
    ctx.fillText(label, x + boardW * 0.26, iconCy);
    ctx.fillStyle = creamDim;
    fitFont(ctx, value, textPad, 400, boardH * 0.055, boardH * 0.035);
    ctx.fillText(value, textX, y + boardH * (rowY + 0.11));
  }
  ctx.restore();
}

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timeSec: number,
  hour = currentHour()
): SkyState {
  const sky = computeSkyState(hour);
  const dpr = Math.min(2, ctx.getTransform().a || 1);
  // Ten-second color steps are imperceptible, while avoiding per-frame city redraws.
  const key = `${width}:${height}:${dpr}:${Math.floor(hour * 360)}`;
  if (!scenery) scenery = document.createElement("canvas");
  if (key !== sceneryKey) {
    scenery.width = Math.round(width * dpr);
    scenery.height = Math.round(height * dpr);
    const cached = scenery.getContext("2d")!;
    cached.setTransform(dpr, 0, 0, dpr, 0, 0);
    paintScenery(cached, width, height, sky);
    sceneryKey = key;
  }
  ctx.drawImage(scenery, 0, 0, width, height);
  ctx.save();
  // Warm, sparse stars leave plenty of breathing room.
  for (let i = 0; i < 27; i++) {
    ctx.globalAlpha = sky.starOpacity * (0.5 + Math.sin(timeSec * 0.5 + i) * 0.22);
    ctx.fillStyle = "#ffe6bd";
    ctx.beginPath();
    ctx.arc(hash(i + 1) * width, (0.045 + hash(i + 60) * 0.49) * height,
      0.45 + hash(i + 100) * 0.7, 0, TAU);
    ctx.fill();
  }
  // Long, translucent wisps move slowly across the upper sky.
  ctx.globalAlpha = sky.cloudOpacity;
  for (let i = 0; i < 4; i++) {
    const span = width * 0.3;
    const x = ((hash(i + 20) * width + timeSec * (1 + i * 0.2)) % (width + span * 2)) - span;
    const y = height * (0.12 + i * 0.065);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, 0.1);
    glow(ctx, 0, 0, span, "rgba(255,239,225,0.55)");
    ctx.restore();
  }
  // Broken horizontal reflections, each moving just a little differently.
  ctx.beginPath();
  ctx.rect(0, height * 0.795, width, height * 0.058);
  ctx.clip();
  for (let column = 0; column < 13; column++) {
    for (let row = 0; row < 9; row++) {
      const seed = column * 23 + row;
      const x = width * (column + 0.5) / 13 + Math.sin(timeSec * 0.65 + seed) * 3;
      const y = height * (0.79 + row * 0.008);
      const length = (3 + hash(seed) * 13) * Math.min(width / 390, 2);
      ctx.globalAlpha = (0.04 + sky.lightChance * 0.2) * (1 - row / 12) * (0.7 + Math.sin(timeSec + seed) * 0.3);
      ctx.fillStyle = column % 3 === 0 ? "#e5e0f4" : "#ffd69d";
      ctx.beginPath();
      ctx.ellipse(x, y, length, 1 + hash(seed + 8), 0, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
  drawBridgeLife(ctx, width, height, timeSec, sky, hour);
  drawDroneShow(ctx, width, height, hour);
  drawNoticeboard(ctx, width, height, sky);
  return sky;
}
