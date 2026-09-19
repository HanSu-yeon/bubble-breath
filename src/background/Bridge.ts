import { droneSchedule } from "./droneSchedule";
import { fountainSchedule } from "./fountainSchedule";
import type { SkyState } from "./skyTime";

// A shared perspective projection keeps the train, steelwork, and nozzles
// on the same bridge. Equal world-space intervals compress in the distance.
function project(t: number, w: number, h: number) {
  const depth = 0.2 + 0.8 * t;
  const distance = (0.2 * t + 0.4 * t * t) / 0.6;
  return { x: w * (0.23 + distance * 0.87), y: h * (0.735 + distance * 0.048), depth };
}
const tint = (t: number, alpha: number) => `hsla(${285 - t * 245},78%,76%,${alpha})`;

function truss(ctx: CanvasRenderingContext2D, w: number, h: number, night: number) {
  const unit = Math.min(w, h);
  ctx.save();
  for (let span = 0; span < 8; span++) {
    const a = project(span / 8, w, h);
    const b = project((span + 1) / 8, w, h);
    const top = (f: number) => {
      const p = project((span + f) / 8, w, h);
      return { ...p, y: p.y - unit * 0.044 * p.depth * (f === 0 || f === 1 ? 0.08 : 1) };
    };
    const left = top(0.25);
    const right = top(0.75);
    ctx.strokeStyle = `rgba(215,193,147,${0.22 + night * 0.3 + a.depth * 0.1})`;
    ctx.lineWidth = Math.max(0.6, unit * 0.0015 * a.depth);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(left.x, left.y);
    ctx.lineTo(right.x, right.y);
    ctx.lineTo(b.x, b.y);
    for (let i = 1; i < 4; i++) {
      const p = top(i / 4);
      const bottom = project((span + i / 4) / 8, w, h);
      const next = top((i + 1) / 4);
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(bottom.x, bottom.y);
      ctx.lineTo(next.x, next.y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

export function drawBridge(ctx: CanvasRenderingContext2D, w: number, h: number, sky: SkyState) {
  const unit = Math.min(w, h);
  const night = sky.starOpacity;
  ctx.save();
  for (let i = 0; i <= 8; i++) {
    const p = project(i / 8, w, h);
    const pw = unit * 0.017 * p.depth;
    const bottom = p.y + h * 0.063 * p.depth;
    const gradient = ctx.createLinearGradient(p.x, 0, p.x + pw, 0);
    gradient.addColorStop(0, "#343748");
    gradient.addColorStop(0.3, `rgba(188,157,113,${0.2 + night * 0.45})`);
    gradient.addColorStop(1, "#343748");
    ctx.fillStyle = gradient;
    ctx.fillRect(p.x, p.y, pw, bottom - p.y);
    ctx.fillStyle = "#414252";
    ctx.fillRect(p.x - pw * 0.35, p.y, pw * 1.7, Math.max(1, pw * 0.25));
  }
  const far = project(0, w, h);
  const near = project(1, w, h);
  ctx.fillStyle = "#303446";
  ctx.beginPath();
  ctx.moveTo(far.x, far.y);
  ctx.lineTo(near.x, near.y);
  ctx.lineTo(near.x, near.y + h * 0.012);
  ctx.lineTo(far.x, far.y + h * 0.0024);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = `rgba(169,190,226,${0.16 + night * 0.35})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(far.x, far.y);
  ctx.lineTo(near.x, near.y);
  ctx.stroke();
  truss(ctx, w, h, night);
  for (let i = 0; i < 60; i++) {
    const p = project(i / 59, w, h);
    ctx.fillStyle = `rgba(146,180,237,${night * 0.5})`;
    ctx.fillRect(p.x, p.y + h * 0.005 * p.depth, Math.max(0.7, p.depth * 2), Math.max(0.6, p.depth * 2));
  }
  ctx.restore();
}

function train(ctx: CanvasRenderingContext2D, w: number, h: number, phase: number, sky: SkyState, reverse: boolean) {
  const unit = Math.min(w, h);
  const progress = (phase - 3) / 14 * 1.3;
  const head = reverse ? 1.08 - progress : progress;
  for (let car = 0; car < 5; car++) {
    const t = head + (reverse ? 1 : -1) * car * 0.045;
    if (t <= 0 || t >= 1.08) continue;
    const a = project(Math.max(0, t - 0.04), w, h);
    const b = project(t, w, h);
    const carHeight = unit * 0.024 * a.depth;
    const carWidth = Math.hypot(b.x - a.x, b.y - a.y);
    ctx.save();
    ctx.globalAlpha = Math.min(1, t / 0.035);
    ctx.translate(a.x, a.y - carHeight - 1);
    ctx.rotate(Math.atan2(b.y - a.y, b.x - a.x));
    ctx.fillStyle = "#a1aebc";
    ctx.beginPath();
    ctx.roundRect(0, 0, carWidth, carHeight, Math.min(2, carHeight * 0.2));
    ctx.fill();
    ctx.fillStyle = "#648b9e";
    ctx.fillRect(0, carHeight * 0.7, carWidth, Math.max(0.7, carHeight * 0.15));
    ctx.fillStyle = `rgba(255,226,168,${0.45 + sky.starOpacity * 0.5})`;
    for (let window = 0; window < 5; window++) {
      ctx.fillRect(carWidth * (0.08 + window * 0.18), carHeight * 0.2, carWidth * 0.11, carHeight * 0.36);
    }
    ctx.restore();
  }
  truss(ctx, w, h, sky.starOpacity);
}

/** Trains pass periodically; fountains follow the local evening schedule. */
export function drawBridgeLife(ctx: CanvasRenderingContext2D, w: number, h: number, time: number, sky: SkyState, hour: number) {
  const phase = time % 48;
  const unit = Math.min(w, h);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, h * 0.67, w, h * 0.181);
  ctx.clip();
  const show = fountainSchedule(hour);
  if (!droneSchedule(hour).active && phase >= 3 && phase < 17) train(ctx, w, h, phase, sky, Math.floor(time / 48) % 2 === 0);
  const fade = show.fade;
  const strength = fade * (0.65 + sky.starOpacity * 0.35);
  if (strength > 0) {
    ctx.lineCap = "round";
    // Many overlapping thin streams form a continuous curtain. Their spacing,
    // reach, thickness, and fall all follow the same depth projection.
    const jets = Math.min(180, Math.max(96, Math.ceil(w / 9)));
    for (let jet = 0; jet < jets; jet++) {
      const t = jet / (jets - 1);
      const p = project(t, w, h);
      const y = p.y + h * 0.009 * p.depth;
      const wave = 0.94 + Math.sin(time * 0.75 + t * 7) * 0.06;
      const reach = unit * 0.13 * p.depth * fade * wave;
      const endX = p.x - reach;
      const endY = y + h * 0.058 * p.depth;
      ctx.beginPath();
      ctx.moveTo(p.x, y);
      ctx.bezierCurveTo(p.x - reach * 0.48, y - unit * 0.07 * p.depth * fade,
        endX, y - unit * 0.045 * p.depth * fade, endX, endY);
      ctx.strokeStyle = tint(t, strength * 0.055);
      ctx.lineWidth = Math.max(2, unit * 0.014 * p.depth);
      ctx.stroke();
      ctx.strokeStyle = tint(t, strength * (0.24 + Math.sin(jet * 2.4 + time) * 0.06));
      ctx.lineWidth = Math.max(0.45, unit * 0.001 * p.depth);
      ctx.stroke();
      if (jet % 3 === 0) {
        // Soft overlapping spray where the curtain meets the river.
        const mist = ctx.createRadialGradient(endX, endY, 0, endX, endY, Math.max(1, unit * 0.025 * p.depth));
        mist.addColorStop(0, tint(t, strength * 0.09));
        mist.addColorStop(1, tint(t, 0));
        ctx.fillStyle = mist;
        ctx.save();
        ctx.translate(endX, endY);
        ctx.scale(1, 0.35);
        ctx.translate(-endX, -endY);
        ctx.fillRect(endX - unit * 0.03, endY - unit * 0.03, unit * 0.06, unit * 0.06);
        ctx.restore();
        for (let ripple = 0; ripple < 3; ripple++) {
          ctx.fillStyle = tint(t, strength * (0.11 - ripple * 0.025));
          ctx.beginPath();
          ctx.ellipse(endX + Math.sin(time + jet + ripple) * p.depth * 2,
            endY + ripple * 3 * p.depth, unit * 0.018 * p.depth, 0.6, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
  ctx.restore();
}
