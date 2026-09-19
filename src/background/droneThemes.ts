export const DRONE_THEMES = ["오리 가족의 퇴근길", "고래의 산책", "퇴근한 토끼", "달토끼", "지금 지쳤나요?", "잠을 자도 피곤해", "하기 싫어", "돈 벌기 참 힘들다"] as const;
export const DRONE_SCENE_SECONDS = 20;
/** Extra real seconds the finale holds at full brightness before its closing fade, so "모두 부자 되세요" lingers. */
export const DRONE_FINALE_HOLD_SECONDS = 8;
export const DRONE_SHOW_SECONDS = DRONE_THEMES.length * DRONE_SCENE_SECONDS + DRONE_FINALE_HOLD_SECONDS;
export function droneThemeIndex(elapsedSeconds: number) {
  return Math.min(DRONE_THEMES.length - 1, Math.floor(Math.max(0, elapsedSeconds) / DRONE_SCENE_SECONDS));
}
