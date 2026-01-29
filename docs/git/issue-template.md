# Issue Template

## 제목 형식

```
{Area}: {설명}
```

### Area 목록

| Area            | 설명                |
| --------------- | ------------------- |
| `Students`      | 학생 관리           |
| `Guardians`     | 학부모 관리         |
| `Classes`       | 수업 관리           |
| `Grades`        | 성적 관리           |
| `Attendance`    | 출결 관리           |
| `Todos`         | 숙제 관리           |
| `Consultations` | 상담 관리           |
| `Calendar`      | 일정/캘린더         |
| `Reports`       | 리포트              |
| `Payments`      | 수납 관리           |
| `Billing`       | 청구/결제           |
| `Messages`      | 메시지/알림         |
| `Settings`      | 설정                |
| `Staff`         | 직원 관리           |
| `Dashboard`     | 대시보드            |
| `Board`         | 게시판              |
| `Library`       | 도서/교재           |
| `Subscription`  | 구독 관리           |
| `Stats`         | 통계                |
| `Kiosk`         | 키오스크            |
| `Auth`          | 인증/로그인         |
| `DB Schema`     | 데이터베이스 스키마 |
| `Infra`         | 인프라/배포         |
| `Docs`          | 문서                |

### 예시

```
Students: 학생 상세 탭 데이터 API 통합
Grades: 시험 CRUD 및 스키마 개선
DB Schema: Core Domain 재설계
Docs: README 업데이트
```

---

## 본문 템플릿

```markdown
## ✅ 이슈 개요

<!-- 무엇을 작업할 예정인지 간략히 작성 (1-2문장) -->

---

## 📝 작업 상세 내용

<!-- 구체적인 작업 내용을 체크리스트로 작성 -->

- [ ] 작업 1
- [ ] 작업 2
- [ ] 작업 3

---

## 📌 참고 사항

<!-- 관련 파일, 링크, 스크린샷 등 (선택) -->
```

---

## 라벨 가이드

이슈 생성 시 적절한 라벨을 붙여주세요.

### 타입 라벨 (필수)

| 라벨             | 설명             |
| ---------------- | ---------------- |
| `type: feat`     | 새 기능 구현     |
| `type: fix`      | 버그 수정        |
| `type: refactor` | 리팩토링         |
| `type: docs`     | 문서 작업        |
| `type: chore`    | 설정, 잡일       |
| `type: backend`  | 백엔드/서버 액션 |
| `type: schema`   | DB 스키마        |

### 우선순위 라벨 (선택)

| 라벨                 | 설명           |
| -------------------- | -------------- |
| `priority: critical` | 즉시 처리 필요 |
| `priority: high`     | 높은 우선순위  |
| `priority: medium`   | 중간 우선순위  |
| `priority: low`      | 낮은 우선순위  |

### 영역 라벨 (선택)

`area: students`, `area: grades`, `area: classes` 등 해당 Feature 영역
