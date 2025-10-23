
```
src/
├── app/                      # UI와 라우팅(Next.js App Router)
│   ├── (auth)/auth/...       # 인증/온보딩 화면들(클라이언트 UI)
│   ├── (dashboard)/...       # 대시보드/도메인 화면들(대부분 Server Components)
│   ├── actions/              # ✅ 서버 엔드포인트(Next Server Actions) - 유일한 진입점
│   │   ├── auth.ts
│   │   ├── onboarding.ts
│   │   ├── students.ts
│   │   ├── reports.ts
│   │   └── ...               # 각 도메인 별 1~2개로 묶기
│   ├── layout.tsx
│   └── page.tsx
├── core/                     # ✅ 순수 비즈니스(프레임워크 독립)
│   ├── domain/               # 엔티티/VO/리포지토리 인터페이스
│   │   ├── entities/
│   │   ├── value-objects/
│   │   └── repositories/
│   ├── application/          # 유스케이스(도메인 서비스/오케스트레이션)
│   │   └── use-cases/
│   └── types/                # 공유 타입(선택)
├── infra/                    # ✅ 외부 의존(구현체)
│   ├── db/
│   │   ├── repositories/     # 리포지토리 구현체(= Supabase/Postgres 쿼리)
│   │   ├── datasource/       # SupabaseDataSource 등
│   │   └── queries.sql       # (선택) 복잡한 SQL 분리
│   ├── messaging/            # 문자/이메일 공급자
│   └── pdf/                  # PDF 생성 등 I/O
├── lib/                      # 프레임워크 보조 유틸
│   ├── supabase/
│   │   ├── server.ts         # supabase server client
│   │   └── service-role.ts   # service_role client
│   ├── env.ts
│   ├── error.ts              # 에러/로깅 유틸(단일 파일로 슬림화)
│   ├── auth/verify-permission.ts
│   └── utils.ts
└── ui/                       # ✅ 재사용 가능한 순수 컴포넌트(디자인 시스템)
    ├── form.tsx
    ├── table.tsx
    └── ...
```
핵심 원칙 (이 규칙만 지키면 구조가 망가지지 않음)
	1.	데이터는 오직 app/actions/**에서 가져온다.
	•	화면(components/page)은 Server Action 호출만 한다.
	•	클라이언트에서 직접 Supabase/DB 호출 금지.
	2.	비즈니스 로직은 core/로 모은다.
	•	엔티티/VO/리포지토리 인터페이스 → core/domain/**
	•	유스케이스(워크플로) → core/application/use-cases/**
	•	유스케이스는 리포지토리 인터페이스에만 의존.
	3.	외부 연결은 infra/에서만 한다.
	•	Supabase 쿼리/리포지토리 구현 → infra/db/repositories/**
	•	service_role, 트랜잭션, 쿼리 최적화도 여기서.
	4.	Service Role은 서버에서만 생성/사용.
	•	lib/supabase/service-role.ts 이외 노출 금지.
	•	RLS 해제 대체로 항상 tenant/user 검증을 actions 또는 infra에서 직접 수행.
	5.	UI 라이브러리/공용 컴포넌트는 ui/.
	•	페이지별 복잡한 UI는 app/** 안에 두되, 재사용 가능한 컴포넌트는 ui/로.

⸻

지금 트리에서 “어디로 무엇을 옮기거나 삭제할지”
	•	app/actions/** → 유지/핵심 (도메인별 1~2 파일로 슬림화 추천)
	•	application/use-cases/** → core/application/use-cases/** 로 이동 (이름만 변경)
	•	domain/** → core/domain/** 로 이동
	•	infrastructure/database/**.repository.ts → infra/db/repositories/** 로 이동
	•	infrastructure/data-sources/SupabaseDataSource.ts → infra/db/datasource/SupabaseDataSource.ts
	•	lib/supabase/** → 유지(server.ts, service-role.ts만 남기고 불필요한 middleware/클라용 삭제)
	•	components/ui/** → ui/** 로 이동 (진짜 재사용 가능한 것만 남기기)
	•	components/features/** → 해당 feature의 page 근처(app/(dashboard)/...)에 붙이거나, 재사용 많으면 ui/로 추출

삭제 권장(이미 앞서 안내한 것과 동일)
	•	application/factories/*UseCaseFactory.client.ts 전부
	•	hooks/use-auth-stage.ts (서버에서 단계 판단)
	•	infrastructure/auth/** (남는 게 없으면 폴더 자체)
	•	lib/data-source-provider.ts 의 createClientDataSource() (서버만 사용)
	•	app/api/** 중 Server Actions로 대체된 라우트

⸻

각 레이어의 책임 예시
	•	app/actions/students.ts
	•	verifyPermission()로 사용자/tenant 확인
	•	const repo = new StudentRepository(new SupabaseDataSource(serviceRoleClient))
	•	await new GetStudentsUseCase(repo).execute({ tenantId, filters })
	•	결과 반환(에러는 여기서 사용자 메시지로 변환)
	•	core/application/use-cases/GetStudentsUseCase.ts
	•	복잡한 필터 가공·검증
	•	필요한 여러 리포지토리 호출을 순서/트랜잭션으로 조율
	•	core/domain/repositories/IStudentRepository.ts
	•	findAll(tenantId, filters): Student[] 등 인터페이스만 정의
	•	infra/db/repositories/student.repository.ts
	•	실제 쿼리 (service_role 사용 시 tenant_id 직접 필터)
	•	성능 고려한 select 컬럼 제한/인덱스 활용

⸻

폴더 이동 “작업 순서” (실수 안 나게)
	1.	죽은 코드 먼저 제거
	•	client 팩토리·레거시 훅·미사용 API 라우트 삭제
	2.	core/와 infra/ 생성 후 파일 이동
	•	domain/** → core/domain/**
	•	application/use-cases/** → core/application/use-cases/**
	•	infrastructure/database/** → infra/db/repositories/**
	•	infrastructure/data-sources/** → infra/db/datasource/**
	3.	import 경로 단일화
	•	tsconfig paths 추천:

{
  "compilerOptions": {
    "baseUrl": "src",
    "paths": {
      "@core/*": ["core/*"],
      "@infra/*": ["infra/*"],
      "@app/*": ["app/*"],
      "@ui/*": ["ui/*"],
      "@lib/*": ["lib/*"]
    }
  }
}


	•	모든 파일에서 새 alias 사용하도록 치환

	4.	Server Action 외 직접 DB 접근 없애기
	•	grep으로 createClient() / 클라 DB 접근 제거

⸻

“이 구조로 개발할 때” 체크리스트
	•	새 기능은 반드시 app/actions/<domain>.ts에 엔드포인트부터 추가
	•	액션 내부에서 권한/tenant 검증 → 유스케이스 호출
	•	유스케이스는 오직 인터페이스에 의존
	•	리포지토리 구현은 infra/에서 service_role + 명시적 필터링
	•	화면은 액션만 호출. 데이터/권한 판단을 클라에서 하지 않음
	•	재사용 UI는 ui/, 특정 페이지 전용은 해당 페이지 폴더 근처

⸻
