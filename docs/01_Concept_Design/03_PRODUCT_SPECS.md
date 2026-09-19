# Product Specs
> Created: 2026-09-17
> Last Updated: 2026-09-17

## 1. MVP Definition (v0.1)

1. 모바일 세로 fullscreen canvas
2. 비눗방울 막대
3. 마이크 권한
4. Web Audio API 입력
5. 바람 threshold 감지
6. 불면 막 끝에 방울 생성
7. 계속 불면 크기 증가
8. 방울 wobble
9. 불기를 멈추면 release
10. 위로 둥실거리며 이동
11. 화면 밖으로 나가면 제거
12. floating bubble 터치 시 pop
13. 바로 다음 방울 생성 가능

이 13개 항목이 완성되어야 v0.1이 완료된 것으로 본다. 개발 순서와 단계별 완료 기준은 [Roadmap](../04_Logic_Progress/00_ROADMAP.md)을 따른다.

## 2. Non-Functional Requirements

- **반응성**: 불기 시작 → 방울 반응까지 체감 지연이 없어야 한다 (목표: 즉시 반응, 0.5초 이상 지연 시 실패로 간주).
- **마이크 안정성**: 기기마다 마이크 감도가 다르므로 절대 threshold를 하드코딩하지 않는다. ambient noise 측정 기반 동적 calibration을 사용한다.
- **플랫폼**: 모바일 웹 우선. 데스크톱 테스트만으로 완료 판단하지 않는다 — 반드시 실제 스마트폰에서 검증한다.
- **성능**: 동시 bubble 최대 개수를 제한한다 (20~40개 범위에서 실측 후 결정).

## 3. Out of Scope (v0.1)

```
로그인 / 회원가입 / 서버 / DB
점수 / 랭킹 / 레벨 / 코인 / 미션
결과 화면 / 공유 / 컬렉션
캐릭터 / 상점 / 스킨 시스템
복잡한 particle physics / 실제 fluid simulation
완벽한 breath AI classifier
배경음악(BGM)
```

BGM은 특히 마이크 breath detection을 방해할 수 있어 의도적으로 제외한다.

## 4. Success Criteria

설명 없이 사용자에게 폰을 건넨다. 화면에는 `후— 불어봐`만 있다. 사용자가 분다 → 방울이 커진다 → 한 번 더 분다 → 터뜨려본다 → 또 분다가 자연스럽게 이어지면 성공이다. 세부 테스트 관점은 [SPEC.md §32-33](../../SPEC.md)를 참고한다.

## 5. Related Documents
- **Concept_Design**: [Vision & Core Values](./01_VISION_CORE.md) - 프로젝트 핵심 가치와 타겟 경험
- **UI_Screens**: [Screen Flow](../02_UI_Screens/00_SCREEN_FLOW.md) - 화면 흐름
- **Technical_Specs**: [Development Principles](../03_Technical_Specs/00_DEVELOPMENT_PRINCIPLES.md) - 구현 전략 및 구조
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/00_ROADMAP.md) - Phase별 개발 순서
- **Logic_Progress**: [Backlog](../04_Logic_Progress/00_BACKLOG.md) - 원자적 작업 단위
