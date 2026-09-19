import { DRONE_SHOW_SECONDS } from "./droneThemes";

/** The eight-scene show loops back-to-back all night, 18:00 through 04:00 the next day. */
export function droneSchedule(hour: number) {
  const normalized = ((hour % 24) + 24) % 24;
  const active = normalized >= 18 || normalized < 4;
  const sinceOpen = (normalized >= 18 ? normalized - 18 : normalized + 24 - 18) * 3600;
  const elapsed = active ? sinceOpen % DRONE_SHOW_SECONDS : 0;
  return { active, elapsed, label: active ? "드론쇼 공연 중" : "다음 드론쇼 18:00" };
}
