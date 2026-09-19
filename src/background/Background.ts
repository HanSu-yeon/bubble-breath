import { computeSkyState, currentHour, type SkyState } from "./skyTime";

// A simple, cute office-rooftop backdrop — not a realistic photo. The sky
// takes ~76% of the screen, the rooftop the rest. Kept deliberately sparse:
// a low railing, a distant simplified city silhouette, one rooftop
// structure, and a few slow clouds. The bubble stays the main character.

function hash01(n: number): number {
  const s = Math.sin(n * 12.9898) * 43758.5453;
  return s - Math.floor(s);
}

interface Building {
  xRatio: number;
  widthRatio: number;
  heightRatio: number;
  cols: number;
  rows: number;
}

// Fixed, hand-picked silhouette — varied but tidy, never a busy skyline.
const BUILDINGS: Building[] = [
  { xRatio: 0.02, widthRatio: 0.1, heightRatio: 0.55, cols: 3, rows: 4 },
  { xRatio: 0.13, widthRatio: 0.07, heightRatio: 0.35, cols: 2, rows: 3 },
  { xRatio: 0.22, widthRatio: 0.13, heightRatio: 0.75, cols: 4, rows: 6 },
  { xRatio: 0.37, widthRatio: 0.08, heightRatio: 0.45, cols: 2, rows: 4 },
  { xRatio: 0.47, widthRatio: 0.11, heightRatio: 0.62, cols: 3, rows: 5 },
  { xRatio: 0.6, widthRatio: 0.07, heightRatio: 0.4, cols: 2, rows: 3 },
  { xRatio: 0.69, widthRatio: 0.14, heightRatio: 0.8, cols: 4, rows: 6 },
  { xRatio: 0.85, widthRatio: 0.09, heightRatio: 0.5, cols: 3, rows: 4 },
];

const STARS = Array.from({ length: 18 }, (_, i) => ({
  xRatio: hash01(i * 3.1),
  yRatio: hash01(i * 7.7) * 0.55,
  size: 0.6 + hash01(i * 11.3) * 1.1,
  seed: hash01(i * 5.9) * 100,
}));

const CLOUDS = [
  { yRatio: 0.14, scale: 1, speed: 1.1, offset: 0 },
  { yRatio: 0.24, scale: 0.75, speed: 0.8, offset: 260 },
  { yRatio: 0.1, scale: 0.6, speed: 1.4, offset: 520 },
  { yRatio: 0.3, scale: 0.85, speed: 0.9, offset: 100 },
];

function mixColor(a: [number, number, number], b: [number, number, number], t: number): string {
  const r = a[0] + (b[0] - a[0]) * t;
  const g = a[1] + (b[1] - a[1]) * t;
  const bl = a[2] + (b[2] - a[2]) * t;
  return `rgb(${r.toFixed(0)},${g.toFixed(0)},${bl.toFixed(0)})`;
}

function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, alpha: number) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#ffffff";
  const puffs: [number, number, number][] = [
    [0, 0, 22],
    [26, 4, 16],
    [-24, 5, 15],
    [12, -8, 14],
  ];
  for (const [dx, dy, r] of puffs) {
    ctx.beginPath();
    ctx.arc(x + dx * scale, y + dy * scale, r * scale, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timeSec: number
): SkyState {
  const sky = computeSkyState(currentHour());
  const skyHeight = height * 0.76;

  // Sky gradient.
  const g = ctx.createLinearGradient(0, 0, 0, skyHeight);
  g.addColorStop(0, mixColor(sky.topColor, sky.topColor, 0));
  g.addColorStop(1, mixColor(sky.bottomColor, sky.bottomColor, 0));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, skyHeight);

  // Stars (night only, very few, subtle twinkle).
  if (sky.starOpacity > 0.01) {
    ctx.save();
    for (const s of STARS) {
      const twinkle = 0.7 + 0.3 * Math.sin(timeSec * 0.6 + s.seed);
      ctx.globalAlpha = sky.starOpacity * twinkle;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(s.xRatio * width, s.yRatio * skyHeight, s.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Clouds: simple, soft, drifting almost imperceptibly slowly.
  if (sky.cloudOpacity > 0.01) {
    for (const c of CLOUDS) {
      const cloudWidth = 90 * c.scale;
      const x = (((timeSec * c.speed + c.offset) % (width + cloudWidth * 2)) - cloudWidth) * 1;
      drawCloud(ctx, x, c.yRatio * skyHeight, c.scale, sky.cloudOpacity);
    }
  }

  // Distant city silhouette, sitting right at the rooftop horizon.
  const silhouetteColor = mixColor(sky.bottomColor, [8, 8, 14], sky.citySilhouetteDarkness);
  for (let bi = 0; bi < BUILDINGS.length; bi++) {
    const b = BUILDINGS[bi];
    const bw = b.widthRatio * width;
    const bh = b.heightRatio * skyHeight * 0.42;
    const bx = b.xRatio * width;
    const by = skyHeight - bh;
    ctx.fillStyle = silhouetteColor;
    ctx.fillRect(bx, by, bw, bh);

    if (sky.lightChance > 0.02) {
      const padX = bw * 0.14;
      const padY = bh * 0.12;
      const cellW = (bw - padX * 2) / b.cols;
      const cellH = (bh - padY * 2) / b.rows;
      for (let row = 0; row < b.rows; row++) {
        for (let col = 0; col < b.cols; col++) {
          const lit = hash01(bi * 97 + row * 13.1 + col * 3.7) < sky.lightChance;
          if (!lit) continue;
          const wx = bx + padX + col * cellW + cellW * 0.2;
          const wy = by + padY + row * cellH + cellH * 0.2;
          ctx.fillStyle = "rgba(255,214,140,0.85)";
          ctx.fillRect(wx, wy, cellW * 0.6, cellH * 0.6);
        }
      }
    }
  }

  // Rooftop.
  const roofTop = skyHeight;
  ctx.fillStyle = sky.citySilhouetteDarkness > 0.6 ? "#26262c" : "#3c3c44";
  ctx.fillRect(0, roofTop, width, height - roofTop);

  // Low concrete railing along the horizon.
  const railHeight = Math.max(10, height * 0.02);
  ctx.fillStyle = sky.citySilhouetteDarkness > 0.6 ? "#3a3a42" : "#55555e";
  ctx.fillRect(0, roofTop - railHeight, width, railHeight);
  ctx.fillStyle = sky.citySilhouetteDarkness > 0.6 ? "#2f2f36" : "#48484f";
  const postSpacing = width / 9;
  for (let x = postSpacing / 2; x < width; x += postSpacing) {
    ctx.fillRect(x - 1.5, roofTop - railHeight, 3, railHeight);
  }

  // One small rooftop structure (AC unit) off to one side.
  const acW = width * 0.1;
  const acH = height * 0.045;
  const acX = width * 0.74;
  const acY = roofTop - railHeight - acH + 2;
  ctx.fillStyle = sky.citySilhouetteDarkness > 0.6 ? "#37373f" : "#4a4a52";
  ctx.fillRect(acX, acY, acW, acH);
  ctx.strokeStyle = sky.citySilhouetteDarkness > 0.6 ? "#26262c" : "#3a3a42";
  ctx.lineWidth = Math.max(1, acW * 0.03);
  for (let i = 1; i < 4; i++) {
    const lx = acX + (acW * i) / 4;
    ctx.beginPath();
    ctx.moveTo(lx, acY + acH * 0.15);
    ctx.lineTo(lx, acY + acH * 0.85);
    ctx.stroke();
  }

  return sky;
}
