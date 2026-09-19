# Backlog
> Created: 2026-09-17
> Last Updated: 2026-09-17 (v2: ring wand → pipe + neck/body stretch, swipe-to-detach)

Phase 정의는 [Roadmap](./00_ROADMAP.md) 참고. 각 항목은 실행 및 검증 가능한 원자적 단위로 분할한다.

## ToDo

### Phase 2 — Feel (남은 항목)
- [ ] wobble에 다중 frequency 또는 noise 추가 조정 (현재 2-wave 혼합, 더 유기적으로)
- [ ] breathStrength 크기에 비례한 wobble amplitude 스케일링 (현재 상수 amplitude)
- [ ] [나중에] 너무 오래/세게 불면 attached 상태에서 자동으로 `팡` 터지는 이스터에그 (사용자 확인: 지금은 구현하지 않음, 현재는 bubbleMaxRadius에서 성장이 멈추고 유지됨)
- [ ] 디버그 오버레이(Mic/Breath/State/Radius) 추가, production 빌드에서 숨김 처리
- [ ] neck pinch curve, settle bounce, swipe threshold 값 실기기에서 재튜닝

### Phase 3 — Microphone
- [ ] `getUserMedia()` 마이크 권한 요청 플로우
- [ ] `audio/breathDetector.ts`: AudioContext + AnalyserNode 설정
- [ ] 마이크 활성화 직후 ambient noise 측정 로직
- [ ] `breathStrength` 정규화(0~1) 및 smoothing 구현
- [ ] fake breath input을 실제 breathDetector 출력으로 교체 (input/touch.ts는 유지, 입력 소스만 교체)
- [ ] 실제 스마트폰에서 반응성 테스트 (불기 시작/유지/중단/여러 번 나눠 불기 4가지 시나리오)
- [ ] 스피커로 재생될 pop 효과음(Phase 5)이 마이크에 다시 잡히지 않도록 detector 설계 시 고려

### Phase 4 — Visual Polish (남은 항목)
- [ ] "톡!" 힌트 타이밍/위치 실기기에서 재검토
- [ ] rim glint 위치/색상 팔레트 실기기에서 재검토 (현재 seed 기반 고정 오프셋)

### Phase 5 — Sound (착수 전, [UI Design §5](../02_UI_Screens/01_UI_DESIGN.md) 참고)
- [ ] `audio/soundEffects.ts`: Web Audio API 기반 짧은 효과음 재생 유틸
- [ ] 분리(swipe detach) 시 `뽁` 사운드
- [ ] pop 시 `톡/팟`(작은 방울) ~ `퐁/팡`(큰 방울), radius 기반 pitch 변화
- [ ] 같은 효과음 pitch/volume 미세 랜덤화
- [ ] 마이크 echo/피드백 방지 처리 (Phase 3 항목과 연동)

## In Progress

(없음)

## Done

### Phase 1 — Bubble Physics (fake breath)
- [x] 프로젝트 스캐폴딩 (Vite + React + TS, `src/` 구조 생성)
- [x] `BubbleCanvas.tsx`: fullscreen portrait canvas 렌더 루프 구성
- [x] `input/touch.ts`: press-and-hold를 fake breathStrength로 매핑, drag delta 리포트, pop 히트테스트와 분리
- [x] `Bubble.ts` / `BubbleManager.ts`: attached/floating/popped state 관리, maxBubbleCount 제한
- [x] pop 후 즉시 다음 bubble 생성 가능

### Phase 1.5 — Pipe + Stretch-to-Neck 재설계 (링 디자인 폐기)
- [x] 원형 링/gear wand 완전 제거 → `pipe/Pipe.ts`로 교체 (화면 하단에 끝부분만 짧게 보이는 파이프)
- [x] `bubble/bubbleShape.ts`: neck(파이프 고정)–body(성장) 두 원을 잇는 실루엣을 **Bezier 곡선**으로 트레이스 (직선 tangent 대신 중심축으로 당겨지는 부드러운 pinch, 얇아질수록 더 오목하게)
- [x] attached bubble: body가 파이프 끝에서 멀어지며 커지고 neck은 그만큼 늘어나고 가늘어짐 — 풍선처럼 위로 자라지 않고 하나의 연속된 막으로 보임
- [x] **여러 번 나눠 불기 지원**: breath가 멈춰도 attached bubble은 크기/위치를 그대로 유지(수축도 자동분리도 없음), idle 상태에서 `ぷるぷる` 흔들림만 발생. 다시 불면 같은 bubble이 이어서 성장 (실제 브라우저에서 press→pause 650ms→press 검증 완료)
- [x] **Breath-stop이 더 이상 release를 트리거하지 않음.** Release는 별도 행동(스와이프)으로 완전히 분리
- [x] 분리(detach) 제스처: 위로 스와이프 시 neck이 끊어지고 flingVx/flingBoost가 실린 채 floating으로 전환 (swipe 속도가 초기 속도에 반영)
- [x] 분리 직후 settle bounce("뽀용"): decaying squash/stretch 오실레이션으로 빠르게 원형으로 안정
- [x] floating bubble: 항상 완전한 circle로 렌더 (surface tension), attached의 늘어난 실루엣과 분리된 렌더 경로
- [x] floating 방향: buoyancy(항상 위쪽) + per-bubble sine 기반 좌우 drift + swipe 초기 fling(방향은 스와이프에 좌우됨, 완전 랜덤 아님) — 실제 브라우저에서 전체 루프(성장→일시정지→재성장→스와이프→분리→settle→drift→pop) 검증 완료
- [x] 겹침 개선: floatSpeed/drift/fling 튜닝으로 분리 직후 attached bubble과 빠르게 시각적으로 분리되도록 조정

### Phase 2 — Feel (일부)
- [x] wobble 구현: attached(idle jiggle)/floating 상태에 sine 기반 변형 추가
- [x] floating 상태에 horizontal drift + noise 추가 (직선 상승 방지)
- [x] pop 애니메이션 구현 (squash → 확산/페이드 + 파티클 버스트)
- [x] `config/tuning.ts`: 모든 튜닝 값을 이 파일로 분리 (neck/pinch/swipe/settle 포함)

### Phase 4 — Visual Polish (일부, 조기 구현)
- [x] 이전에 있던 "sphere wireframe처럼 보이는" 교차 타원/균일 rainbow outline 완전 제거 — debug 3D 가이드 아님을 명확히 함
- [x] bubble 내부: 검게 채우지 않고 거의 투명하게, 아주 옅은 haze 2겹(additive blending)만
- [x] rim: 두께 ~75% 축소, 대부분 거의 안 보이는 baseline + 짧은 구간에서만 white/cyan/pink glint (conic gradient, seed로 방울마다 위치 다름)
- [x] highlight: 크기/투명도가 다른 3개 레이어로 분리 (단일 highlight → 여러 개)
- [x] 배경 단색(#050507) 적용
- [x] pipe/bubble 렌더링 데이터 분리 (`pipe/Pipe.ts`의 `PipeStyle`, `bubble/bubbleRenderer.ts`의 `BubbleStyle`) — 향후 커스터마이징 UI를 위한 교체 가능한 구조

## Related Documents
- **Logic_Progress**: [Roadmap](./00_ROADMAP.md) - Phase 정의 및 완료 기준
- **Technical_Specs**: [Development Principles](../03_Technical_Specs/00_DEVELOPMENT_PRINCIPLES.md) - 구조/설정 기준
- **UI_Screens**: [Screen Flow](../02_UI_Screens/00_SCREEN_FLOW.md) - 인터랙션 이벤트 정의
- **UI_Screens**: [UI Design](../02_UI_Screens/01_UI_DESIGN.md) - 모션/비주얼 사양
