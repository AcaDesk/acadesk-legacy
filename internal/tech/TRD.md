# TRD

## **1. 아키텍처 개요**

### **아키텍처 스타일**

- **프론트엔드**: **Next.js (App Router)** + **TypeScript**
    - CSR + SSR 혼합 전략 → 대시보드/리포트는 SSR로 빠르게 렌더링, 나머지는 CSR
    - UI: TailwindCSS + Shadcn UI 컴포넌트
    - 시각화: Chart.js or Recharts → 성적/출석 그래프
- **백엔드**: **Supabase** (Postgres + Auth + Edge Functions)
    - Postgres 스키마 기반 ERD 설계
    - Edge Functions: 알림 발송, 리포트 PDF 생성 같은 서버리스 Job 처리
    - Row Level Security(RLS) → 멀티테넌트 모델 구현
- **호스팅 & 인프라**
    - **Vercel**: 프론트엔드 서버리스 배포
    - **Supabase Cloud**: DB/백엔드 관리
    - **Cloudflare**: DNS 관리, SSL/TLS, CDN 캐싱, WAF(Web Application Firewall)
- **메시지 발송 채널**
    - 1차: 카카오 알림톡 API
    - 2차(백업): 알리고 / 솔라피 API
    - Fallback 전략 내장 (장애 시 SMS/Email 전환)
- **CI/CD**
    - GitHub Actions → Vercel & Supabase에 자동 배포
    - PR마다 미리보기 배포 환경 생성
- **모니터링**
    - Sentry → FE/BE 에러 추적
    - Supabase Logs → DB 성능 분석, 쿼리 추적
    - Cloudflare Analytics → 요청/위협 분석

---

## **2. API 및 DB 스키마**

### **API 설계 방식**

- REST 기반 (간단하고 이해 쉬움)
- 일부 대시보드/그래프 조회는 GraphQL 지원 고려 (Supabase GraphQL API 가능)
- 인증: JWT 기반 (Supabase Auth 토큰)

### **주요 엔티티 및 관계**

- **Student**: 기본 엔티티 (다른 모든 DB와 연결됨)
- **Attendance**: Student 1:N 관계 (출석 기록)
- **Exam**: Student 1:N (시험 점수 기록)
- **Report**: Student 1:N (자동 생성된 리포트)
- **Book** ↔ **Student**: N:M (배부/진도 관리)
- **LibraryBook** ↔ **Student**: N:M (대여 관리)
- **Consultation**: Student 1:N (상담 기록)

### **API 예시**

- GET /students/:id → 학생 상세정보 (Attendance, Exam, BookProgress 조인)
- POST /attendance → 출석 입력
- POST /exam → 시험 점수 입력
- GET /reports/:studentId → 리포트 조회
- POST /alerts/missing → 미등원 알림 발송

---

## **3. 보안 (Security)**

- **인증/인가**
    - Supabase Auth (JWT)
    - Provider: 이메일 OTP / Google / Apple Login
    - Role-based access (원장 / 강사 / 조교 / 학부모)
- **Row Level Security (RLS)**
    - 원장: 학원 전체 데이터 접근
    - 강사: 담당 학생 데이터만 접근 (teacherId 필터링)
    - 조교: 출석/시험 입력 가능, 개인정보 필드 마스킹
- **네트워크 보안**
    - Cloudflare WAF 적용 → DDoS 방어
    - HTTPS 강제 (TLS 1.3)
- **개인정보 보호**
    - 학부모 연락처: 마스킹 후 노출 (예: 010-****-1234)
    - 민감 데이터(연락처, 상담 기록)는 암호화 컬럼 적용

---

## **4. 성능·가용성 (SLO/SLA)**

### **목표 SLO**

- API 응답 시간: 95% < 200ms (단순 조회 기준)
- 대시보드 초기 로딩: < 2s
- 가용성: 99.9%
- 최대 동시 사용자: 50명 (1개 학원 기준), 1000명까지 확장 가능

### **확장 전략**

- 학원별 멀티테넌트 모델 (Shared DB + RLS)
- CDN 캐싱: 학부모 리포트/정적 파일은 Cloudflare 캐시 적용
- Edge Function Queue: 대량 알림 발송 시 비동기 처리

---

## **5. 배포 (Deployment)**

- **브랜치 전략**:
    - main: 운영
    - develop: 개발/테스트
    - feature/*: 기능 개발
- **CI/CD 파이프라인**
    - GitHub Actions: Lint → Test → Build
    - main → Vercel + Supabase 자동 배포
    - develop → Dev 환경 배포
- **환경 분리**
    - Dev: Supabase Free Tier
    - Prod: Supabase Pro Plan (고객 데이터)

---

## **6. 모니터링 & 로깅**

- **FE/BE 에러 추적**: Sentry
- **DB 모니터링**: Supabase Logs + pg_stat_statements
- **보안 로깅**: Cloudflare Firewall Events
- **알림**: Slack/Discord 채널에 배포/에러 로그 전송

---

## **7. 예외 처리 전략**

- **알림톡 장애** → SMS/Email 대체
- **PDF 리포트 생성 실패** → Job Queue 재시도
- **네트워크 장애** → 로컬스토리지 캐싱 후 재업로드
- **DB Lock 발생** → Retry & Deadlock Timeout 설정

---

## **8. 선택해야 할 아키텍처 의사결정 (Decision Points)**

1. **멀티테넌시 구조**
    - 학원별 DB 분리? → 관리 비용↑
    - Shared DB + RLS (권장) → 확장성↑, 관리 편리
2. **API 형태**
    - REST 단순성 vs GraphQL 유연성
    - 초기엔 REST, 추후 GraphQL 병행
3. **알림 발송 구조**
    - 실시간 동기 호출? → 느려짐
    - Edge Function Queue 기반 비동기 발송 (권장)
4. **PDF 생성**
    - 서버리스(Edge Function + Puppeteer) vs 외부 API
    - MVP: 외부 API, 이후 내부 Edge Function으로 전환

---

👉 정리

- **아키텍처**는 SaaS 확장에 맞게 **Next.js + Supabase + Cloudflare** 조합
- **보안**은 **RLS + Cloudflare 보안**으로 강화
- **성능 목표**: 응답 <200ms, 가용성 99.9%
- **운영 전략**: CI/CD 자동화, 모니터링 체계 확립
- **의사결정 포인트**: 멀티테넌시, 알림 구조, PDF 처리 방식

---