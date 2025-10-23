# Disabled Files Documentation

> **목적**: `.disabled` 확장자가 붙은 파일들의 상태와 향후 처리 계획을 문서화

## 개요

마이그레이션 과정에서 일부 파일들이 `.disabled` 확장자로 임시 비활성화되었습니다.
이 문서는 각 파일의 현재 상태와 재활성화 계획을 명시합니다.

---

## Category 1: TODO 관련 페이지 (5개)

> **상태**: Phase별 마이그레이션 대기 중
> **재활성화 시점**: TODO 기능 완전 마이그레이션 완료 후

### 파일 목록

| 파일 | 비활성화 사유 | 재활성화 조건 |
|------|---------------|---------------|
| `src/app/(dashboard)/todos/page.tsx.disabled` | Client Factory 사용 | TODO 조회 Server Actions 완료 |
| `src/app/(dashboard)/todos/planner/page.tsx.disabled` | Client Factory 사용 | TODO 플래너 Server Actions 완료 |
| `src/app/(dashboard)/todos/verify/page.tsx.disabled` | Client Factory 사용 | TODO 검증 Server Actions 완료 |
| `src/app/(dashboard)/todos/new/page.tsx.disabled` | Client Factory 사용 | TODO 생성 UI 재검토 |
| `src/app/(dashboard)/todos/templates/page.tsx.disabled` | Client Factory 사용 | TODO 템플릿 Server Actions 완료 |

### 재활성화 우선순위

1. **높음**: `todos/page.tsx` - 메인 TODO 페이지
2. **중간**: `todos/planner/page.tsx`, `todos/verify/page.tsx` - 핵심 기능
3. **낮음**: `todos/new/page.tsx`, `todos/templates/page.tsx` - 부가 기능

### 관련 마이그레이션

- ✅ `actions/todos.ts` - Server Actions 완료 (2025-10-24)
- ⏳ TODO 페이지 UI 마이그레이션 - 대기 중

---

## Category 2: 클래스 관리 페이지 (1개)

> **상태**: Phase 4 마이그레이션 대기 중
> **재활성화 시점**: 클래스 관리 Server Actions 완료 후

### 파일 목록

| 파일 | 비활성화 사유 | 재활성화 조건 |
|------|---------------|---------------|
| `src/app/(dashboard)/classes/page.tsx.disabled` | Client Factory 사용 (`createGetClassesWithDetailsUseCase`) | 클래스 조회 Server Actions 완료 |

### 관련 마이그레이션

- ⏳ `actions/classes.ts` - 미작성
- ⏳ Phase 4: 클래스 및 수업 관리 - 대기 중

---

## Category 3: 보호자 관리 페이지 (1개)

> **상태**: Phase별 마이그레이션 대기 중
> **재활성화 시점**: 보호자 관리 UI 재검토 후

### 파일 목록

| 파일 | 비활성화 사유 | 재활성화 조건 |
|------|---------------|---------------|
| `src/app/(dashboard)/guardians/page.tsx.disabled` | 기능 재검토 필요 | 보호자 관리 UI/UX 재설계 |

### 관련 마이그레이션

- ✅ `actions/guardians.ts` - Server Actions 완료
- ⏳ 보호자 관리 페이지 UI 재검토 - 대기 중

---

## Category 4: 키오스크 기능 (2개)

> **상태**: 기능 재검토 중
> **재활성화 시점**: 키오스크 기능 요구사항 확정 후

### 파일 목록

| 파일 | 비활성화 사유 | 재활성화 조건 |
|------|---------------|---------------|
| `src/app/(dashboard)/kiosk/page.tsx.disabled` | 기능 재검토 필요 | 키오스크 대시보드 요구사항 확정 |
| `src/app/kiosk/login/page.tsx.disabled` | 기능 재검토 필요 | 키오스크 로그인 플로우 재설계 |

### 관련 마이그레이션

- ✅ `actions/kiosk.ts` - Server Actions 완료
- ⏳ 키오스크 UI/UX 재검토 - 대기 중

---

## Category 5: 출석 관리 페이지 (1개)

> **상태**: 기능 재검토 중
> **재활성화 시점**: 출석 관리 페이지 요구사항 확정 후

### 파일 목록

| 파일 | 비활성화 사유 | 재활성화 조건 |
|------|---------------|---------------|
| `src/app/(dashboard)/attendance/page.tsx.disabled` | 기능 재검토 필요 | 출석 관리 페이지 UI 재설계 |

### 관련 마이그레이션

- ✅ `actions/attendance.ts` - Server Actions 완료
- ⏳ 출석 관리 페이지 재검토 - 대기 중

---

## Category 6: 학생 상세 컴포넌트 (7개)

> **상태**: 기능별 점진적 재활성화 예정
> **재활성화 시점**: 각 기능별 Server Actions 완료 후

### 파일 목록

| 파일 | 비활성화 사유 | 재활성화 조건 |
|------|---------------|---------------|
| `src/components/features/students/detail/ActivityTab.tsx.disabled` | Client Factory 사용 | 활동 타임라인 Server Actions 완료 |
| `src/components/features/students/detail/LearningStatusTab.tsx.disabled` | Client Factory 사용 | 학습 상태 Server Actions 완료 |
| `src/components/features/students/detail/ClassProgressCard.tsx.disabled` | Client Factory 사용 | 수업 진도 Server Actions 완료 |
| `src/components/features/students/detail/SendReportDialog.tsx.disabled` | 메시징 인프라 미구현 | PDF 생성 + 메시징 시스템 구현 |
| `src/components/features/students/manage-classes-dialog.tsx.disabled` | Client Factory 사용 | 수강반 관리 Server Actions 완료 |
| `src/components/features/students/activity-timeline.tsx.disabled` | Client Factory 사용 | 활동 타임라인 Server Actions 완료 |
| `src/components/features/attendance/contact-guardian-dialog.tsx.disabled` | Client Factory 사용 | 보호자 연락 기능 재검토 |
| `src/components/features/guardians/guardian-list.tsx.disabled` | Client Factory 사용 | 보호자 목록 Server Actions 완료 |

### 재활성화 우선순위

1. **높음**:
   - `manage-classes-dialog.tsx` - 핵심 기능
   - `ClassProgressCard.tsx` - 자주 사용

2. **중간**:
   - `ActivityTab.tsx` - 학생 상세 탭
   - `activity-timeline.tsx` - 활동 이력
   - `guardian-list.tsx` - 보호자 관리

3. **낮음**:
   - `LearningStatusTab.tsx` - 부가 기능
   - `SendReportDialog.tsx` - 메시징 인프라 필요
   - `contact-guardian-dialog.tsx` - 메시징 인프라 필요

---

## 삭제된 파일 (완료)

다음 파일들은 더 이상 필요하지 않아 영구 삭제되었습니다:

- ✅ `src/app/actions/reports.ts.disabled` (2025-10-24) - 새 버전 `reports.ts` 생성됨
- ✅ `src/core/application/use-cases/report/SendReportUseCase.ts.disabled` (2025-10-24) - Use Case 패턴 제거
- ✅ `src/components/features/students/add-student-wizard.tsx.disabled` (2025-10-24) - `add-student-wizard/` 디렉토리로 대체

---

## 재활성화 프로세스

각 disabled 파일을 재활성화할 때 다음 단계를 따릅니다:

### 1. 사전 검토
- [ ] Server Actions 구현 완료 확인
- [ ] 의존성 제거 확인 (Client Factory, Use Cases)
- [ ] RLS 정책 적용 확인

### 2. 파일 복구
```bash
mv path/to/file.tsx.disabled path/to/file.tsx
```

### 3. 코드 마이그레이션
- [ ] Client Factory → Server Actions 변경
- [ ] Use Case 호출 → Server Actions 호출 변경
- [ ] 타입 import 경로 수정

### 4. 테스트
- [ ] TypeScript 타입 체크
- [ ] 빌드 테스트
- [ ] 기능 동작 테스트

### 5. 문서 업데이트
- [ ] 이 문서에서 해당 항목 제거
- [ ] MIGRATION_ROADMAP.md 업데이트

---

## 참고 문서

- [마이그레이션 로드맵](./migration/MIGRATION_ROADMAP.md)
- [Server Actions 가이드](./migration/QUICK_REFERENCE.md)
- [폴더 구조 표준](./FOLDER_STRUCTURE.md)

---

**최종 업데이트**: 2025-10-24
**담당자**: Migration Team
**상태**: 19개 파일 disabled, 3개 파일 삭제 완료
