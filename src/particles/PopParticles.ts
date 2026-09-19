export interface PopParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  r: number;
  g: number;
  b: number;
}

const COLORS = [
  { r: 255, g: 255, b: 255 },
  { r: 200, g: 230, b: 255 },
  { r: 255, g: 214, b: 240 },
];

export function spawnPopParticles(x: number, y: number, count: number): PopParticle[] {
  const particles: PopParticle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 50 + Math.random() * 110;
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 30,
      life: 0,
      maxLife: 260 + Math.random() * 160,
      size: 1.5 + Math.random() * 2.5,
      r: color.r,
      g: color.g,
      b: color.b,
    });
  }
  return particles;
}

export function updateParticles(particles: PopParticle[], dtMs: number): PopParticle[] {
  const dt = dtMs / 1000;
  const next: PopParticle[] = [];
  for (const p of particles) {
    p.life += dtMs;
    if (p.life >= p.maxLife) continue;
    p.vy += 220 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    next.push(p);
  }
  return next;
}

export function drawParticles(ctx: CanvasRenderingContext2D, particles: PopParticle[]) {
  for (const p of particles) {
    const alpha = Math.max(0, 1 - p.life / p.maxLife);
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${alpha.toFixed(3)})`;
    ctx.fill();
  }
}
