import { droneThemeIndex, DRONE_SCENE_SECONDS, DRONE_FINALE_HOLD_SECONDS } from "./droneThemes";
import { droneSchedule } from "./droneSchedule";

type Dot = { x: number; y: number; color: number; group?: number };
const COUNT = 420;
const COLORS = ["#d6ffeb", "#b8caff", "#ffd49e", "#ffc4e5", "#b4f7f4", "#ffffff"];
const hash = (i: number) => { const n = Math.sin(i * 127.1 + 91.7) * 43758.5453; return n - Math.floor(n); };
const ease = (t: number) => { const v = Math.max(0, Math.min(1, t)); return v * v * (3 - 2 * v); };

function circle(dots: Dot[], x: number, y: number, rx: number, ry: number, color: number, count = 60) {
  for (let i = 0; i < count; i++) {
    const a = i / count * Math.PI * 2;
    dots.push({ x: x + Math.cos(a) * rx, y: y + Math.sin(a) * ry, color });
  }
}
function line(dots: Dot[], points: number[][], color: number) {
  for (let i = 1; i < points.length; i++) {
    const [x, y] = points[i - 1];
    const [endX, endY] = points[i];
    const steps = Math.max(2, Math.ceil(Math.hypot(endX - x, endY - y) * 180));
    for (let step = 0; step < steps; step++) dots.push({ x: x + (endX - x) * step / steps, y: y + (endY - y) * step / steps, color });
  }
}
function mascot(stage: "work" | "relaxed" | "blowing") {
  const blowing = stage === "blowing";
  const working = stage === "work";
  const dots: Dot[] = [];
  // A little office worker loosens their tie before taking a bubble break.
  circle(dots, -0.1, -0.12, 0.14, 0.125, 0, 90);
  circle(dots, -0.18, -0.3, 0.033, 0.09, 0, 36);
  circle(dots, -0.065, -0.31, 0.034, 0.095, 0, 36);
  circle(dots, -0.12, 0.12, 0.13, 0.15, 1, 85);
  circle(dots, -0.19, 0.28, 0.052, 0.025, 2, 25);
  circle(dots, -0.04, 0.28, 0.052, 0.025, 2, 25);
  circle(dots, -0.05, -0.15, 0.009, 0.014, 5, 12);
  circle(dots, -0.16, -0.15, 0.009, 0.014, 5, 12);
  circle(dots, 0.035, -0.08, 0.014, blowing ? 0.018 : 0.008, 3, 14);
  if (working) {
    line(dots, [[-0.23, 0.06], [-0.29, 0.14], [-0.29, 0.19]], 0);
    // Briefcase and handle, set down beside the rabbit in the next scene.
    line(dots, [[-0.32, 0.21], [-0.32, 0.18], [-0.27, 0.18], [-0.27, 0.21]], 2);
    line(dots, [[-0.36, 0.21], [-0.23, 0.21], [-0.23, 0.3], [-0.36, 0.3], [-0.36, 0.21]], 2);
  } else {
    // Left hand pulls the loosened knot away from the collar.
    line(dots, [[-0.23, 0.06], [-0.25, 0.115], [-0.155, 0.085]], 0);
    line(dots, [[-0.36, 0.245], [-0.23, 0.245], [-0.23, 0.33], [-0.36, 0.33], [-0.36, 0.245]], 2);
    line(dots, [[-0.32, 0.245], [-0.32, 0.22], [-0.27, 0.22], [-0.27, 0.245]], 2);
  }
  line(dots, [[-0.015, 0.07], [0.1, 0.04], [0.12, -0.025]], 0);
  line(dots, [[0.12, 0.055], [0.12, -0.07]], 2);
  circle(dots, 0.12, -0.11, 0.038, 0.038, 2, 28);
  // White shirt collar and a coral tie make the workday story readable.
  line(dots, [[-0.21, 0], [-0.15, 0.045], [-0.12, 0.012], [-0.08, 0.045], [-0.04, 0]], 5);
  if (working) {
    line(dots, [[-0.12, 0.035], [-0.14, 0.06], [-0.12, 0.085], [-0.1, 0.06], [-0.12, 0.035]], 3);
    line(dots, [[-0.12, 0.085], [-0.145, 0.18], [-0.12, 0.205], [-0.095, 0.18], [-0.12, 0.085]], 3);
  } else {
    line(dots, [[-0.12, 0.035], [-0.155, 0.085], [-0.19, 0.15], [-0.17, 0.18], [-0.145, 0.155], [-0.155, 0.085]], 3);
    line(dots, [[-0.15, 0.04], [-0.12, 0.065], [-0.085, 0.04]], 5);
  }
  if (blowing) {
    circle(dots, 0.235, -0.135, 0.047, 0.047, 4, 35);
    circle(dots, 0.355, -0.23, 0.066, 0.066, 3, 45);
  }
  return dots;
}
function resample(points: Dot[]) {
  return Array.from({ length: COUNT }, (_, i) => ({ ...points[Math.floor(i * points.length / COUNT)] }));
}
function match(source: Dot[], target: Dot[]) {
  const used = new Uint8Array(COUNT);
  return source.map((from) => {
    let best = 0;
    let distance = Infinity;
    for (let i = 0; i < COUNT; i++) {
      if (used[i]) continue;
      const d = (from.x - target[i].x) ** 2 + (from.y - target[i].y) ** 2;
      if (d < distance) { distance = d; best = i; }
    }
    used[best] = 1;
    return target[best];
  });
}
const scattered: Dot[] = Array.from({ length: COUNT }, (_, i) => ({ x: (hash(i) - 0.5) * 0.95, y: (hash(i + 500) - 0.5) * 0.65, color: i % COLORS.length }));
const rabbit = match(scattered, resample(mascot("work")));
const relaxed = match(rabbit, resample(mascot("relaxed")));
const blowing = match(relaxed, resample(mascot("blowing")));
const bubbles: Dot[] = [];
circle(bubbles, -0.22, 0.06, 0.125, 0.125, 4, 140);
circle(bubbles, 0.08, -0.06, 0.16, 0.16, 3, 170);
circle(bubbles, 0.34, -0.23, 0.09, 0.09, 2, 110);
const rings = match(blowing, resample(bubbles));
const stars: Dot[] = [];
for (let star = 0; star < 7; star++) {
  const x = (hash(star + 1000) - 0.5) * 0.8;
  const y = (hash(star + 2000) - 0.5) * 0.5;
  const points = Array.from({ length: 11 }, (_, i) => {
    const a = i * Math.PI / 5 - Math.PI / 2;
    const r = i % 2 ? 0.018 : 0.04;
    return [x + Math.cos(a) * r, y + Math.sin(a) * r];
  });
  line(stars, points, star % COLORS.length);
}
const finale = match(rings, resample(stars));

function duckFamily(inLine: boolean) {
  const dots: Dot[] = [];
  for (let duck = 0; duck < 4; duck++) {
    const local: Dot[] = [];
    const scale = duck === 0 ? 1 : 0.52;
    const x = duck === 0 ? 0.25 : 0.25 - duck * (inLine ? 0.18 : 0.14);
    const y = duck === 0 ? 0 : inLine ? 0.045 : 0.055 + (duck % 2 ? 0.075 : -0.06);
    const color = duck === 0 ? 5 : 2;
    // Rounded body, upright head, short bill and a tucked wing.
    circle(local, 0, 0.04, 0.105, 0.07, color, 62);
    circle(local, 0.06, -0.055, 0.053, 0.052, color, 40);
    line(local, [[0.108, -0.064], [0.151, -0.045], [0.107, -0.032]], 2);
    circle(local, 0.075, -0.067, 0.006, 0.008, 1, 8);
    line(local, [[-0.07, 0.025], [-0.025, 0.063], [0.025, 0.048]], duck === 0 ? 4 : 3);
    line(local, [[-0.09, 0.025], [-0.138, -0.002], [-0.106, 0.06]], color);
    // Two little feet make the line read as a homeward walk.
    line(local, [[-0.035, 0.1], [-0.04, 0.14], [-0.007, 0.14]], 2);
    line(local, [[0.035, 0.1], [0.055, 0.133], [0.08, 0.133]], 2);
    if (duck === 0) {
      // A small work satchel, without a romantic motif.
      line(local, [[-0.065, 0], [-0.03, 0.05], [-0.07, 0.1]], 3);
      line(local, [[-0.095, 0.06], [-0.045, 0.06], [-0.045, 0.11], [-0.095, 0.11], [-0.095, 0.06]], 3);
    }
    for (const dot of local) dots.push({ x: -(x + dot.x * scale), y: y + dot.y * scale, color: dot.color, group: duck });
  }
  return dots;
}
function whale(spray: boolean) {
  const dots: Dot[] = [];
  circle(dots, -0.04, 0.06, 0.26, 0.14, 4, 150);
  line(dots, [[0.19, 0.01], [0.29, -0.01], [0.37, -0.13], [0.38, -0.015],
    [0.46, 0.04], [0.34, 0.065], [0.21, 0.1]], 1);
  line(dots, [[-0.04, 0.12], [0.05, 0.22], [0.09, 0.16]], 1);
  circle(dots, -0.19, 0.025, 0.01, 0.014, 5, 18);
  line(dots, [[-0.27, 0.09], [-0.22, 0.12], [-0.14, 0.11]], 3);
  if (spray) {
    line(dots, [[-0.08, -0.08], [-0.08, -0.22], [-0.14, -0.31], [-0.2, -0.3]], 4);
    line(dots, [[-0.08, -0.12], [-0.03, -0.29], [0.045, -0.3], [0.08, -0.24]], 5);
    for (let i = 0; i < 5; i++) circle(dots, -0.23 + i * 0.085, -0.34 - (i % 2) * 0.055, 0.013, 0.023, i % 2 ? 1 : 4, 18);
  }
  return dots;
}
function moonRabbit(caught: boolean) {
  const dots: Dot[] = [];
  // Two joined arcs outline a crescent, leaving its interior dark.
  const points: number[][] = [];
  for (let i = 0; i <= 60; i++) {
    const a = -Math.PI / 2 - i / 60 * Math.PI;
    points.push([-0.09 + Math.cos(a) * 0.25, Math.sin(a) * 0.3]);
  }
  for (let i = 0; i <= 60; i++) {
    const a = Math.PI / 2 + i / 60 * Math.PI;
    points.push([-0.09 + Math.cos(a) * 0.14, Math.sin(a) * 0.3]);
  }
  line(dots, points, 2);
  circle(dots, -0.05, -0.02, 0.07, 0.065, 5, 48);
  circle(dots, -0.085, -0.12, 0.018, 0.06, 5, 22);
  circle(dots, -0.03, -0.13, 0.017, 0.06, 5, 22);
  circle(dots, -0.065, 0.095, 0.057, 0.075, 0, 40);
  line(dots, [[-0.065, 0.15], [0.015, 0.17], [0.03, 0.2]], 5);
  const starY = caught ? -0.055 : 0.28;
  line(dots, [[-0.015, 0.06], [0.075, 0.02], [0.17, -0.18], [0.26, -0.16], [0.31, -0.08]], 2);
  line(dots, [[0.31, -0.08], [0.31, starY - 0.04]], 1);
  const star = Array.from({length: 11}, (_, i) => {
    const a = i * Math.PI / 5 - Math.PI / 2;
    const r = i % 2 ? 0.025 : 0.055;
    return [0.31 + Math.cos(a) * r, starY + Math.sin(a) * r];
  });
  line(dots, star, 2);
  return dots;
}
function moneyRain() {
  const dots: Dot[] = [];
  for (let bill = 0; bill < 9; bill++) {
    const local: Dot[] = [];
    line(local, [[-0.052,-0.027],[0.052,-0.027],[0.052,0.027],[-0.052,0.027],[-0.052,-0.027]], 0);
    circle(local, 0, 0, 0.016, 0.019, 2, 14);
    line(local, [[-0.038,-0.012],[-0.028,-0.012]], 4);
    line(local, [[0.028,0.012],[0.038,0.012]], 4);
    const angle = (hash(bill + 70) - 0.5) * 0.9;
    const x = (bill % 3 - 1) * 0.25 + (hash(bill + 80) - 0.5) * 0.05;
    const y = (Math.floor(bill / 3) - 1) * 0.18 - 0.1;
    for (const dot of local) dots.push({ ...dot,
      x: x + dot.x * Math.cos(angle) - dot.y * Math.sin(angle),
      y: y + dot.x * Math.sin(angle) + dot.y * Math.cos(angle), group: bill });
  }
  return dots;
}
function theme(first: Dot[], second: Dot[], finish = stars) {
  const start = match(scattered, resample(first));
  const action = match(start, resample(second));
  const ending = match(action, resample(finish));
  return { start, action, ending };
}
function officeMeme(answer: boolean) {
  const dots: Dot[] = [];
  // Center-parted hair, a deadpan face, white collar, and a gold tie.
  line(dots, [[-0.27,0.2],[-0.24,0.05],[-0.13,-0.01],[-0.1,-0.06]], 1);
  line(dots, [[0.27,0.2],[0.24,0.05],[0.13,-0.01],[0.1,-0.06]], 1);
  circle(dots, 0, -0.15, 0.105, 0.135, 2, 100);
  line(dots, [[-0.1,-0.12],[-0.13,-0.24],[-0.1,-0.32],[-0.025,-0.35],[0,-0.32],
    [0.04,-0.35],[0.11,-0.3],[0.13,-0.2],[0.105,-0.12]], 5);
  line(dots, [[0,-0.32],[-0.045,-0.27],[-0.1,-0.24]], 1);
  line(dots, [[0,-0.32],[0.04,-0.27],[0.1,-0.22]], 1);
  line(dots, [[-0.078,-0.17],[-0.05,-0.18],[-0.025,-0.17]], 5);
  line(dots, [[0.025,-0.17],[0.05,-0.18],[0.078,-0.17]], 5);
  line(dots, [[0,-0.17],[-0.01,-0.115],[0.012,-0.11]], 2);
  circle(dots, 0, -0.075, 0.03, answer ? 0.012 : 0.004, 3, 18);
  line(dots, [[-0.1,-0.02],[-0.045,0.055],[0,0.005],[0.045,0.055],[0.1,-0.02]], 5);
  line(dots, [[0,0.015],[-0.023,0.055],[0,0.08],[0.023,0.055],[0,0.015]], 2);
  line(dots, [[0,0.08],[-0.025,0.18],[0,0.21],[0.025,0.18],[0,0.08]], 2);
  line(dots, [[-0.14,0],[-0.16,0.06],[-0.07,0.17]], 1);
  line(dots, [[0.14,0],[0.16,0.06],[0.07,0.17]], 1);
  return dots;
}

function slumpedWorker(action: boolean) {
  const dots: Dot[] = [];
  // Head hangs forward over the paper; shoulders rise behind it.
  const head: Dot[] = [];
  circle(head, 0, 0, 0.095, 0.105, 2, 70);
  line(head, [[-0.09,-0.015],[-0.1,-0.08],[-0.05,-0.12],[0.035,-0.125],
    [0.085,-0.08],[0.095,-0.015]], 5);
  for (const x of [-0.047, 0.047]) {
    circle(head, x, 0.025, 0.039, 0.023, 1, 24);
    line(head, [[x-0.019,0.026],[x+0.019,0.034]], 5);
  }
  line(head, [[-0.008,0.025],[0.008,0.025]], 1);
  line(head, [[0,0.037],[-0.012,0.066],[0.012,0.07]], 2);
  line(head, [[-0.021,0.09],[0.012,0.097]], 3);
  const angle = action ? -0.36 : -0.22;
  for (const dot of head) dots.push({ ...dot,
    x: -0.055 + dot.x * Math.cos(angle) - dot.y * Math.sin(angle),
    y: (action ? 0.025 : -0.005) + dot.x * Math.sin(angle) + dot.y * Math.cos(angle) * 0.85 });
  // A broad hunched back frames the lowered head, with elbows on the desk.
  line(dots, [[-0.1,-0.085],[-0.21,-0.115],[-0.285,-0.035],[-0.32,0.17],[-0.22,0.205]], 1);
  line(dots, [[0.035,-0.095],[0.16,-0.11],[0.25,-0.005],[0.3,0.17],[0.19,0.205]], 1);
  line(dots, [[-0.2,-0.065],[-0.22,0.085],[-0.15,0.175]], 1);
  line(dots, [[0.155,-0.055],[0.2,0.085],[0.13,0.175]], 1);
  line(dots, [[-0.13,0.095],[-0.09,0.14],[-0.035,0.115],[0.015,0.145],[0.065,0.08]], 5);
  line(dots, [[-0.045,0.13],[-0.065,0.155],[-0.04,0.175],[-0.01,0.15],[-0.045,0.13]], 3);
  line(dots, [[-0.04,0.175],[-0.025,0.21],[0.005,0.215],[-0.01,0.16]], 3);
  line(dots, [[-0.22,0.18],[-0.19,0.207],[-0.105,0.213],[-0.095,0.19],[-0.15,0.175]], 2);
  line(dots, [[0.19,0.18],[0.16,0.21],[0.09,0.211],[0.075,0.19],[0.14,0.175]], 2);
  line(dots, [[-0.35,0.23],[0.35,0.23]], 2);
  line(dots, [[-0.09,0.185],[0.07,0.18],[0.12,0.223],[-0.07,0.223],[-0.09,0.185]], 4);
  line(dots, [[-0.112,0.205],[-0.15,action ? 0.142 : 0.12]], 5);
  return dots;
}

function reluctantWorker(action: boolean) {
  const dots: Dot[] = [];
  // Close-up portrait: the expression, not props, carries this scene.
  line(dots, [[-0.14,-0.24],[-0.17,-0.15],[-0.16,-0.025],[-0.12,0.075],
    [-0.055,0.13],[0.04,0.14],[0.115,0.085],[0.15,-0.015],[0.16,-0.16],[0.12,-0.25]], 2);
  line(dots, [[-0.15,-0.13],[-0.185,-0.23],[-0.15,-0.32],[-0.08,-0.36],[-0.025,-0.345],
    [0.025,-0.37],[0.085,-0.33],[0.145,-0.28],[0.16,-0.16]], 5);
  line(dots, [[-0.14,-0.245],[-0.075,-0.295],[0,-0.28],[0.08,-0.3],[0.135,-0.24]], 1);
  // Inner brows pull together; eyelids sag toward the outer corners.
  line(dots, [[-0.12,-0.15],[-0.075,-0.16],[-0.025,action ? -0.12 : -0.135]], 5);
  line(dots, [[0.025,action ? -0.12 : -0.135],[0.075,-0.16],[0.12,-0.145]], 5);
  line(dots, [[-0.12,-0.095],[-0.077,-0.105],[-0.028,-0.095]], 5);
  line(dots, [[0.025,-0.095],[0.075,-0.103],[0.12,-0.088]], 5);
  line(dots, [[-0.115,-0.084],[-0.075,action ? -0.085 : -0.073],[-0.035,-0.083]], 2);
  line(dots, [[0.033,-0.083],[0.075,action ? -0.083 : -0.071],[0.112,-0.077]], 2);
  circle(dots, -0.062, -0.09, 0.004, 0.005, 1, 6);
  circle(dots, 0.084, -0.088, 0.004, 0.005, 1, 6);
  line(dots, [[-0.01,-0.17],[-0.014,-0.135]], 3);
  line(dots, [[0.009,-0.17],[0.014,-0.137]], 3);
  line(dots, [[-0.105,-0.054],[-0.075,-0.046],[-0.037,-0.053]], 1);
  line(dots, [[0.04,-0.051],[0.081,-0.044],[0.108,-0.05]], 1);
  line(dots, [[0,-0.085],[-0.015,-0.015],[0.011,-0.005],[0.025,-0.02]], 2);
  // Tight, uneven lips and downturned corners, opening just into a sigh.
  line(dots, [[-0.063,0.065],[-0.035,0.044],[0.008,0.041],[0.046,0.053],[0.059,0.072]], 3);
  line(dots, [[-0.037,0.059],[0.004,action ? 0.075 : 0.06],[0.04,0.064]], 2);
  line(dots, [[-0.033,0.102],[0.02,0.106]], 2);
  line(dots, [[-0.09,0.11],[-0.095,0.16],[-0.22,0.195],[-0.28,0.27]], 1);
  line(dots, [[0.08,0.12],[0.09,0.16],[0.22,0.2],[0.27,0.27]], 1);
  line(dots, [[-0.095,0.16],[-0.045,0.225],[0.035,0.23],[0.09,0.16]], 4);
  if (action) for (const dot of dots) { dot.y += 0.012; dot.x += dot.y * 0.045; }
  return dots;
}

function tiredWorker(kind: "tired" | "desk" | "driver", action: boolean) {
  if (kind === "driver") return reluctantWorker(action);
  if (kind === "desk") return slumpedWorker(action);
  const dots: Dot[] = [];
  const head: Dot[] = [];
  circle(head, 0, -0.15, 0.1, 0.125, 2, 75);
  line(head, [[-0.1,-0.15],[-0.12,-0.25],[-0.08,-0.29],[-0.06,-0.33],[-0.03,-0.3],
    [0,-0.34],[0.025,-0.3],[0.065,-0.31],[0.11,-0.24],[0.1,-0.15]], 5);
  line(head, [[-0.075,-0.175],[-0.045,-0.185],[-0.02,-0.17]], 5);
  line(head, [[0.02,-0.17],[0.045,-0.185],[0.075,-0.175]], 5);
  line(head, [[0,-0.16],[-0.012,-0.12],[0.015,-0.115]], 2);
  circle(head, 0, -0.08, 0.025, action ? 0.017 : 0.006, 3, 16);
  const tilt = 0;
  for (const dot of head) {
    const y = dot.y + 0.03;
    dots.push({ ...dot, x: dot.x * Math.cos(tilt) - y * Math.sin(tilt),
      y: dot.x * Math.sin(tilt) + y * Math.cos(tilt) - 0.03 + (action ? 0.014 : 0) });
  }
  line(dots, [[-0.09,-0.025],[-0.2,0.015],[-0.29,0.2]], 1);
  line(dots, [[0.09,-0.025],[0.2,0.015],[0.29,0.2]], 1);
  {
    line(dots, [[-0.09,-0.02],[-0.045,0.05],[0,0.015],[0.045,0.05],[0.09,-0.02]], 5);
    line(dots, [[0,0.02],[-0.025,0.065],[0,0.085],[0.025,0.065],[0,0.02]], 3);
    line(dots, [[0,0.085],[-0.02,0.17],[0,0.195],[0.02,0.17],[0,0.085]], 3);
  }
  for (const x of [-0.19,-0.145,0.145,0.19]) line(dots, [[x,0.04],[x,0.21]], 1);
  if (action) line(dots, [[0.13,-0.08],[0.18,-0.075],[0.21,-0.1]], 4);
  return dots;
}

// Sample Korean glyphs once, then draw them as individual drone lights.
const captionCache = new Map<string, { x: number; y: number }[]>();
function captionDots(text: string) {
  const cached = captionCache.get(text);
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  canvas.width = 640; canvas.height = 90;
  const ctx = canvas.getContext("2d")!;
  ctx.font = '600 64px "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
  ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "white";
  ctx.fillText(text, 320, 45, 610);
  const pixels = ctx.getImageData(0, 0, 640, 90).data;
  const dots: { x: number; y: number }[] = [];
  for (let y = 4; y < 90; y += 5) for (let x = 4; x < 640; x += 5) {
    if (pixels[(y * 640 + x) * 4 + 3] > 100) dots.push({ x: (x - 320) / 640, y: (y - 45) / 640 });
  }
  captionCache.set(text, dots);
  return dots;
}
const themes = [theme(duckFamily(false), duckFamily(true)), theme(whale(false), whale(true)),
  null, theme(moonRabbit(false), moonRabbit(true)), theme(officeMeme(false), officeMeme(true)),
  theme(tiredWorker("tired", false), tiredWorker("tired", true)),
  theme(tiredWorker("desk", false), tiredWorker("desk", true)),
  theme(tiredWorker("driver", false), tiredWorker("driver", true), moneyRain())];
let sprites: HTMLCanvasElement[] | undefined;
function getSprites() {
  return sprites ??= COLORS.map((color) => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 24;
    const ctx = canvas.getContext("2d")!;
    const halo = ctx.createRadialGradient(12, 12, 0, 12, 12, 12);
    halo.addColorStop(0, color);
    halo.addColorStop(0.15, color);
    halo.addColorStop(0.35, color + "70");
    halo.addColorStop(1, color + "00");
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, 24, 24);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(12, 12, 1.6, 0, Math.PI * 2); ctx.fill();
    return canvas;
  });
}

export function drawDroneShow(ctx: CanvasRenderingContext2D, w: number, h: number, hour: number) {
  const show = droneSchedule(hour);
  if (!show.active) return;
  const themeIndex = droneThemeIndex(show.elapsed + 1e-7);
  const localElapsed = show.elapsed + 1e-7 - themeIndex * DRONE_SCENE_SECONDS;
  // Keep choreography on its authored 60-unit timeline, played in 20 seconds;
  // the finale pauses at its peak (authored unit 56) for an extra hold before closing.
  const finaleRampSeconds = 56 / 60 * DRONE_SCENE_SECONDS;
  let seconds: number;
  if (themeIndex === themes.length - 1 && localElapsed >= finaleRampSeconds) {
    seconds = localElapsed < finaleRampSeconds + DRONE_FINALE_HOLD_SECONDS
      ? 56
      : 56 + (localElapsed - finaleRampSeconds - DRONE_FINALE_HOLD_SECONDS) * 60 / DRONE_SCENE_SECONDS;
  } else {
    seconds = (localElapsed % DRONE_SCENE_SECONDS) * 60 / DRONE_SCENE_SECONDS;
  }
  const previousEnding = themeIndex === 0 ? scattered : themes[themeIndex - 1]?.ending ?? finale;
  let from = previousEnding, to = rabbit, blend = ease(seconds / 9);
  if (seconds >= 15) { from = rabbit; to = relaxed; blend = ease((seconds - 15) / 5); }
  if (seconds >= 24) { from = relaxed; to = blowing; blend = ease((seconds - 24) / 5); }
  if (seconds >= 33) { from = blowing; to = rings; blend = ease((seconds - 33) / 8); }
  if (seconds >= 47) { from = rings; to = finale; blend = ease((seconds - 47) / 8); }
  const selected = themes[themeIndex];
  if (selected) {
    from = previousEnding; to = selected.start; blend = ease(seconds / 9);
    if (seconds >= 18) { from = selected.start; to = selected.action; blend = ease((seconds - 18) / 9); }
    if (seconds >= 45) { from = selected.action; to = selected.ending; blend = ease((seconds - 45) / 10); }
  }
  const opacity = (themeIndex === 0 ? ease(seconds / 3) : 1)
    * (themeIndex === themes.length - 1 ? 1 - ease((seconds - 56) / 4) : 1);
  const size = Math.min(w * 0.88, h * 0.63);
  const dotSize = Math.max(3, Math.min(7, size * 0.014));
  const atlas = getSprites();
  ctx.save();
  for (let i = 0; i < COUNT; i++) {
    const swim = themeIndex === 1 && seconds >= 12 && seconds < 45 ? Math.sin((seconds - 12) * 0.22) * size * 0.045 : 0;
    let px = from[i].x + (to[i].x - from[i].x) * blend;
    let py = from[i].y + (to[i].y - from[i].y) * blend;
    if (themeIndex === themes.length - 1 && seconds >= 45) {
      const bill = to[i].group ?? 0;
      const falling = ease((seconds - 48) / 7);
      px += Math.sin(seconds * 1.2 + bill * 1.7) * 0.018 * falling;
      py += (seconds - 48) * 0.014 * falling * (0.8 + hash(bill + 30) * 0.4);
    }
    if (themeIndex === 0) {
      // Fade the walk in/out around formation changes; each duck follows
      // with a delayed gait so the family doesn't move like one rigid sign.
      const walking = ease((seconds - 12) / 3) * (1 - ease((seconds - 43) / 2));
      const group = (blend < 0.5 ? from[i].group : to[i].group) ?? 0;
      const gait = (seconds - 12) * 3.2 - group * 0.85;
      px -= walking * ((seconds - 28) * 0.004 + Math.sin(gait) * 0.007);
      py += walking * Math.sin(gait * 2) * (group === 0 ? 0.008 : 0.012);
    }
    const x = w * 0.5 + swim + px * size;
    const y = h * 0.35 + py * size;
    const alpha = opacity * (0.88 + Math.sin(seconds * 1.3 + i * 0.8) * 0.12);
    ctx.globalAlpha = alpha * (1 - blend);
    ctx.drawImage(atlas[from[i].color], x - dotSize / 2, y - dotSize / 2, dotSize, dotSize);
    ctx.globalAlpha = alpha * blend;
    ctx.drawImage(atlas[to[i].color], x - dotSize / 2, y - dotSize / 2, dotSize, dotSize);
  }
  if (themeIndex === 4) {
    // A pause before the answer preserves the reference's comic timing.
    const questionAlpha = ease((seconds - 10) / 2) * (1 - ease((seconds - 43) / 2));
    const answerAlpha = ease((seconds - 13) / 0.8) * (1 - ease((seconds - 43) / 2));
    const balloon: Dot[] = [];
    line(balloon, [[0.17,-0.17],[0.43,-0.17],[0.43,-0.065],[0.17,-0.065],
      [0.17,-0.1],[0.135,-0.115],[0.17,-0.13],[0.17,-0.17]], 5);
    ctx.globalAlpha = answerAlpha * opacity * 0.65;
    for (const dot of balloon) {
      const d = Math.max(2, size * 0.007);
      ctx.drawImage(atlas[5], w * 0.5 + dot.x * size - d / 2,
        h * 0.35 + dot.y * size - d / 2, d, d);
    }
    for (const [text, y, alpha, color, width] of [
      ["지금 지쳤나요?", h * 0.35 + size * 0.29, questionAlpha, 2, size * 0.85],
      ["아니요", h * 0.35 - size * 0.12, answerAlpha, 3, size * 0.58],
    ] as const) {
      const cx = text === "아니요" ? w * 0.5 + size * 0.3 : w * 0.5;
      ctx.globalAlpha = alpha * opacity;
      for (const dot of captionDots(text)) {
        const d = Math.max(2, size * 0.007);
        ctx.drawImage(atlas[color], cx + dot.x * width - d / 2, y + dot.y * width - d / 2, d, d);
      }
    }
  }
  if (themeIndex >= 5) {
    const captions = [
      ["잠을 자도", "피로가 안 풀리냐"],
      ["아유…", "하기 싫어…"],
      ["돈 벌기", "참 힘들다…"],
    ][themeIndex - 5];
    if (captions) captions.forEach((text, row) => {
      ctx.globalAlpha = opacity * ease((seconds - 10 - row * 2) / 1.2) * (1 - ease((seconds - 43) / 2));
      const width = size * 0.95;
      for (const dot of captionDots(text)) {
        const d = Math.max(2, size * 0.007);
        ctx.drawImage(atlas[row === 0 ? 5 : 2], w * 0.5 + dot.x * width - d / 2,
          h * 0.35 + size * (0.36 + row * 0.105) + dot.y * width - d / 2, d, d);
      }
    });
  }
  if (themeIndex === themes.length - 1 && seconds >= 49) {
    ctx.globalAlpha = opacity * ease((seconds - 49) / 2);
    for (const dot of captionDots("모두 부자 되세요")) {
      const d = Math.max(2, size * 0.007);
      ctx.drawImage(atlas[2], w * 0.5 + dot.x * size * 0.95 - d / 2,
        h * 0.35 + size * 0.38 + dot.y * size * 0.95 - d / 2, d, d);
    }
  }
  ctx.restore();
}
