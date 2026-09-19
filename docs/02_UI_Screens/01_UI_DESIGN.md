# UI Design System
> Created: 2026-09-17
> Last Updated: 2026-09-17 (v2: ring wand → pipe, breath-stop release → swipe-to-detach gesture)

## 1. Visual Direction

"고급스러운 유리 프로젝트"도 아니고 "어린이 교육 앱"도 아니다. 목표는 **깨끗하고 예쁜 디지털 장난감**.

- **배경**: 아주 밝은 단색 또는 미세한 gradient (sky / cream / very light blue / pale lavender). 복잡한 배경 금지.

## 2. Bubble Rendering

단순한 파란 원이 아니다. 최소 구성 요소:

| 요소 | 설명 |
|:---|:---|
| 투명함 | 중앙은 거의 투명 |
| Rim | 가장자리에 얇은 밝은 rim |
| Highlight | 빛 반사를 표현하는 작은 highlight |
| Iridescence | pink / cyan / violet / yellow 계열이 아주 약하게 비치는 정도 (과한 rainbow gradient 금지) |

목표는 "무지개 원"이 아니라 "투명한 막에서 색이 아주 살짝 보인다"는 느낌.

## 3. Pipe Design (구 wand 링 디자인 대체)

원형 링/막대 디자인은 폐기했다. 화면 주인공은 파이프가 아니라 비눗방울이므로, 파이프는 화면 하단 중앙에서 **끝부분만 짧게** 보이고 나머지는 화면 밖으로 나간 것처럼 그린다.

```
   ○   ← soap film이 붙는 파이프 끝
   │
   │   ← 여기까지만 보임, 아래는 화면 밖
```

색은 옅은 회색/플라스틱 톤. 사용자가 보자마자 "여기서 비눗방울이 나오는구나"를 이해하면 충분하다.

## 4. Bubble Motion

방울은 완벽한 원이 아니어야 한다.

**성장 중 (파이프에 붙어 있음)**: 단순 scale animation이 아니라 body(커지는 몸통) + neck(파이프와 연결된, 점점 가늘어지는 목)으로 이루어진 하나의 연속된 막으로 표현한다. Body는 파이프 끝에서부터 점점 멀어지며 커지고, neck은 그만큼 늘어나고 가늘어진다. 숨을 멈추면 그 상태 그대로 유지(수축도 소멸도 없음)되고, 살짝 `ぷるぷる` 흔들리기만 한다. 다시 불면 같은 방울이 이어서 커진다.

**분리 (Detach)**: breath가 멈춘다고 자동으로 분리되지 않는다. 사용자가 방울을 위로 스와이프해야 neck이 끊어지고 분리된다. 분리 직후 스와이프 속도가 초기 속도에 실리고(fling), surface tension으로 살짝 찌그러졌던 형태가 `뽀용`하며 빠르게 둥근 모양으로 안정된 뒤, 일반 floating 거동(buoyancy + horizontal drift)으로 넘어간다.

**Floating 이동**: 방향은 랜덤이 아니라 항상 위쪽 buoyancy가 기본이며, 방울마다 고유한 위상(phase)을 가진 부드러운 sine 기반 좌우 drift가 더해져 자연스럽게 둥실거린다. 여러 방울이 파이프 근처에 겹쳐 보이지 않도록 buoyancy 속도와 fling 감쇠 시간을 튜닝했다.

**Pop 애니메이션**: `display:none` 단일 전환 금지. (1) 살짝 눌림 → (2) 막이 확 퍼짐/페이드 → (3) 작은 반짝이 파티클 → (4) 사라짐. 전체 길이는 매우 짧고 즉각적이어야 한다.

## 5. Sound (Later — MVP 인터랙션 완성 후 추가)

구현 우선순위: 인터랙션 → 실제 마이크 → 비주얼 튜닝 → **사운드**.

- BGM 없음. 사용자가 실제로 내는 숨소리 자체가 플레이 경험의 일부.
- 불고 있는 동안 별도의 `후우우` 효과음은 재생하지 않는다.
- 방울이 파이프에서 분리될 때(swipe detach): 작고 말랑한 `뽁`
- 방울 터치(pop) 시: 얇고 시원한 `톡 / 팟`
- 큰 방울이 터질 때: 조금 더 낮고 둥근 `퐁 / 팡`
- 방울 크기에 따라 pop 사운드의 pitch/playbackRate를 변화시킨다 — 작은 방울은 높고 가볍게, 큰 방울은 낮고 둥글게.
- 같은 효과음도 pitch/volume을 미세하게 랜덤화해 반복감을 줄인다.
- 효과음은 짧고 과하지 않게. Web Audio API 사용.
- **주의**: 스피커로 재생되는 효과음이 마이크에 다시 잡혀 breath detection을 오염시킬 수 있다. `audio/breathDetector.ts` 설계 시 반드시 고려한다 (예: 효과음 재생 직후 짧은 기간 breath 판정을 완화하거나, echo cancellation 활용). 관련: [Development Principles](../03_Technical_Specs/00_DEVELOPMENT_PRINCIPLES.md).

## 6. Related Documents
- **UI_Screens**: [Screen Flow](./00_SCREEN_FLOW.md) - 화면 구성 및 인터랙션 이벤트
- **Concept_Design**: [Vision & Core Values](../01_Concept_Design/01_VISION_CORE.md) - wobble이 핵심 손맛이라는 원칙 근거
- **Technical_Specs**: [Development Principles](../03_Technical_Specs/00_DEVELOPMENT_PRINCIPLES.md) - Canvas 2D 렌더링 구현 및 튜닝 값
