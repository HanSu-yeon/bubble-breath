// Continuous time-of-day sky state, driven by the user's real local clock.
// Keyframes are interpolated (never swapped abruptly) so the sky drifts
// smoothly through the day instead of jumping at fixed boundaries.
export interface SkyState {
  topColor: [number, number, number];
  bottomColor: [number, number, number];
  cloudOpacity: number;
  starOpacity: number;
  lightChance: number; // 0..1 chance any given city window is lit
  citySilhouetteDarkness: number; // 0 = barely darker than sky (hazy noon), 1 = near-black night
  brightness: number; // 0..1 overall scene luminance, used to nudge bubble visibility
}

interface Keyframe {
  hour: number;
  topColor: [number, number, number];
  bottomColor: [number, number, number];
  cloudOpacity: number;
  starOpacity: number;
  lightChance: number;
  citySilhouetteDarkness: number;
}

// Rough moods per the brief: dawn -> morning -> day -> late afternoon ->
// sunset -> night, wrapping back to dawn. Only a handful of keyframes —
// interpolation does the rest.
const KEYFRAMES: Keyframe[] = [
  {
    hour: 0,
    topColor: [27, 30, 49],
    bottomColor: [59, 55, 81],
    cloudOpacity: 0.035,
    starOpacity: 0.9,
    lightChance: 0.45,
    citySilhouetteDarkness: 0.95,
  },
  {
    hour: 4,
    topColor: [31, 34, 56],
    bottomColor: [65, 61, 88],
    cloudOpacity: 0.04,
    starOpacity: 0.75,
    lightChance: 0.3,
    citySilhouetteDarkness: 0.9,
  },
  {
    hour: 5,
    topColor: [58, 52, 96],
    bottomColor: [206, 150, 168],
    cloudOpacity: 0.12,
    starOpacity: 0.18,
    lightChance: 0.22,
    citySilhouetteDarkness: 0.55,
  },
  {
    hour: 7,
    topColor: [126, 173, 201],
    bottomColor: [239, 221, 202],
    cloudOpacity: 0.32,
    starOpacity: 0,
    lightChance: 0.05,
    citySilhouetteDarkness: 0.22,
  },
  {
    hour: 11,
    topColor: [113, 165, 195],
    bottomColor: [214, 227, 222],
    cloudOpacity: 0.38,
    starOpacity: 0,
    lightChance: 0,
    citySilhouetteDarkness: 0.14,
  },
  {
    hour: 16,
    topColor: [135, 157, 190],
    bottomColor: [245, 209, 173],
    cloudOpacity: 0.32,
    starOpacity: 0,
    lightChance: 0,
    citySilhouetteDarkness: 0.24,
  },
  {
    hour: 18.5,
    topColor: [100, 91, 144],
    bottomColor: [241, 170, 142],
    cloudOpacity: 0.22,
    starOpacity: 0.05,
    lightChance: 0.3,
    citySilhouetteDarkness: 0.55,
  },
  {
    hour: 20,
    topColor: [32, 33, 55],
    bottomColor: [81, 66, 96],
    cloudOpacity: 0.08,
    starOpacity: 0.85,
    lightChance: 0.55,
    citySilhouetteDarkness: 0.95,
  },
];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpColor(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

/** Current local hour as a smooth fractional number (e.g. 14.5 = 2:30pm), for continuous interpolation. */
export function currentHour(date: Date = new Date()): number {
  return date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
}

export function computeSkyState(hour: number): SkyState {
  const n = KEYFRAMES.length;
  let i = 0;
  for (; i < n; i++) {
    const next = KEYFRAMES[(i + 1) % n];
    const nextHour = next.hour > KEYFRAMES[i].hour ? next.hour : next.hour + 24;
    if (hour >= KEYFRAMES[i].hour && hour < nextHour) break;
    if (i === n - 1) break; // fallback, handled by wrap below
  }
  const a = KEYFRAMES[i % n];
  const b = KEYFRAMES[(i + 1) % n];
  const aHour = a.hour;
  const bHour = b.hour > a.hour ? b.hour : b.hour + 24;
  const h = hour < a.hour ? hour + 24 : hour;
  const span = bHour - aHour;
  const t = span > 0 ? Math.min(1, Math.max(0, (h - aHour) / span)) : 0;

  const topColor = lerpColor(a.topColor, b.topColor, t);
  const bottomColor = lerpColor(a.bottomColor, b.bottomColor, t);
  const cloudOpacity = lerp(a.cloudOpacity, b.cloudOpacity, t);
  const starOpacity = lerp(a.starOpacity, b.starOpacity, t);
  const lightChance = lerp(a.lightChance, b.lightChance, t);
  const citySilhouetteDarkness = lerp(a.citySilhouetteDarkness, b.citySilhouetteDarkness, t);

  const avgLuma =
    (0.2126 * (topColor[0] + bottomColor[0]) / 2 +
      0.7152 * (topColor[1] + bottomColor[1]) / 2 +
      0.0722 * (topColor[2] + bottomColor[2]) / 2) /
    255;
  const brightness = Math.min(1, Math.max(0, avgLuma));

  return { topColor, bottomColor, cloudOpacity, starOpacity, lightChance, citySilhouetteDarkness, brightness };
}
