# 🔄 권한 데이터 경로 전환 체크리스트

## ✅ Phase 1: MVP 핵심 기능 전환 (완료)

### 인프라
- [x] service_role 클라이언트 헬퍼 생성 (`src/lib/supabase/service-role.ts`)
- [x] 권한 검증 유틸리티 생성 (`src/lib/auth/verify-permission.ts`)
- [x] TypeScript 타입 체크 통과

### Server Actions
- [x] TODO 템플릿 관리 (`src/app/actions/todo-templates.ts`)
- [x] 학생 관리 (`src/app/actions/students.ts`)
- [x] TODO 관리 (`src/app/actions/todos.ts`)

### 클라이언트 컴포넌트
- [x] TODO 템플릿 페이지 (생성/수정/삭제)
- [x] AddStudentWizard (학생 생성)
- [x] TODO 플래너 (주간 과제 게시)
- [x] TODO 검증 (일괄 검증/반려)

---

## 🧪 Phase 2: 테스트 및 검증 (필수)

### 로컬 환경 설정
- [ ] Supabase 로컬 인스턴스 시작
  ```bash
  supabase start
  supabase status
  ```
- [ ] 환경변수 확인
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` 존재 확인
  - [ ] `.env.local` 파일 검증
  ```bash
  pnpm env:validate
  ```

### 기능 테스트 (Manual)
#### TODO 템플릿
- [ ] 템플릿 생성 (필수 필드만)
- [ ] 템플릿 생성 (모든 필드)
- [ ] 템플릿 수정
- [ ] 템플릿 활성화/비활성화 토글
- [ ] 템플릿 삭제
- [ ] 권한 없는 사용자 차단 확인

#### 학생 관리
- [ ] 학생 생성 (보호자 신규 등록)
- [ ] 학생 생성 (보호자 기존 선택)
- [ ] 학생 생성 (보호자 건너뛰기)
- [ ] 학생 정보 수정
- [ ] 학생 삭제 (소프트 삭제 확인)
- [ ] 중복 학생 코드 처리 확인

#### TODO 플래너
- [ ] 단일 학생에게 TODO 추가
- [ ] 여러 학생에게 TODO 일괄 추가 (템플릿 사용)
- [ ] 여러 학생에게 TODO 일괄 추가 (수동 입력)
- [ ] 주간 과제 게시 (5명 이하)
- [ ] 주간 과제 게시 (20명 이상)
- [ ] 계획 복사 기능

#### TODO 검증
- [ ] 단일 TODO 검증
- [ ] 일괄 TODO 검증 (10개 이상)
- [ ] TODO 반려 (피드백 포함)
- [ ] 완료되지 않은 TODO 검증 차단 확인
- [ ] 이미 검증된 TODO 재검증 차단 확인

### 성능 테스트
- [ ] 대량 TODO 생성 (100개+)
  - 예상 시간: 5초 이내
- [ ] 일괄 검증 (50개+)
  - 예상 시간: 3초 이내
- [ ] 템플릿 목록 로딩 (100개+)
  - 예상 시간: 1초 이내

### 에러 핸들링 테스트
- [ ] 네트워크 끊김 시나리오
- [ ] 권한 없는 사용자 접근
- [ ] 잘못된 입력값 (Zod validation)
- [ ] 존재하지 않는 리소스 접근
- [ ] 중복 데이터 생성 시도

---

## 🔧 Phase 3: 남은 기능 전환 (선택)

### 우선순위 High (1-2일)
- [ ] **상담 기록** (`ConsultationTab.tsx`)
  - [ ] Server Action 생성 (`src/app/actions/consultations.ts`)
  - [ ] ConsultationTab 컴포넌트 수정
  - [ ] 테스트

### 우선순위 Medium (3-5일)
- [ ] **출석 관리** (`attendance/`)
  - [ ] Server Action 생성 (`src/app/actions/attendance.ts`)
  - [ ] 출석 페이지 수정
  - [ ] RPC → pg 트랜잭션 전환 고려

- [ ] **성적 관리** (`grades/`)
  - [ ] Server Action 생성 (`src/app/actions/grades.ts`)
  - [ ] 성적 입력 페이지 수정
  - [ ] Bulk entry 트랜잭션 처리

- [ ] **결제/청구** (`payments/`)
  - [ ] Server Action 생성 (`src/app/actions/payments.ts`)
  - [ ] 청구서 생성 다이얼로그 수정
  - [ ] 결제 처리 다이얼로그 수정

### 우선순위 Low (필요시)
- [ ] **보호자 관리** (`guardians/`)
- [ ] **리포트 관리** (`reports/`)
- [ ] **도서 대출** (`library/`)
- [ ] **캘린더** (`calendar/`)
- [ ] **설정** (`settings/`)

---

## 🔒 Phase 4: 보안 강화 (권장)

### RLS 정책 재검토
- [ ] 현재 RLS 정책 문서화
  ```bash
  supabase db dump --schema public > current_rls.sql
  ```
- [ ] 쓰기 RLS 정책 비활성화 검토
  - [ ] `todo_templates` 테이블
  - [ ] `students` 테이블
  - [ ] `student_todos` 테이블
  - [ ] `consultations` 테이블
- [ ] 읽기 RLS 정책 유지 (tenant_id 격리)
- [ ] 새 정책 마이그레이션 작성
- [ ] 테스트 환경에서 검증

### 감사 로그 시스템
- [ ] 감사 로그 테이블 생성
  ```sql
  CREATE TABLE audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    user_id uuid NOT NULL,
    action text NOT NULL,
    resource_type text NOT NULL,
    resource_id text,
    metadata jsonb,
    created_at timestamptz DEFAULT now()
  );
  ```
- [ ] Server Action에 로깅 추가
  - [ ] TODO 템플릿 CUD
  - [ ] 학생 CUD
  - [ ] TODO CUD
- [ ] 로그 조회 UI 개발 (선택)

### Rate Limiting
- [ ] Rate Limit 라이브러리 설치
  ```bash
  pnpm add @upstash/ratelimit @upstash/redis
  ```
- [ ] Rate Limit 미들웨어 구현
  - [ ] IP 기반 제한 (익명 사용자)
  - [ ] 사용자 ID 기반 제한 (인증된 사용자)
- [ ] Server Action에 적용
  - [ ] 템플릿 생성: 60req/min
  - [ ] 학생 생성: 30req/min
  - [ ] TODO 일괄 생성: 10req/min

### 환경변수 검증
- [ ] Production 환경변수 설정
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` (Production 전용 키)
  - [ ] `NEXT_PUBLIC_SUPABASE_URL` (Production URL)
- [ ] Staging 환경변수 설정
- [ ] CI/CD 파이프라인에 검증 추가

---

## 📊 Phase 5: 모니터링 및 최적화 (선택)

### 성능 모니터링
- [ ] Sentry 통합 (에러 추적)
  ```bash
  pnpm add @sentry/nextjs
  ```
- [ ] Server Action 응답 시간 측정
- [ ] 느린 쿼리 식별 및 최적화
- [ ] 데이터베이스 인덱스 추가

### 사용자 피드백
- [ ] 베타 테스터 그룹 선정
- [ ] 피드백 수집 채널 구축
- [ ] 버그 리포트 양식 작성

---

## 🚀 Phase 6: 배포 준비

### Pre-Deployment 체크
- [ ] 모든 테스트 통과 확인
- [ ] TypeScript 컴파일 에러 없음
  ```bash
  pnpm type-check
  pnpm lint
  pnpm build
  ```
- [ ] 환경변수 재확인
- [ ] 데이터베이스 마이그레이션 준비
- [ ] 롤백 계획 수립

### Staging 배포
- [ ] Staging 환경에 배포
- [ ] Smoke 테스트 실행
- [ ] 주요 기능 수동 테스트
- [ ] 성능 측정

### Production 배포
- [ ] 배포 시간 공지 (점검 시간)
- [ ] 데이터베이스 백업
- [ ] Production 배포 실행
- [ ] 배포 후 모니터링 (1시간)
- [ ] 사용자 피드백 모니터링 (24시간)

### Post-Deployment
- [ ] 배포 로그 문서화
- [ ] 발견된 이슈 트래킹
- [ ] 핫픽스 준비 (필요시)

---

## 📚 Phase 7: 문서화 (권장)

### 개발자 문서
- [x] 마이그레이션 요약 (`MIGRATION_SUMMARY.md`)
- [ ] API 문서 작성 (Server Actions)
- [ ] 아키텍처 다이어그램 업데이트
- [ ] 에러 코드 가이드

### 팀 공유
- [ ] 마이그레이션 회고 미팅
- [ ] 베스트 프랙티스 공유
- [ ] 다음 기능 전환 계획 수립

---

## 🎯 현재 진행 상황

**완료**: Phase 1 (MVP 핵심 기능 전환) ✅
**다음 단계**: Phase 2 (테스트 및 검증) 🔄
**예상 소요 시간**:
- Phase 2: 2-3시간 (필수)
- Phase 3: 1-5일 (선택)
- Phase 4: 2-3일 (권장)

---

## 💡 Tips

### 테스트 우선순위
1. **Critical** (반드시 테스트): 학생 생성, TODO 생성, 권한 검증
2. **High** (권장 테스트): 삭제 기능, 에러 핸들링
3. **Medium** (선택 테스트): 성능, 엣지 케이스

### 빠른 배포를 위한 최소 체크
```bash
# 1. 타입 체크
pnpm type-check

# 2. 빌드 확인
pnpm build

# 3. 주요 기능 3개만 수동 테스트
#    - 학생 생성
#    - TODO 템플릿 생성
#    - TODO 플래너 게시
```

### 롤백 계획
```bash
# Git으로 이전 커밋으로 되돌리기
git revert HEAD
git push origin main

# 또는 특정 커밋으로
git reset --hard <commit-hash>
git push --force origin main
```

---

**마지막 업데이트**: 2025-10-23
**다음 리뷰**: Phase 2 완료 후
