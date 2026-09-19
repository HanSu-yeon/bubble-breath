import { DRONE_SHOW_SECONDS } from "./droneThemes";

/** Eight scenes run each evening hour from :35:00 until :37:40. */
export function droneSchedule(hour: number) {
  const normalized = ((hour % 24) + 24) % 24;
  const whole = Math.floor(normalized);
  const elapsed = (normalized - whole) * 3600 - 2100;
  const active = whole >= 18 && whole <= 23 && elapsed >= -1e-7 && elapsed < DRONE_SHOW_SECONDS - 1e-7;
  const next = normalized < 18 + 35 / 60 ? 18 : normalized < whole + 35 / 60 ? whole : whole + 1;
  return { active, elapsed: Math.max(0, elapsed), label: active ? "드론쇼 공연 중"
    : `다음 드론쇼 ${next > 23 ? "내일 18" : next}:35` };
}
