# Screen Flow
> Created: 2026-09-17
> Last Updated: 2026-09-17

## 1. Entry Flow

Splash screen이나 랜딩페이지 없이 화면을 열자마자 장난감이 보인다.

```
┌─────────────────────┐
│     후— 불어봐      │
│          ○          │
│          │          │
│          │          │
│    [ 불어보기 ]     │
└─────────────────────┘
```

`불어보기` 버튼(첫 user gesture)을 누르면:
1. 마이크 권한 요청
2. AudioContext 활성화
3. 주변 소음(ambient noise) 측정
4. 버튼 제거, 플레이 시작 → 전체 화면이 장난감 영역이 됨

## 2. Main Play Screen

모바일 portrait 기준. 상단 70~80%는 방울들이 떠다니는 공간, 하단은 새 방울을 만드는 막대 영역.

```
┌─────────────────────┐
│   ◯           ○     │
│         ◎           │
│                     │
│      후—            │
│         ○           │
│         │           │
│         │           │
└─────────────────────┘
```

플레이 시작 후에는 UI를 거의 없앤다. `후— 불어봐` 텍스트도 첫 성공 이후 사라진다. 점수판, 메뉴, 설정 등은 상시 노출하지 않는다.

## 3. Play Loop (반복, 종료 없음)

```
💨 불기 → 🫧 커지기 → ✨ 떨어지기(release) → 🫧 둥실거리기(floating) → 👆 터뜨리기(pop) → 💨 또 불기
```

별도의 시작/종료 화면이 없다. 화면에 방울이 쌓이는 것 자체가 세션 진행의 표현이다.

## 4. Interaction Events

| Event | Trigger | Result |
|:---|:---|:---|
| 불기 시작 | breathStrength > threshold | 막 끝에 작은 방울 생성 (forming → attached) |
| 계속 불기 | breathStrength 유지 | 방울 radius 증가, wobble 발생 |
| 불기 중단 | breathStrength 소실 후 grace period(150~300ms) 경과 | release → floating |
| 방울 터치 | floating bubble 탭 | pop 애니메이션 후 제거 |

## 5. Related Documents
- **Concept_Design**: [Vision & Core Values](../01_Concept_Design/01_VISION_CORE.md) - 즉각적 반응, 설명 없는 UX 원칙
- **Concept_Design**: [Product Specs](../01_Concept_Design/03_PRODUCT_SPECS.md) - MVP 범위
- **UI_Screens**: [UI Design](./01_UI_DESIGN.md) - 비주얼 디자인 시스템
- **Technical_Specs**: [Development Principles](../03_Technical_Specs/00_DEVELOPMENT_PRINCIPLES.md) - state machine 및 렌더링 구현
