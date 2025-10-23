# 🔄 권한 데이터 경로 전환 마이그레이션

> **마이그레이션 개요 및 전체 진행 상황**

## 📋 개요

Acadesk Web의 데이터 쓰기 작업을 **클라이언트 직접 호출**에서 **service_role 기반 Server Actions**로 전환하는 프로젝트입니다.

### 목표

- ✅ **보안 강화**: 클라이언트는 읽기 전용, 쓰기는 service_role로만 수행
- ✅ **권한 검증**: 모든 CUD 작업에 서버 사이드 권한 검증 추가
- ✅ **타입 안전성**: Zod 스키마로 입력값 자동 검증
- ✅ **일관된 패턴**: 모든 Server Action이 동일한 구조 사용

## 📊 현재 진행 상황

### ✅ 완료된 작업

| Phase | 설명 | 상태 | 문서 |
|-------|------|------|------|
| **Phase 1** | MVP 핵심 기능 전환 | ✅ 완료 | [phase1-mvp.md](./phases/phase1-mvp.md) |
| **Phase 3** | 추가 기능 전환 | ✅ 완료 | [phase3-additional-features.md](./phases/phase3-additional-features.md) |

### 🔄 진행 중인 작업

| Phase | 설명 | 상태 | 우선순위 |
|-------|------|------|---------|
| **Phase 2** | 테스트 및 검증 | 🔄 다음 단계 | **필수** |

### ⏭️ 예정된 작업

| Phase | 설명 | 예상 소요 시간 | 우선순위 |
|-------|------|---------------|---------|
| **Phase 4** | 보안 강화 (RLS 정책 재검토) | 2-3일 | 권장 |
| **Phase 5** | 모니터링 및 최적화 | 1-2일 | 선택 |
| **Phase 6** | 배포 준비 | 1일 | 필수 |

## 📁 문서 구조

```
docs/migration/
├── OVERVIEW.md                        # 📄 이 문서 - 마이그레이션 개요
├── CHECKLIST.md                       # ✅ Phase별 체크리스트
├── QUICK_REFERENCE.md                 # 🚀 Server Actions 사용 가이드
└── phases/
    ├── phase1-mvp.md                  # Phase 1 상세 문서
    ├── phase2-testing.md              # Phase 2 테스트 가이드
    ├── phase3-additional-features.md  # Phase 3 상세 문서
    ├── phase4-security.md             # Phase 4 보안 강화
    └── phase5-deployment.md           # Phase 5-6 배포
```

## 🎯 마이그레이션 완료 현황

### ✅ 생성된 Server Actions (10개)

| 파일 | 함수 개수 | 도메인 | 상태 |
|------|-----------|--------|------|
| `approve-user.ts` | 1 | 사용자 승인 | ✅ |
| `attendance.ts` | 3 | 출석 관리 | ✅ |
| `consultations.ts` | 1 | 상담 기록 | ✅ |
| `grades.ts` | 3 | 성적 관리 | ✅ |
| `guardians.ts` | 3 | 보호자 관리 | ✅ |
| `kiosk.ts` | 1 | 키오스크 | ✅ |
| `logout.ts` | 1 | 로그아웃 | ✅ |
| `students.ts` | 3+ | 학생 관리 | ✅ |
| `todo-templates.ts` | 4 | TODO 템플릿 | ✅ |
| `todos.ts` | 4+ | TODO 관리 | ✅ |

**총 24개 이상의 Server Action 함수 생성**

### 📝 수정된 컴포넌트 (10개+)

1. **Phase 1 (MVP)**:
   - TODO 템플릿 페이지
   - AddStudentWizard
   - TODO 플래너
   - TODO 검증

2. **Phase 3 (추가 기능)**:
   - ConsultationTab.tsx
   - AttendanceList.tsx
   - attendance-check-dialog.tsx
   - grades/page.tsx
   - grades/exams/[examId]/bulk-entry/page.tsx
   - guardians/new/page.tsx

## 🚀 빠른 시작

### 1. 개발 환경 설정

```bash
# Supabase 로컬 인스턴스 시작
supabase start

# 환경변수 확인
pnpm env:validate

# 타입 체크
pnpm type-check

# 개발 서버 실행
pnpm dev
```

### 2. Server Action 사용 예시

```typescript
// Server Action 임포트
import { createConsultation } from '@/app/actions/consultations'

// 사용 (Client Component)
const result = await createConsultation({
  student_id: 'uuid',
  consultation_date: '2025-10-23',
  consultation_type: '대면',
  content: '학습 태도가 좋아졌습니다.',
})

if (!result.success) {
  console.error(result.error)
}
```

더 많은 예시는 [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)를 참조하세요.

## 📖 주요 문서

| 문서 | 설명 |
|------|------|
| [CHECKLIST.md](./CHECKLIST.md) | Phase별 체크리스트 및 테스트 항목 |
| [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) | Server Actions 사용 가이드 |
| [phase1-mvp.md](./phases/phase1-mvp.md) | Phase 1 완료 요약 |
| [phase3-additional-features.md](./phases/phase3-additional-features.md) | Phase 3 완료 요약 |

## 🔍 다음 단계

### Phase 2: 테스트 및 검증 (예상 2-4시간)

1. **기능 테스트** (필수):
   - [ ] 상담 기록 생성 및 조회
   - [ ] 출석 세션 생성 및 일괄 저장
   - [ ] 성적 개별/일괄 입력
   - [ ] 보호자 생성 및 학생 연결

2. **권한 테스트** (필수):
   - [ ] instructor 권한 검증
   - [ ] staff 권한 검증
   - [ ] 권한 없는 사용자 차단

3. **에러 핸들링 테스트** (권장):
   - [ ] 잘못된 입력값 (Zod validation)
   - [ ] 존재하지 않는 리소스

자세한 내용은 [CHECKLIST.md](./CHECKLIST.md)의 Phase 2 섹션을 참조하세요.

## 💡 Tips

### 빠른 테스트를 위한 최소 체크

```bash
# 1. 타입 체크
pnpm type-check

# 2. 빌드 확인
pnpm build

# 3. 주요 기능 3개만 수동 테스트
#    - 학생 생성
#    - TODO 템플릿 생성
#    - 상담 기록 생성
```

### 트러블슈팅

**권한 에러**
```
Error: 이 작업을 수행할 권한이 없습니다
```
→ `verifyStaff()` 또는 `verifyRole()` 통과 필요

**Zod 검증 에러**
```
Error: 유효한 학생 ID가 아닙니다
```
→ UUID 형식 확인

**타입 에러**
```
Type 'string | undefined' is not assignable to type 'string'
```
→ `|| null` 또는 `.optional()` 사용

## 📚 관련 문서

- [CLAUDE.md](../../CLAUDE.md) - 프로젝트 전체 아키텍처 가이드
- [docs/STYLEGUIDE.md](../STYLEGUIDE.md) - 코딩 스타일 가이드
- [docs/dev_logs/](../dev_logs/) - 개발 로그

---

**최종 업데이트**: 2025-10-23
**작성자**: Claude Code
**다음 리뷰**: Phase 2 완료 후
