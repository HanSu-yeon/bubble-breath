# Roadmap
> Created: 2026-09-17
> Last Updated: 2026-09-17

전체 기능을 한 번에 구현하지 않는다. 아래 Phase 순서를 반드시 지킨다. 각 Phase의 세부 작업은 [Backlog](./00_BACKLOG.md)의 원자적 체크리스트를 따른다.

## Phase 1 — Bubble Physics (마이크 없음)

마이크를 연결하지 않은 상태에서 fake breath input(누르고 있기)으로 전체 interaction loop를 완성한다.

- 누르고 있으면: 파이프 끝 body가 커지고 neck이 늘어남
- 손을 떼면: 그 크기 그대로 유지(수축·자동분리 없음), 다시 누르면 이어서 성장
- 방울을 위로 스와이프하면: neck이 끊어지며 분리 → floating
- floating 방울을 누르면: pop

**완료 기준**: fake input만으로 attached(여러 번 나눠 불어 성장) → swipe-detach → floating → popped 전체 루프가 작동한다.

## Phase 2 — Feel

wobble, release deformation, floating drift, pop animation을 튜닝한다.

**완료 기준**: 이 단계에서 이미 "장난감으로 재미있다"고 느껴져야 한다. 단순 scale animation처럼 보이면 안 된다.

## Phase 3 — Microphone

Web Audio API를 연결해 fake breath를 실제 마이크 breath input으로 교체한다 ([Development Principles §3](../03_Technical_Specs/00_DEVELOPMENT_PRINCIPLES.md#3-breath-detection) 참고).

**완료 기준**: 실제 스마트폰에서 `후——` 불었을 때 즉각적으로 방울이 반응한다. 데스크톱 테스트만으로 완료 처리하지 않는다.

## Phase 4 — Visual Polish

transparency, highlight, iridescence, subtle shadow, particles를 다듬는다 ([UI Design](../02_UI_Screens/01_UI_DESIGN.md) 참고).

**완료 기준**: 방울이 단순한 원이 아니라 비눗방울처럼 보인다.

## Phase 5 — Sound

MVP 인터랙션(Phase 1-4)이 끝난 뒤 마지막으로 추가한다 ([UI Design §5](../02_UI_Screens/01_UI_DESIGN.md) 참고). BGM 없음, 짧은 효과음만 (분리 시 `뽁`, pop 시 `톡/팟`, 큰 pop 시 `퐁/팡`, 방울 크기에 따른 pitch 변화). Web Audio API 사용.

**완료 기준**: 효과음이 과하지 않고, 스피커 출력이 마이크 breath detection을 오염시키지 않는다.

## Related Documents
- **Concept_Design**: [Product Specs](../01_Concept_Design/03_PRODUCT_SPECS.md) - MVP 13개 항목
- **Technical_Specs**: [Development Principles](../03_Technical_Specs/00_DEVELOPMENT_PRINCIPLES.md) - Phase별 기술 기반
- **Logic_Progress**: [Backlog](./00_BACKLOG.md) - Phase별 원자적 작업 단위
