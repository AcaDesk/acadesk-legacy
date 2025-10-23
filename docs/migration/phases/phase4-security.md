# Phase 4: 보안 강화 🔒

> **RLS 정책 재검토, 감사 로그, Rate Limiting**

## 📋 개요

**예상 소요 시간**: 2-3일
**우선순위**: 권장 (프로덕션 환경에서 강력히 권장)

## 🎯 목표

- RLS 정책 최적화 (읽기 전용으로 전환)
- 감사 로그 시스템 구축
- Rate Limiting 적용
- 환경변수 검증 강화

---

## 1. RLS 정책 재검토

### 현재 상황

모든 테이블에 읽기/쓰기 RLS 정책이 활성화되어 있지만, 쓰기 작업은 이제 **service_role**로만 진행됩니다.

### 제안: 쓰기 RLS 정책 비활성화

```sql
-- 1. 현재 RLS 정책 백업
-- supabase db dump --schema public > backup_rls_policies.sql

-- 2. 쓰기 RLS 정책 비활성화 (읽기만 유지)
DROP POLICY IF EXISTS "Students are insertable by staff" ON students;
DROP POLICY IF EXISTS "Students are updatable by staff" ON students;
DROP POLICY IF EXISTS "Students are deletable by owner" ON students;

DROP POLICY IF EXISTS "Todo templates are insertable by staff" ON todo_templates;
DROP POLICY IF EXISTS "Todo templates are updatable by staff" ON todo_templates;
DROP POLICY IF EXISTS "Todo templates are deletable by staff" ON todo_templates;

-- 3. 읽기 RLS 정책은 유지 (tenant_id 격리)
-- (이미 존재하는 정책)
CREATE POLICY "Students are viewable by tenant members"
ON students FOR SELECT
USING (tenant_id = get_current_tenant_id());
```

### 마이그레이션 파일 생성

```bash
supabase migration new remove_write_rls_policies
```

`supabase/migrations/YYYYMMDDNNNNNN_remove_write_rls_policies.sql`:

```sql
-- Phase 4: RLS 정책 재검토 - 쓰기 정책 제거

-- students 테이블
DROP POLICY IF EXISTS "Students are insertable by staff" ON students;
DROP POLICY IF EXISTS "Students are updatable by staff" ON students;
DROP POLICY IF EXISTS "Students are deletable by owner" ON students;

-- todo_templates 테이블
DROP POLICY IF EXISTS "Todo templates are insertable by staff" ON todo_templates;
DROP POLICY IF EXISTS "Todo templates are updatable by staff" ON todo_templates;
DROP POLICY IF EXISTS "Todo templates are deletable by staff" ON todo_templates;

-- student_todos 테이블
DROP POLICY IF EXISTS "Student todos are insertable by staff" ON student_todos;
DROP POLICY IF EXISTS "Student todos are updatable by instructor" ON student_todos;
DROP POLICY IF EXISTS "Student todos are deletable by staff" ON student_todos;

-- consultations 테이블
DROP POLICY IF EXISTS "Consultations are insertable by instructor" ON consultations;
DROP POLICY IF EXISTS "Consultations are updatable by instructor" ON consultations;
DROP POLICY IF EXISTS "Consultations are deletable by instructor" ON consultations;

-- attendance 테이블
DROP POLICY IF EXISTS "Attendance is insertable by staff" ON attendance;
DROP POLICY IF EXISTS "Attendance is updatable by staff" ON attendance;
DROP POLICY IF EXISTS "Attendance is deletable by staff" ON attendance;

-- exam_scores 테이블
DROP POLICY IF EXISTS "Exam scores are insertable by staff" ON exam_scores;
DROP POLICY IF EXISTS "Exam scores are updatable by staff" ON exam_scores;
DROP POLICY IF EXISTS "Exam scores are deletable by staff" ON exam_scores;

-- guardians 테이블
DROP POLICY IF EXISTS "Guardians are insertable by staff" ON guardians;
DROP POLICY IF EXISTS "Guardians are updatable by staff" ON guardians;
DROP POLICY IF EXISTS "Guardians are deletable by staff" ON guardians;

-- 읽기 정책은 모두 유지
-- (tenant_id 격리를 위해 필수)

COMMENT ON TABLE students IS 'RLS: 읽기 전용. 쓰기는 service_role via Server Actions';
COMMENT ON TABLE todo_templates IS 'RLS: 읽기 전용. 쓰기는 service_role via Server Actions';
COMMENT ON TABLE student_todos IS 'RLS: 읽기 전용. 쓰기는 service_role via Server Actions';
COMMENT ON TABLE consultations IS 'RLS: 읽기 전용. 쓰기는 service_role via Server Actions';
COMMENT ON TABLE attendance IS 'RLS: 읽기 전용. 쓰기는 service_role via Server Actions';
COMMENT ON TABLE exam_scores IS 'RLS: 읽기 전용. 쓰기는 service_role via Server Actions';
COMMENT ON TABLE guardians IS 'RLS: 읽기 전용. 쓰기는 service_role via Server Actions';
```

### 테스트

```bash
# 로컬에서 테스트
supabase db reset

# 쓰기 RLS가 제거되었는지 확인
psql -h localhost -p 54322 -U postgres -d postgres -c "\d+ students"
```

### 체크리스트

- [ ] 현재 RLS 정책 문서화
- [ ] 쓰기 RLS 정책 제거 마이그레이션 작성
- [ ] 로컬에서 테스트
- [ ] Staging에서 테스트
- [ ] Production 적용

---

## 2. 감사 로그 시스템

### 테이블 생성

```sql
CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  user_id uuid NOT NULL REFERENCES users(id),
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  metadata jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- 인덱스 추가
CREATE INDEX idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- RLS 정책 (읽기 전용)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Audit logs are viewable by owner"
ON audit_logs FOR SELECT
USING (
  tenant_id = get_current_tenant_id()
  AND get_current_user_role() = 'owner'
);

COMMENT ON TABLE audit_logs IS '감사 로그 - 모든 CUD 작업 기록';
```

### 감사 로그 헬퍼 함수

`src/lib/audit-log.ts`:

```typescript
import { createServiceRoleClient } from '@/lib/supabase/service-role'

interface AuditLogInput {
  userId: string
  tenantId: string
  action: string
  resourceType: string
  resourceId?: string
  metadata?: Record<string, any>
  ipAddress?: string
  userAgent?: string
}

export async function createAuditLog(input: AuditLogInput) {
  const supabase = createServiceRoleClient()

  const { error } = await supabase.from('audit_logs').insert({
    user_id: input.userId,
    tenant_id: input.tenantId,
    action: input.action,
    resource_type: input.resourceType,
    resource_id: input.resourceId,
    metadata: input.metadata,
    ip_address: input.ipAddress,
    user_agent: input.userAgent,
  })

  if (error) {
    console.error('[AuditLog] Failed to create audit log', error)
  }
}
```

### Server Action에 적용

```typescript
// src/app/actions/todo-templates.ts
import { createAuditLog } from '@/lib/audit-log'

export async function deleteTodoTemplate(id: string) {
  const user = await verifyStaff()

  // 기존 로직...
  const result = await repository.delete(id)

  // 감사 로그 추가
  await createAuditLog({
    userId: user.id,
    tenantId: user.tenant_id!,
    action: 'DELETE_TODO_TEMPLATE',
    resourceType: 'todo_template',
    resourceId: id,
    metadata: { title: template.title },
  })

  return { success: true }
}
```

### 적용 대상

- [ ] TODO 템플릿 CUD
- [ ] 학생 CUD
- [ ] TODO CUD
- [ ] 상담 기록 CUD
- [ ] 출석 CUD
- [ ] 성적 CUD
- [ ] 보호자 CUD

### 로그 조회 UI (선택)

추후 `/dashboard/settings/audit-logs` 페이지 구현 고려

---

## 3. Rate Limiting

### 라이브러리 설치

```bash
pnpm add @upstash/ratelimit @upstash/redis
```

### Upstash Redis 설정

1. [Upstash Console](https://console.upstash.com/)에서 Redis 인스턴스 생성
2. `.env.local`에 환경변수 추가:

```bash
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

### Rate Limit 헬퍼 생성

`src/lib/rate-limit.ts`:

```typescript
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// IP 기반 Rate Limit (익명 사용자)
export const rateLimitByIp = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '60 s'), // 60초에 10 요청
  analytics: true,
  prefix: '@upstash/ratelimit/ip',
})

// 사용자 ID 기반 Rate Limit (인증된 사용자)
export const rateLimitByUser = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, '60 s'), // 60초에 60 요청
  analytics: true,
  prefix: '@upstash/ratelimit/user',
})

// 중요 작업 Rate Limit (템플릿 생성 등)
export const rateLimitCritical = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '60 s'), // 60초에 30 요청
  analytics: true,
  prefix: '@upstash/ratelimit/critical',
})

// 대량 작업 Rate Limit (TODO 일괄 생성 등)
export const rateLimitBulk = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '60 s'), // 60초에 10 요청
  analytics: true,
  prefix: '@upstash/ratelimit/bulk',
})
```

### Server Action에 적용

```typescript
// src/app/actions/todo-templates.ts
import { rateLimitCritical } from '@/lib/rate-limit'

export async function createTodoTemplate(data: CreateTodoTemplateInput) {
  const user = await verifyStaff()

  // Rate Limit 체크
  const { success, limit, remaining, reset } = await rateLimitCritical.limit(
    user.id
  )

  if (!success) {
    return {
      success: false,
      error: `요청 제한 초과. ${reset - Date.now()}ms 후 다시 시도하세요.`,
    }
  }

  // 기존 로직...
}
```

### 적용 기준

| Server Action | Rate Limit | 이유 |
|---------------|------------|------|
| `createTodoTemplate` | 30 req/min | 템플릿 생성 제한 |
| `createStudentComplete` | 30 req/min | 학생 생성 제한 |
| `createTodosForStudents` | 10 req/min | 대량 TODO 생성 제한 |
| `verifyTodos` | 60 req/min | 검증 작업 빈도 제한 |
| `bulkUpsertAttendance` | 10 req/min | 대량 출석 저장 제한 |
| `bulkUpsertExamScores` | 10 req/min | 대량 성적 입력 제한 |

### 체크리스트

- [ ] Upstash Redis 인스턴스 생성
- [ ] Rate Limit 헬퍼 구현
- [ ] 각 Server Action에 적용
- [ ] 테스트 (요청 초과 시나리오)

---

## 4. 환경변수 검증

### Production 환경변수 설정

**Vercel Dashboard → Project → Settings → Environment Variables**

```bash
# Production 전용 (절대 로컬 환경에 사용 금지)
SUPABASE_SERVICE_ROLE_KEY=<production_service_role_key>
NEXT_PUBLIC_SUPABASE_URL=<production_supabase_url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<production_anon_key>

# Upstash Redis (Production)
UPSTASH_REDIS_REST_URL=<production_redis_url>
UPSTASH_REDIS_REST_TOKEN=<production_redis_token>
```

### Staging 환경변수 설정

```bash
# Staging 전용
SUPABASE_SERVICE_ROLE_KEY=<staging_service_role_key>
NEXT_PUBLIC_SUPABASE_URL=<staging_supabase_url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<staging_anon_key>

# Upstash Redis (Staging)
UPSTASH_REDIS_REST_URL=<staging_redis_url>
UPSTASH_REDIS_REST_TOKEN=<staging_redis_token>
```

### 환경변수 검증 강화

`src/lib/env.ts`:

```typescript
import { z } from 'zod'

const envSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']),
})

export const env = envSchema.parse(process.env)
```

### CI/CD 파이프라인에 검증 추가

`.github/workflows/ci.yml`:

```yaml
- name: Validate environment variables
  run: pnpm env:validate
```

### 체크리스트

- [ ] Production 환경변수 설정
- [ ] Staging 환경변수 설정
- [ ] 환경변수 검증 스크립트 추가
- [ ] CI/CD 파이프라인에 검증 추가

---

## 5. 추가 보안 조치

### CSRF 방지

Next.js Server Actions는 기본적으로 CSRF 방지 기능 내장 (origin 검증)

### SQL Injection 방지

Supabase Client는 자동으로 파라미터화된 쿼리 사용

### XSS 방지

- React의 자동 이스케이프 기능 사용
- `dangerouslySetInnerHTML` 사용 금지
- 사용자 입력값 sanitization

### HTTPS 강제

Vercel은 자동으로 HTTPS 강제 (Production 환경)

---

## 📊 완료 체크리스트

### RLS 정책
- [ ] 현재 정책 백업
- [ ] 쓰기 정책 제거 마이그레이션 작성
- [ ] 로컬 테스트
- [ ] Staging 배포
- [ ] Production 배포

### 감사 로그
- [ ] 테이블 생성
- [ ] 헬퍼 함수 구현
- [ ] Server Actions에 적용
- [ ] 로그 조회 UI (선택)

### Rate Limiting
- [ ] Upstash Redis 설정
- [ ] Rate Limit 헬퍼 구현
- [ ] Server Actions에 적용
- [ ] 테스트

### 환경변수
- [ ] Production 설정
- [ ] Staging 설정
- [ ] 검증 강화
- [ ] CI/CD 통합

---

**예상 완료일**: Phase 2 완료 후 2-3일
**다음 Phase**: [Phase 5 - 배포 준비](./phase5-deployment.md)
