# Development Principles
> Created: 2026-09-17
> Last Updated: 2026-09-17

## 1. Architecture

- **Rendering**: Canvas 2D. Three.js/WebGL은 사용하지 않는다 (모바일 성능, 빠른 프로토타이핑, 간단한 touch hit testing, 다중 bubble 관리 용이성 때문). 필요해지면 이후 WebGL로 전환.
- **실제 fluid simulation이나 복잡한 물리엔진은 사용하지 않는다.** wobble은 sine/noise 기반의 시각적 근사로 구현한다.
- **서버/DB 없음.** 전부 클라이언트 사이드 상태로 처리한다.

## 2. Folder Structure

```
src/
├── audio/
│   └── breathDetector.ts
│
├── bubble/
│   ├── Bubble.ts
│   ├── BubbleManager.ts
│   └── bubbleRenderer.ts
│
├── particles/
│   └── PopParticles.ts
│
├── input/
│   └── touch.ts
│
├── config/
│   └── tuning.ts
│
├── canvas/
│   └── BubbleCanvas.tsx
│
├── App.tsx
└── main.tsx
```

과도한 추상화를 만들지 않는다. Feature 기반 최소 구조.

## 3. Breath Detection

```
microphone → Web Audio API → audio level / frequency characteristics → smoothing → breathStrength(0~1) → bubble growth
```

- `getUserMedia()` + Web Audio API 사용.
- 목표는 정확한 음성 분석이 아니라 "마이크 근처 바람 불기" 감지.
- 마이크 활성화 직후 짧은 구간의 ambient noise를 baseline으로 측정: `input = currentMicLevel - ambientNoise`.
- raw amplitude만으로는 말소리/음악/주변 소음에도 반응하므로, 가능하면 바람에서 강하게 나타나는 broadband/noisy 특성도 함께 활용한다.
- 완벽한 판별보다 "불었을 때 확실히 반응한다"를 우선한다.
- threshold는 절대값 하드코딩 금지. 초기 ambient 측정값 기반 동적 calibration.

## 4. Bubble State Machine

```
idle → forming → attached → released → floating → popped
```

| State | 설명 |
|:---|:---|
| idle | 막만 존재 |
| forming | 바람 감지, 아주 작은 방울 생성 시작 |
| attached | 막 끝에 붙어 성장 중 |
| released | 불기 중단 후 grace period 경과, 막에서 분리 |
| floating | 화면 내 자유 이동 |
| popped | pop 애니메이션 후 제거 |

성장 공식(개념): `radius += breathStrength * growthRate * deltaTime`, 렌더링 값에는 easing/smoothing 적용.

Release는 breath 소실 즉시가 아니라 150~300ms grace period 후 처리한다 (마이크 입력의 흔들림 때문). 정확한 값은 실기기 테스트로 튜닝한다.

## 5. Config — Tuning Values

튜닝 값은 코드 전반에 하드코딩하지 않고 `config/tuning.ts`로 분리한다.

```ts
export const tuning = {
  breathThreshold: ...,
  breathSmoothing: ...,

  bubbleMinRadius: ...,
  bubbleMaxRadius: ...,
  growthRate: ...,

  releaseDelay: ...,

  wobbleAmount: ...,
  wobbleSpeed: ...,

  floatSpeed: ...,
  horizontalDrift: ...,

  maxBubbleCount: ...
}
```

실제 휴대폰 테스트 중 쉽게 값을 바꿀 수 있어야 한다.

## 6. Debug Mode

개발 중에는 디버그 오버레이를 허용한다.

```
Mic      0.34
Breath   0.61
State    blowing
Radius   84
```

마이크 없이도 테스트할 수 있도록 Space 키 또는 화면 특정 영역 누르기로 가짜 breath input을 만든다. **이 UI는 production 빌드에서는 전부 숨긴다.**

## 7. [TODO] Items

- [TODO][Medium] 최대 크기 근처에서 확률적으로 막에 붙은 채 자동 파열되는 연출 (v0.1에서는 생략 가능, SPEC.md §14 참고)
- [TODO][Low] 사운드 이펙트 (SPEC.md §18, v0.1은 무음 허용)

## 8. Related Documents
- **Concept_Design**: [Product Specs](../01_Concept_Design/03_PRODUCT_SPECS.md) - MVP 항목 및 NFR(반응성, 마이크 안정성)
- **UI_Screens**: [Screen Flow](../02_UI_Screens/00_SCREEN_FLOW.md) - state와 연결되는 인터랙션 이벤트
- **UI_Screens**: [UI Design](../02_UI_Screens/01_UI_DESIGN.md) - wobble/release/pop 모션 사양
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/00_ROADMAP.md) - Phase별 구현 순서 (Phase 1 fake breath → Phase 3 실제 마이크 연결)
- **Logic_Progress**: [Backlog](../04_Logic_Progress/00_BACKLOG.md) - 원자적 작업 단위
