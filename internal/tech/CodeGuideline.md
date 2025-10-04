# CodeGuideline

## **1. 기본 원칙**

- **멀티테넌시 보안**: 모든 데이터 접근은 Supabase RLS 전제를 따른다.
- **정적 타입**: TypeScript "strict": true를 유지한다.
- **모듈화**: 도메인별 디렉토리(src/app/classes, src/app/students) 기준으로 코드 구성.
- **재사용성**: 공통 UI → src/components/ui, 공통 로직 → src/lib.
- **투명성**: 문서와 코드가 함께 진화하도록 internal/ 문서와 PR 동기화.

---

## **2. 프로젝트 구조 반영**

```
acadesk-web/
├── src/
│   ├── app/               # Next.js App Router (route-first)
│   │   ├── api/           # API route handlers
│   │   ├── auth/          # 로그인/가입
│   │   ├── students/      # 학생 기능
│   │   ├── classes/       # 수업 기능
│   │   ├── attendance/    # 출석
│   │   ├── staff/         # 직원 초대/관리
│   │   ├── payments/      # 결제(향후)
│   │   ├── dashboard/     # 메인 대시보드
│   │   ├── onboarding/    # 신규 가입 온보딩
│   │   └── messages/      # 알림/쪽지
│   │
│   ├── components/
│   │   └── ui/            # shadcn 기반 재사용 컴포넌트
│   │
│   ├── lib/
│   │   ├── supabase/      # client/server helpers, role utils
│   │   └── utils.ts       # 순수 유틸 함수
│   │
│   └── middleware.ts      # 공용 미들웨어 (예: auth 체크)
│
├── supabase/
│   ├── migrations/        # SQL 마이그레이션
│   │   ├── 01_schema.sql
│   │   ├── 02_rls.sql
│   │   ├── 03_sample_data.sql
│   │   └── README.md
│   └── config.toml
│
├── internal/              # 문서화 (팀 공유용)
│   ├── tech/              # 기술 문서 (아키텍처, ERD, TRD, 코드 가이드라인 등)
│   ├── ops/               # 운영/배포 관련 문서
│   └── product/           # 기획/IA/PRD
```

---

## **3. 코드 스타일**

### **TypeScript**

- any 금지 → 불가피 시 // TODO(any): 이유 명시
- API/폼 데이터는 **zod**로 검증하고 z.infer로 타입 도출
- 타입은 src/lib/types/ 또는 도메인별 types.ts에 모아둔다

### **React/Next.js**

- **Server Component 우선**, use client는 꼭 필요한 경우만 사용
- API 호출 → src/app/api/* 또는 **Server Action** 기반
- 파일 네이밍:
    - 컴포넌트: PascalCase (ClassTable.tsx)
    - 훅: camelCase, useXxx.ts
    - util: *.ts

### **Tailwind/shadcn**

- 토큰 기반 사용(bg-background 등), 색상 하드코딩 금지
- 재사용 패턴은 반드시 components/ui에 추출

---

## **4. 상태 관리/데이터**

- SSR/ISR → 목록/리스트 (예: 성적표, 출석 현황)
- CSR/SWR → 사용자 인터랙션이 많은 곳 (예: 입력 폼, 대화형 화면)
- Supabase Client:
    - 서버: src/lib/supabase/server.ts
    - 클라이언트: src/lib/supabase/client.ts

---

## **5. 보안/권한**

- 모든 테이블은 **RLS ENABLED** 상태 유지
- get_current_tenant_id(), get_current_user_role() 함수 기반 정책 적용
- API/Server Action에서 **role 체크** 후 DB 접근

---

## **6. 에러/로깅**

- 사용자 에러 → 짧고 명확 (예: “권한이 없습니다”)
- 서버 로깅 → 구조화 JSON (console.error({ tag, err, ctx }))
- 운영 배포에서는 Sentry/Logflare 연결

---

## **7. 테스트**

- 유닛: src/lib/utils.test.ts (Vitest)
- e2e: tests/e2e/attendance.spec.ts (Playwright)
- Supabase → supabase/migrations/03_sample_data.sql 기준으로 테스트 데이터 로딩

---

## **8. Git/PR 규칙**

- 브랜치 네이밍: feature/*, fix/*, chore/*
- 커밋: Conventional Commits
    - feat: 학생 등록 폼 추가
    - fix: RLS 정책 누락 수정
- PR 템플릿:
    - 변경 요약
    - 스키마 변경 시 → 마이그레이션 파일 링크
    - 테스트 스크린샷 포함

---

## **9. 데이터/마이그레이션**

- 마이그레이션 파일 위치: supabase/migrations/
- 파일명 규칙: NN_name.sql (번호 순서 보장)
- 하나의 PR에 schema + rls + sample 세트 포함
- supabase/migrations/README.md 업데이트 필수

---

## **10. 샘플 스니펫**

### **zod 검증 + server action**

```
"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  studentId: z.string().uuid(),
  classId: z.string().uuid(),
});

export async function enrollStudent(input: unknown) {
  const data = schema.parse(input);
  const supabase = createClient();
  const { error } = await supabase
    .from("class_enrollments")
    .insert({ student_id: data.studentId, class_id: data.classId });
  if (error) throw error;
}
```