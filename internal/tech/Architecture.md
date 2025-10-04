# Acadesk Architecture

## 1. Overview
Acadesk는 학원 관리 SaaS 플랫폼으로, 멀티 테넌트 환경에서 **출석, 성적, 리포트** 관리 기능을 제공합니다.  
아키텍처는 `Next.js + Supabase + Vercel + Cloudflare` 기반으로 구성되며, **RLS(Row Level Security)** 를 통해 학원(tenant) 간 데이터가 완전히 분리됩니다.

---

## 2. System Architecture

### Frontend
- **Framework**: Next.js (App Router, React Server Components)
- **UI**: TailwindCSS + shadcn/ui
- **Visualization**: Recharts (성적/출석 그래프)
- **Hosting**: Vercel (서버리스 배포, Preview 환경 지원)
- **Auth Integration**: Supabase Auth (JWT 기반)

### Backend
- **Database**: Supabase (PostgreSQL 15)
- **Auth**: Supabase Auth (이메일 매직링크 → 추후 Google/Apple 추가)
- **Edge Functions**: 알림 발송, 리포트 자동 생성, PDF 변환
- **RLS Policies**: `tenant_id` 기반 데이터 접근 제어

### Infra
- **Hosting**: 
  - Frontend → Vercel
  - Database/Edge → Supabase Cloud
- **DNS/WAF**: Cloudflare
- **CI/CD**: GitHub Actions → Vercel 자동 배포

---

## 3. Database Design

### Core Tables
- `tenants`: 학원(테넌트) 정보
- `users`: 원장, 강사, 조교, 학부모, 학생 사용자
- `students`: 학생 상세 정보
- `classes`: 반/수업
- `class_enrollments`: 학생의 수강 등록
- `attendance_sessions`: 출석 세션 (수업별 날짜/시간)
- `attendance`: 출석 기록
- `exams`: 시험
- `exam_scores`: 시험 점수
- `reports`: 리포트 (주간/월간/커스텀)

### Design Principles
- 모든 테이블은 `tenant_id` 컬럼 보유
- `created_at`, `updated_at`, `deleted_at` 표준 타임스탬프 필드 유지
- `JSONB` 필드(`settings`, `meta`)를 활용해 유연한 확장 가능
- `UNIQUE` 제약조건으로 중복 방지 (예: `class_id + student_id`)

---

## 4. Security Model

### Row Level Security (RLS)
- 모든 테이블은 `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`
- Helper Functions:
  - `public.get_current_tenant_id()` → 현재 유저의 테넌트 ID 반환
  - `public.get_current_user_role()` → 현재 유저의 역할 반환
- Policies 예시:
  - **users**: 동일 테넌트만 SELECT 가능, `owner/instructor`만 INSERT 가능
  - **students**: 동일 테넌트만 SELECT 가능, `assistant` 이상만 관리 가능
  - **reports**: `parent`는 자신의 자녀 학생 데이터만 접근 가능

### Authentication
- Supabase JWT → DB 레벨 RLS 통과
- Auth UID = users.id 매핑

---

## 5. Deployment Strategy

### Environments
- **Development**
  - Preview Deployments (Vercel Preview)
  - 샘플 데이터 삽입
- **Staging**
  - Production DB와 분리된 Supabase Project
  - 실제 운영 전 최종 검증
- **Production**
  - Custom domain + SSL (Cloudflare)
  - Strict RLS / 최소 권한 설정

### CI/CD
- GitHub Actions → Lint/Test → Deploy to Vercel
- DB Migration은 `internal/migrations/` SQL 파일 관리
- 자동 백업: Supabase Daily Snapshot + GitHub Release 업로드

---

## 6. Roadmap (High Level)
1. **MVP**: 출석, 시험, 리포트 관리 (강사/원장 대시보드)
2. **권한 모델 확장**: 강사 초대, 학부모/조교 접근 제어
3. **운영 효율화**: Edge Functions 기반 알림/리포트 자동화
4. **Superadmin 모듈**: 테넌트 관리, 결제 연동, 모니터링
5. **고도화**: CI/CD 강화, 모바일 최적화, 성능 튜닝

---

## 7. Future Considerations
- **PII Encryption**: 전화번호/주소 암호화 (pgcrypto + KMS)
- **Superadmin**: multi-tenant SaaS 운영 모듈
- **Audit Logs**: 모든 데이터 변경 기록 (GDPR/KISA 대응)
- **Billing**: Stripe 구독 모델 연동