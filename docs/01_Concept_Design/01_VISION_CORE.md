# Vision & Core Values
> Created: 2026-09-17
> Last Updated: 2026-09-17

## 1. Why

Bubble Breath는 게임이 아니라 마이크 기반 interaction prototype이다. 검증하려는 것은 단 하나:

> 내 실제 행동(입김)이 화면 속 물체와 직접 연결되어 있다는 느낌.

성공 여부는 재미의 정도가 아니라 "물리적으로 연결되어 있다"는 감각이 실제 스마트폰에서 느껴지는가로 판단한다.

## 2. Target Experience

사용자가 처음 실행한 뒤 5초 안에 `후— → 방울이 커짐`을 경험해야 한다. 설명 없이 폰을 건네도 자연스럽게:

```
후—— 분다 → 방울이 커진다 → "오?" → 한 번 더 분다 → 더 크게 만들어본다 → 터뜨려본다 → 또 분다
```

가 나와야 성공이다. 전체 원문 시나리오와 화면 스케치는 [SPEC.md](../../SPEC.md)를 참고한다.

## 3. Core Product Principles

1. **즉각적 반응**: 불기 시작과 방울 반응 사이 지연이 느껴지면 안 된다.
2. **방울 자체가 피드백 UI**: 별도의 wind power 게이지를 만들지 않는다. 방울이 커지는 속도로 입김 세기를 표현한다.
3. **완벽한 원이 아니다**: wobble(찌그러짐, 흔들림, 출렁임)이 핵심 손맛이다.
4. **설명하지 않는다**: 튜토리얼 없음. 최초 instruction은 `후— 불어봐` 한 줄뿐.

## 4. Scope Discipline

이 프로젝트는 로그인, DB, 점수, 랭킹, 결과 화면, 공유, 캐릭터, 상점 등 서비스형 기능을 의도적으로 배제한다. 기능을 넓히기 전에 `후—— → 뽀오오옹 → 똑 → 둥실` 루프 자체가 재미있는지부터 검증한다. 상세 범위는 [Product Specs](./03_PRODUCT_SPECS.md)를 참고한다.

## 5. Related Documents
- **Concept_Design**: [Product Specs](./03_PRODUCT_SPECS.md) - MVP 범위와 v0.1에서 제외되는 기능
- **UI_Screens**: [Screen Flow](../02_UI_Screens/00_SCREEN_FLOW.md) - 첫 진입부터 반복 루프까지의 화면 흐름
- **Technical_Specs**: [Development Principles](../03_Technical_Specs/00_DEVELOPMENT_PRINCIPLES.md) - 구현 전략 기반
