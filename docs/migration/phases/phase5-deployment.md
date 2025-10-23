# Phase 5-6: 모니터링, 최적화 및 배포 🚀

> **프로덕션 배포 준비 및 실행**

## 📋 개요

**Phase 5 예상 소요 시간**: 1-2일 (모니터링 및 최적화)
**Phase 6 예상 소요 시간**: 1일 (배포)
**우선순위**: Phase 6는 **필수**, Phase 5는 선택

---

## Phase 5: 모니터링 및 최적화 (선택)

### 1. 성능 모니터링

#### Sentry 통합 (에러 추적)

**설치**:
```bash
pnpm add @sentry/nextjs
```

**설정** (`sentry.client.config.ts`):
```typescript
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV,
})
```

**Server Actions에 적용**:
```typescript
import * as Sentry from '@sentry/nextjs'

export async function createTodoTemplate(data: CreateTodoTemplateInput) {
  try {
    // 기존 로직...
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        action: 'createTodoTemplate',
        userId: user.id,
      },
    })
    throw error
  }
}
```

#### Server Action 응답 시간 측정

```typescript
// src/lib/performance.ts
export function measurePerformance(label: string) {
  const start = Date.now()
  return () => {
    const duration = Date.now() - start
    console.log(`[Performance] ${label}: ${duration}ms`)

    // Sentry Performance Monitoring
    if (duration > 1000) {
      console.warn(`[Performance] Slow operation: ${label} (${duration}ms)`)
    }
  }
}

// Server Action에서 사용
export async function createTodosForStudents(data: CreateTodosInput) {
  const measure = measurePerformance('createTodosForStudents')

  try {
    // 로직...
  } finally {
    measure()
  }
}
```

### 2. 느린 쿼리 식별 및 최적화

#### 쿼리 실행 계획 확인

```bash
# Supabase 로컬에서
psql -h localhost -p 54322 -U postgres -d postgres

EXPLAIN ANALYZE
SELECT * FROM students
WHERE tenant_id = 'xxx'
  AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 20;
```

#### 인덱스 추가

```sql
-- 자주 조회되는 컬럼에 인덱스 추가
CREATE INDEX CONCURRENTLY idx_students_tenant_deleted
ON students(tenant_id, deleted_at)
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY idx_student_todos_tenant_status
ON student_todos(tenant_id, status)
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY idx_todo_templates_tenant_active
ON todo_templates(tenant_id, is_active)
WHERE deleted_at IS NULL;
```

### 3. 사용자 피드백

#### 베타 테스터 그룹 선정

- [ ] 원장 2명
- [ ] 강사 3명
- [ ] 보조교사 2명

#### 피드백 수집 채널

- [ ] Google Forms 또는 Notion 페이지
- [ ] Slack 채널 또는 Discord
- [ ] 1:1 인터뷰 일정 잡기

#### 버그 리포트 양식

```markdown
**버그 설명**:
**재현 방법**:
1. ...
2. ...

**예상 결과**:
**실제 결과**:
**스크린샷** (선택):
**환경** (브라우저, OS):
```

---

## Phase 6: 배포 준비 및 실행 (필수)

### 1. Pre-Deployment 체크

#### 코드 품질 확인

```bash
# 타입 체크
pnpm type-check
# ✅ 통과 확인

# Lint
pnpm lint
# ✅ 통과 확인

# 빌드
pnpm build
# ✅ 성공 확인
```

#### 환경변수 재확인

**`.env.production`**:
```bash
SUPABASE_SERVICE_ROLE_KEY=<production_key>
NEXT_PUBLIC_SUPABASE_URL=<production_url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<production_anon_key>
UPSTASH_REDIS_REST_URL=<production_redis_url>
UPSTASH_REDIS_REST_TOKEN=<production_redis_token>
```

**Vercel Dashboard 확인**:
- [ ] Environment Variables 설정 완료
- [ ] Production 전용 키 사용 확인
- [ ] `.env.local` 키와 다른지 확인

#### 데이터베이스 마이그레이션 준비

```bash
# 로컬에서 마이그레이션 파일 확인
ls -la supabase/migrations/

# 마이그레이션 내용 검토
cat supabase/migrations/YYYYMMDDNNNNNN_remove_write_rls_policies.sql
```

#### 롤백 계획 수립

**시나리오 1: 코드 롤백**
```bash
# 이전 커밋으로 되돌리기
git revert HEAD
git push origin main

# 또는 특정 커밋으로
git reset --hard <commit-hash>
git push --force origin main
```

**시나리오 2: 데이터베이스 롤백**
```sql
-- RLS 정책 복원 (백업에서)
\i backup_rls_policies.sql
```

### 2. Staging 배포

#### Staging 환경 확인

- [ ] Vercel Staging 환경 준비
- [ ] Staging Supabase 프로젝트 준비
- [ ] Staging 환경변수 설정

#### 배포 실행

```bash
# Vercel CLI 사용
vercel --env staging

# 또는 Git Push (staging 브랜치)
git push origin main:staging
```

#### Smoke 테스트

- [ ] 홈페이지 로딩 확인
- [ ] 로그인 기능 확인
- [ ] 학생 생성 테스트
- [ ] TODO 템플릿 생성 테스트
- [ ] 상담 기록 생성 테스트

#### 주요 기능 수동 테스트

Phase 2 테스트 체크리스트 중 Critical 항목만:
- [ ] 학생 생성 (보호자 신규)
- [ ] TODO 플래너 게시
- [ ] TODO 검증
- [ ] 출석 일괄 저장
- [ ] 성적 일괄 입력

#### 성능 측정

| 기능 | Staging 응답 시간 | 목표 | 결과 |
|------|-------------------|------|------|
| TODO 100개 생성 | ___ 초 | < 5초 | [ ] |
| 출석 50명 저장 | ___ 초 | < 3초 | [ ] |
| 성적 30명 입력 | ___ 초 | < 2초 | [ ] |

### 3. Production 배포

#### 배포 전 체크리스트

- [ ] Staging 테스트 모두 통과
- [ ] 롤백 계획 수립 완료
- [ ] 데이터베이스 백업 완료
- [ ] 배포 시간 공지 (점검 시간)

#### 배포 시간 공지 예시

```
[공지] 시스템 업데이트 안내

일시: 2025-10-25 (금) 02:00 - 03:00 (1시간 예상)
내용: 보안 강화 및 성능 개선 업데이트
영향: 서비스 이용 불가 (약 1시간)

문의: support@acadesk.com
```

#### 데이터베이스 백업

```bash
# Supabase Dashboard → Database → Backups → Create Backup
# 또는 CLI
supabase db dump > backup_before_deployment.sql
```

#### Production 배포 실행

**Vercel 자동 배포** (main 브랜치 push):
```bash
git checkout main
git merge staging
git push origin main
```

**수동 배포** (Vercel CLI):
```bash
vercel --prod
```

#### 배포 후 모니터링 (1시간)

**즉시 확인** (5분 이내):
- [ ] 홈페이지 로딩
- [ ] 로그인 기능
- [ ] 대시보드 로딩

**주요 기능 확인** (30분 이내):
- [ ] 학생 생성
- [ ] TODO 생성
- [ ] 상담 기록 생성

**Sentry 에러 모니터링**:
- [ ] Sentry Dashboard 확인
- [ ] 에러율 5% 이하 유지 확인

**응답 시간 모니터링**:
- [ ] Vercel Analytics 확인
- [ ] P99 응답 시간 3초 이하 확인

#### 사용자 피드백 모니터링 (24시간)

- [ ] 첫 1시간: 적극적 모니터링
- [ ] 다음 3시간: 주기적 확인
- [ ] 다음 20시간: 수동 리포트 확인

### 4. Post-Deployment

#### 배포 로그 문서화

`docs/deployment/deployment-log-YYYYMMDD.md`:
```markdown
# 배포 로그 - 2025-10-25

## 배포 정보
- **날짜**: 2025-10-25 02:00 - 03:00
- **버전**: v2.0.0
- **담당자**: Claude Code

## 배포 내용
- Phase 1-3 마이그레이션 완료
- RLS 정책 재검토 (Phase 4)
- 감사 로그 시스템 추가 (Phase 4)

## 이슈
- 없음

## 롤백
- 없음

## 다음 단계
- 사용자 피드백 수집
```

#### 발견된 이슈 트래킹

GitHub Issues 또는 Linear:
- [ ] 이슈 생성
- [ ] 우선순위 설정
- [ ] 담당자 할당

#### 핫픽스 준비

**Critical 이슈 발견 시**:
1. 이슈 재현 확인
2. 수정 코드 작성
3. Staging 배포 및 테스트
4. Production 핫픽스 배포

---

## 📊 배포 체크리스트 요약

### Pre-Deployment
- [ ] 타입 체크 통과
- [ ] Lint 통과
- [ ] 빌드 성공
- [ ] 환경변수 확인
- [ ] 마이그레이션 파일 검토
- [ ] 롤백 계획 수립

### Staging
- [ ] Staging 배포
- [ ] Smoke 테스트
- [ ] 주요 기능 테스트
- [ ] 성능 측정

### Production
- [ ] 배포 시간 공지
- [ ] 데이터베이스 백업
- [ ] Production 배포
- [ ] 즉시 확인 (5분)
- [ ] 주요 기능 확인 (30분)
- [ ] 모니터링 (1시간)
- [ ] 피드백 수집 (24시간)

### Post-Deployment
- [ ] 배포 로그 문서화
- [ ] 이슈 트래킹
- [ ] 핫픽스 대기

---

## 🚨 긴급 롤백 시나리오

### 시나리오 1: 치명적 버그 발견

**판단 기준**:
- 사용자 데이터 손실 가능성
- 서비스 완전 중단
- 보안 취약점 발견

**대응**:
```bash
# 1. 즉시 이전 버전으로 롤백
git revert HEAD
git push origin main

# 2. Vercel 대시보드에서 이전 배포로 롤백
# Deployments → 이전 버전 → Promote to Production

# 3. 사용자 공지
```

### 시나리오 2: 성능 저하

**판단 기준**:
- 응답 시간 10초 이상
- 타임아웃 에러 급증
- Sentry 에러율 20% 이상

**대응**:
1. 문제 기능 식별
2. 해당 기능만 비활성화 (Feature Flag)
3. 성능 분석 및 최적화
4. 핫픽스 배포

### 시나리오 3: 데이터베이스 이슈

**판단 기준**:
- 마이그레이션 실패
- RLS 정책 오류
- 데이터 정합성 문제

**대응**:
```sql
-- RLS 정책 복원
\i backup_rls_policies.sql

-- 또는 마이그레이션 롤백
-- (Supabase는 자동 롤백 미지원, 수동 작업 필요)
```

---

## 💡 Tips

### 안전한 배포를 위한 Best Practices

1. **점진적 배포** (Canary Deployment):
   - Vercel Pro 플랜에서 지원
   - 10% 트래픽만 새 버전으로 전환
   - 문제 없으면 100%로 확대

2. **Feature Flags** 사용:
   - 새 기능을 코드에 포함하되 비활성화
   - 필요시 즉시 활성화/비활성화

3. **모니터링 우선**:
   - 배포 후 첫 1시간이 가장 중요
   - Sentry, Vercel Analytics 실시간 확인

4. **롤백 망설이지 않기**:
   - 의심스러우면 즉시 롤백
   - 분석 후 재배포

---

**작성일**: 2025-10-23
**관련 문서**:
- [DEPLOYMENT_GUIDE.md](../../../docs/DEPLOYMENT_GUIDE.md)
- [Phase 4 - 보안 강화](./phase4-security.md)
