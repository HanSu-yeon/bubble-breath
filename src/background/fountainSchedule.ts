/** Continuous nightly fountain, 18:00 through 04:00 the next day in device-local time. */
export function fountainSchedule(hour: number) {
  const normalized = ((hour % 24) + 24) % 24;
  const active = normalized >= 18 || normalized < 4;
  const sinceOpen = normalized >= 18 ? normalized - 18 : normalized + 24 - 18;
  const elapsed = sinceOpen * 3600;
  const remaining = (10 - sinceOpen) * 3600;
  const fade = active ? Math.max(0, Math.min(1, elapsed / 3, remaining / 3)) : 0;
  return { active, fade, label: active ? "무지개 분수 공연 중" : "다음 분수 18:00" };
}
