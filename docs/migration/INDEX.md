# 📚 마이그레이션 문서 색인

> **권한 데이터 경로 전환 프로젝트 - 전체 문서 가이드**

## 🗺️ 문서 맵

```
docs/migration/
├── INDEX.md                           # 📚 이 문서 - 전체 색인
├── OVERVIEW.md                        # 📄 마이그레이션 개요 및 진행 상황
├── CHECKLIST.md                       # ✅ Phase별 체크리스트
├── QUICK_REFERENCE.md                 # 🚀 Server Actions 사용 가이드
└── phases/
    ├── phase1-mvp.md                  # Phase 1: MVP 핵심 기능 전환 ✅
    ├── phase2-testing.md              # Phase 2: 테스트 및 검증 🔄
    ├── phase3-additional-features.md  # Phase 3: 추가 기능 전환 ✅
    ├── phase4-security.md             # Phase 4: 보안 강화 ⏭️
    └── phase5-deployment.md           # Phase 5-6: 모니터링 및 배포 ⏭️
```

## 🎯 목적별 문서 찾기

### 빠르게 시작하고 싶다면

1. **[OVERVIEW.md](./OVERVIEW.md)** - 5분 안에 전체 상황 파악
2. **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - Server Actions 사용법

### 작업을 진행하고 싶다면

1. **[CHECKLIST.md](./CHECKLIST.md)** - 현재 해야 할 일 확인
2. **[phase2-testing.md](./phases/phase2-testing.md)** - 다음 단계 (테스트)

### 완료된 작업을 확인하고 싶다면

1. **[phase1-mvp.md](./phases/phase1-mvp.md)** - Phase 1 완료 내역
2. **[phase3-additional-features.md](./phases/phase3-additional-features.md)** - Phase 3 완료 내역

### 보안을 강화하고 싶다면

1. **[phase4-security.md](./phases/phase4-security.md)** - RLS, 감사 로그, Rate Limiting

### 배포를 준비하고 싶다면

1. **[phase5-deployment.md](./phases/phase5-deployment.md)** - 배포 가이드

---

## 📖 문서 상세 설명

### [OVERVIEW.md](./OVERVIEW.md)

**내용**:
- 마이그레이션 목표 및 개요
- 현재 진행 상황 (Phase별)
- 완료된 Server Actions 목록
- 수정된 컴포넌트 목록
- 빠른 시작 가이드

**읽는 데 걸리는 시간**: 5분

**추천 대상**:
- 프로젝트에 처음 참여하는 개발자
- 전체 상황을 빠르게 파악하고 싶은 경우

---

### [CHECKLIST.md](./CHECKLIST.md)

**내용**:
- Phase 1-7 전체 체크리스트
- 기능 테스트 항목
- 성능 테스트 항목
- 에러 핸들링 테스트 항목
- 배포 준비 항목

**읽는 데 걸리는 시간**: 10분 (처음), 1분 (일상적 확인)

**추천 대상**:
- 작업 진행 상황을 확인하고 싶은 경우
- 다음에 해야 할 일을 찾는 경우

---

### [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)

**내용**:
- 생성된 Server Actions 목록 (함수, 권한, 설명)
- 사용 예시 코드
- 트러블슈팅 가이드
- 성능 목표

**읽는 데 걸리는 시간**: 3분

**추천 대상**:
- Server Action을 사용해야 하는 개발자
- 빠른 레퍼런스가 필요한 경우

---

### [phase1-mvp.md](./phases/phase1-mvp.md)

**내용**:
- Phase 1 완료 내역
- 생성된 Server Actions (TODO 템플릿, 학생, TODO)
- 수정된 컴포넌트
- 기술적 변경사항 (Before/After)
- Repository 패턴 유지 방법
- 보안 개선사항

**읽는 데 걸리는 시간**: 10분

**추천 대상**:
- Phase 1에서 무엇을 했는지 알고 싶은 경우
- 같은 패턴으로 새로운 기능을 전환하려는 경우

---

### [phase2-testing.md](./phases/phase2-testing.md)

**내용**:
- 환경 설정 가이드
- 기능 테스트 체크리스트 (8개 도메인)
- 성능 테스트 가이드
- 권한 테스트 가이드
- 에러 핸들링 테스트 가이드

**읽는 데 걸리는 시간**: 15분 (읽기), 2-4시간 (실행)

**추천 대상**:
- 테스트를 진행하려는 경우
- QA 담당자
- 배포 전 검증이 필요한 경우

---

### [phase3-additional-features.md](./phases/phase3-additional-features.md)

**내용**:
- Phase 3 완료 내역
- 생성된 Server Actions (상담, 출석, 성적, 보호자)
- 수정된 컴포넌트
- 트랜잭션 처리 방법
- Bulk 작업 최적화

**읽는 데 걸리는 시간**: 10분

**추천 대상**:
- Phase 3에서 무엇을 했는지 알고 싶은 경우
- Bulk 작업이나 트랜잭션 처리 방법을 참고하고 싶은 경우

---

### [phase4-security.md](./phases/phase4-security.md)

**내용**:
- RLS 정책 재검토 (쓰기 정책 제거)
- 감사 로그 시스템 구축
- Rate Limiting 적용 (Upstash Redis)
- 환경변수 검증 강화

**읽는 데 걸리는 시간**: 20분 (읽기), 2-3일 (구현)

**추천 대상**:
- 보안을 강화하고 싶은 경우
- 프로덕션 배포 전 보안 점검이 필요한 경우

---

### [phase5-deployment.md](./phases/phase5-deployment.md)

**내용**:
- Phase 5: 모니터링 및 최적화 (Sentry, 성능 측정)
- Phase 6: 배포 준비 및 실행
- Staging 배포 가이드
- Production 배포 가이드
- 롤백 시나리오

**읽는 데 걸리는 시간**: 15분 (읽기), 1일 (배포)

**추천 대상**:
- 배포를 준비하는 경우
- DevOps 담당자
- 롤백 계획이 필요한 경우

---

## 🗓️ Phase별 읽기 순서

### Phase 1 완료 후
1. ✅ phase1-mvp.md (완료 확인)
2. → CHECKLIST.md (Phase 2 확인)

### Phase 2 시작 전
1. phase2-testing.md (테스트 계획)
2. QUICK_REFERENCE.md (Server Actions 사용법)

### Phase 3 완료 후
1. ✅ phase3-additional-features.md (완료 확인)
2. → CHECKLIST.md (Phase 4 확인)

### Phase 4 시작 전
1. phase4-security.md (보안 강화 계획)

### 배포 준비 시
1. CHECKLIST.md (Phase 6 체크리스트)
2. phase5-deployment.md (배포 가이드)

---

## 📝 문서 유지보수

### 문서 업데이트 시점

- **OVERVIEW.md**: Phase 완료 시마다
- **CHECKLIST.md**: 작업 완료 시마다 (체크박스 업데이트)
- **QUICK_REFERENCE.md**: Server Action 추가 시
- **phase*.md**: 해당 Phase 완료 시

### 문서 작성 규칙

- 모든 코드 예시는 실제 동작하는 코드 사용
- 체크리스트는 구체적이고 실행 가능한 항목으로
- 예상 소요 시간 명시
- 관련 문서 링크 포함

---

## 🔗 관련 문서

### 프로젝트 전체 문서

- [CLAUDE.md](../../CLAUDE.md) - 프로젝트 아키텍처 가이드
- [STYLEGUIDE.md](../STYLEGUIDE.md) - 코딩 스타일 가이드
- [DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md) - 배포 가이드

### 개발 로그

- [docs/dev_logs/](../dev_logs/) - 개발 로그 아카이브
- [docs/dev_logs/MIGRATION_CHECKLIST.md](../dev_logs/MIGRATION_CHECKLIST.md) - 구 체크리스트 (참고용)
- [docs/dev_logs/MIGRATION_SUMMARY.md](../dev_logs/MIGRATION_SUMMARY.md) - Phase 1 원본 문서

---

## 💬 피드백

문서에 대한 피드백이나 개선 제안이 있으면:
- GitHub Issues 생성
- 또는 직접 PR 제출

---

**최종 업데이트**: 2025-10-23
**작성자**: Claude Code
**버전**: 1.0.0
