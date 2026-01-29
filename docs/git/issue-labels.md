# GitHub 이슈 라벨 가이드

이 문서는 Acadesk 프로젝트에서 사용하는 GitHub 이슈 라벨을 정의합니다.

> **총 61개 라벨** (2024년 12월 기준)

## 라벨 카테고리

### 1. 타입 (Type) - 8개

이슈의 종류를 나타냅니다. **필수**로 하나 이상 선택합니다.

| 라벨            | 색상       | 설명                           | 예시                           |
| --------------- | ---------- | ------------------------------ | ------------------------------ |
| `bug`           | 🔴 #d73a4a | 버그, 오류 수정                | 로그인 실패, 데이터 미표시     |
| `enhancement`   | 🔵 #a2eeef | 새 기능 추가 또는 기능 개선    | 새 페이지 구현, 기능 추가      |
| `documentation` | 🔵 #0075ca | 문서 작성 또는 수정            | README 업데이트, API 문서      |
| `refactor`      | 🟣 #9c27b0 | 코드 리팩토링 (기능 변경 없음) | 컴포넌트 분리, 코드 정리       |
| `performance`   | 🟠 #ff9800 | 성능 최적화                    | 로딩 속도 개선, 번들 크기 감소 |
| `chore`         | ⚪ #ededed | 빌드, 설정, 인프라 작업        | 패키지 업데이트, CI 설정       |
| `test`          | 🟢 #0e8a16 | 테스트 작성 또는 수정          | 유닛 테스트, E2E 테스트        |
| `hotfix`        | 🔴 #ff0000 | 프로덕션 긴급 수정             | 크리티컬 버그 즉시 수정        |

### 2. 우선순위 (Priority) - 4개

작업의 긴급도를 나타냅니다. 가능하면 설정합니다.

| 라벨                 | 색상       | 설명           | SLA       |
| -------------------- | ---------- | -------------- | --------- |
| `priority: critical` | 🔴 #b60205 | 즉시 수정 필요 | 24시간 내 |
| `priority: high`     | 🟠 #d93f0b | 높은 우선순위  | 1주일 내  |
| `priority: medium`   | 🟡 #fbca04 | 중간 우선순위  | 2주일 내  |
| `priority: low`      | 🟢 #c2e0c6 | 낮은 우선순위  | 백로그    |

### 3. 상태 (Status) - 5개

이슈의 진행 상태를 나타냅니다.

| 라벨                      | 색상       | 설명                           |
| ------------------------- | ---------- | ------------------------------ |
| `status: in progress`     | 🔵 #1d76db | 작업 진행 중                   |
| `status: review needed`   | 🟠 #f9d0c4 | 코드 리뷰 필요                 |
| `status: blocked`         | 🔴 #e11d21 | 다른 이슈/외부 요인으로 블로킹 |
| `status: on hold`         | ⚪ #bfd4f2 | 일시적으로 보류                |
| `status: ready for merge` | 🟢 #0e8a16 | 승인 완료, 머지 대기           |

### 4. 모듈 (Module) - 6개

영향받는 모노레포 패키지를 나타냅니다.

| 라벨                | 색상       | 경로                 | 설명                       |
| ------------------- | ---------- | -------------------- | -------------------------- |
| `module: web`       | 🔵 #006b75 | `apps/web`           | 메인 Next.js 앱            |
| `module: ui`        | 🟣 #5319e7 | `packages/ui`        | 공유 UI 컴포넌트           |
| `module: database`  | 🔴 #b60205 | `packages/database`  | Supabase 타입 & 클라이언트 |
| `module: utils`     | 🔵 #84b6eb | `packages/utils`     | 유틸리티 함수              |
| `module: error`     | 🟠 #e99695 | `packages/error`     | 에러 핸들링                |
| `module: messaging` | 🟡 #ffd33d | `packages/messaging` | SMS, 알림톡, Push          |

### 5. 영역 (Area) - 10개

특정 기능 영역을 나타냅니다.

| 라벨               | 색상       | 설명              |
| ------------------ | ---------- | ----------------- |
| `area: auth`       | 🟣 #d4c5f9 | 인증 및 권한 관리 |
| `area: attendance` | 🔵 #bfdadc | 출결 관리         |
| `area: students`   | 🔵 #c5def5 | 원생 관리         |
| `area: grades`     | 🟡 #fef2c0 | 성적 및 시험      |
| `area: reports`    | 🟠 #f7c6c7 | 리포트 및 분석    |
| `area: calendar`   | 🟢 #c2f0c2 | 캘린더 및 일정    |
| `area: library`    | 🟤 #e6ccb3 | 도서 및 대출      |
| `area: payments`   | 🟢 #d4edda | 수납 및 결제      |
| `area: settings`   | ⚪ #e2e3e5 | 설정 및 구성      |
| `area: ui/ux`      | 🟣 #ff99cc | UI/UX 개선        |

### 6. 웹 기술 (Web) - 6개

웹 개발 관련 세부 기술을 나타냅니다.

| 라벨                 | 색상       | 설명                  |
| -------------------- | ---------- | --------------------- |
| `web: nextjs`        | ⚫ #000000 | Next.js 관련          |
| `web: react`         | 🔵 #61dafb | React 컴포넌트/훅     |
| `web: tailwind`      | 🔵 #38bdf8 | Tailwind CSS 스타일링 |
| `web: accessibility` | 🟢 #4caf50 | 접근성 (a11y) 개선    |
| `web: seo`           | 🟢 #34a853 | SEO 최적화            |
| `web: responsive`    | 🟣 #9c27b0 | 반응형 디자인         |

### 7. 빌드 & 인프라 (Build & Infra) - 6개

빌드, 배포, CI/CD 관련 라벨입니다.

| 라벨               | 색상       | 설명                      |
| ------------------ | ---------- | ------------------------- |
| `build: turborepo` | 🔵 #3f51b5 | Turborepo 설정            |
| `build: pnpm`      | 🟠 #f69220 | pnpm workspace            |
| `ci/cd`            | 🔵 #106ba3 | CI/CD 파이프라인          |
| `github-actions`   | 🟣 #6f42c1 | GitHub Actions 워크플로우 |
| `deploy: vercel`   | ⚫ #000000 | Vercel 배포               |
| `dependencies`     | 🔵 #0366d6 | 의존성 업데이트           |

### 8. 외부 연동 (External) - 4개

외부 서비스 연동 관련 라벨입니다.

| 라벨                  | 색상       | 설명                         |
| --------------------- | ---------- | ---------------------------- |
| `external: supabase`  | 🟢 #3ecf8e | Supabase 연동                |
| `external: api`       | 🔵 #0052cc | 외부 API 연동                |
| `external: analytics` | 🔵 #172b4d | 분석 서비스 (GA 등)          |
| `external: kakao`     | 🟡 #fee500 | 카카오 연동 (알림톡, 로그인) |

### 9. 품질 & 보안 (Quality & Security) - 4개

코드 품질 및 보안 관련 라벨입니다.

| 라벨              | 색상       | 설명                                |
| ----------------- | ---------- | ----------------------------------- |
| `security`        | 🔴 #ee0701 | 보안 취약점 또는 개선               |
| `privacy`         | 🟠 #ff5722 | 개인정보보호 (GDPR, 개인정보보호법) |
| `tech debt`       | ⚪ #607d8b | 기술 부채 해결 필요                 |
| `breaking change` | 🔴 #d73a4a | 마이그레이션 필요한 Breaking Change |

### 10. 릴리즈 (Release) - 2개

릴리즈 관련 라벨입니다.

| 라벨         | 색상       | 설명        |
| ------------ | ---------- | ----------- |
| `release`    | 🔵 #00bcd4 | 릴리즈 관련 |
| `discussion` | 🟢 #98d8c8 | 논의 필요   |

### 11. 기타 (Miscellaneous) - 6개

| 라벨               | 색상       | 설명                 |
| ------------------ | ---------- | -------------------- |
| `good first issue` | 🟣 #7057ff | 신규 기여자에게 적합 |
| `help wanted`      | 🟢 #008672 | 추가 도움 필요       |
| `question`         | 🟣 #d876e3 | 추가 정보 요청       |
| `duplicate`        | ⚪ #cfd3d7 | 중복 이슈            |
| `invalid`          | 🟡 #e4e669 | 유효하지 않은 이슈   |
| `wontfix`          | ⚪ #ffffff | 수정하지 않을 이슈   |

---

## 라벨 사용 가이드

### 이슈 생성 시

1. **타입 라벨 필수**: 최소 1개의 타입 라벨 선택
2. **영역 라벨 권장**: 관련 기능 영역이 명확하면 선택
3. **모듈 라벨 권장**: 영향받는 패키지가 명확하면 선택
4. **우선순위**: 긴급도가 있으면 설정

```
예시: 로그인 버그 수정 이슈
라벨: bug, priority: high, module: web, area: auth
```

### 작업 진행 시

1. 작업 시작 → `status: in progress` 추가
2. PR 생성 → `status: review needed` 추가
3. 블로킹 발생 → `status: blocked` 추가 (코멘트로 사유 명시)
4. 승인 완료 → `status: ready for merge` 추가

### 라벨 조합 예시

| 상황                  | 라벨 조합                                               |
| --------------------- | ------------------------------------------------------- |
| 새 기능 개발          | `enhancement` + `area: grades` + `module: web`          |
| 긴급 버그 수정        | `bug` + `priority: critical` + `hotfix`                 |
| UI 컴포넌트 추가      | `enhancement` + `module: ui` + `area: ui/ux`            |
| 문서 업데이트         | `documentation`                                         |
| 리팩토링              | `refactor` + `module: web` + `tech debt`                |
| 테스트 추가           | `test` + `module: web`                                  |
| 카카오 알림톡 연동    | `enhancement` + `external: kakao` + `module: messaging` |
| 접근성 개선           | `enhancement` + `web: accessibility` + `area: ui/ux`    |
| Supabase 마이그레이션 | `chore` + `external: supabase` + `module: database`     |
| 보안 취약점 수정      | `bug` + `security` + `priority: critical`               |

---

## 라벨 관리

### 새 라벨 추가

```bash
gh label create "area: billing" --description "수납 및 결제 관련" --color "d4c5f9"
```

### 라벨 수정

```bash
gh label edit "bug" --description "새로운 설명" --color "ff0000"
```

### 라벨 삭제

```bash
gh label delete "라벨명" --yes
```

### 전체 라벨 조회

```bash
gh label list --limit 100
```

---

## 관련 문서

- [이슈 템플릿](./issue-template.md)
- [브랜치 컨벤션](./branch.md)
- [커밋 컨벤션](./commit.md)
