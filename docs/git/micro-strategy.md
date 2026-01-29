# 마이크로 브랜치 & 마이크로 커밋 전략

이 문서는 Acadesk 프로젝트의 Git 워크플로우 핵심 전략을 설명합니다.

## 핵심 원칙

> **"작은 변경, 빠른 커밋, 독립적인 브랜치"**

- 하나의 논리적 변경 = 하나의 커밋
- 하나의 기능/수정 = 하나의 브랜치 = 하나의 PR
- develop 브랜치 직접 커밋/푸시 금지

---

## 마이크로 브랜치 전략

### 왜 마이크로 브랜치인가?

| 장점            | 설명                                |
| --------------- | ----------------------------------- |
| **리뷰 용이**   | 작은 PR은 리뷰어가 빠르게 검토 가능 |
| **충돌 최소화** | 짧은 생명주기로 머지 충돌 감소      |
| **빠른 피드백** | 작은 단위로 CI/CD 빠르게 통과       |
| **쉬운 롤백**   | 문제 발생 시 해당 PR만 리버트       |
| **명확한 이력** | 기능별 변경 이력 추적 용이          |

### 브랜치 생성 규칙

```bash
# 형식
{type}/{description}

# 예시
feat/student-avatar-upload
fix/login-redirect-loop
refactor/extract-date-utils
docs/api-authentication
chore/update-dependencies
```

### 브랜치 생명주기

```
develop ──┬─────────────────────────────────────────► develop
          │                                          ▲
          └── feat/feature-a ──[commits]──[PR]──[merge]
```

1. `develop`에서 새 브랜치 생성
2. 마이크로 커밋으로 작업
3. 원격에 푸시
4. PR 생성 및 리뷰
5. 머지 후 브랜치 삭제

### 도메인별 브랜치 분리

**여러 도메인을 동시에 작업할 때는 반드시 브랜치를 분리합니다.**

```bash
# ❌ Bad: 여러 도메인을 하나의 브랜치에서 작업
feat/consultations-and-reports-improvements

# ✅ Good: 도메인별 브랜치 분리
feat/consultations-modal-ui
feat/reports-batch-send
fix/calendar-timezone
```

**분리 기준:**

- Feature 폴더가 다른 경우 (consultations, reports, calendar 등)
- 논리적으로 독립적인 변경인 경우
- 서로 다른 이슈를 해결하는 경우

---

## 마이크로 커밋 전략

### 왜 마이크로 커밋인가?

| 장점                | 설명                           |
| ------------------- | ------------------------------ |
| **원자적 변경**     | 각 커밋이 하나의 완결된 변경   |
| **bisect 용이**     | 버그 원인 이진 탐색 가능       |
| **체리픽 가능**     | 특정 변경만 다른 브랜치에 적용 |
| **리버트 용이**     | 문제 커밋만 되돌리기 가능      |
| **히스토리 가독성** | 변경 의도가 명확하게 드러남    |

### 커밋 타이밍

**즉시 커밋해야 하는 순간:**

- [ ] 파일 1-3개 변경 완료
- [ ] 하나의 함수/컴포넌트 작성 완료
- [ ] 리팩토링 한 단계 완료
- [ ] 버그 하나 수정 완료
- [ ] 테스트 통과 확인
- [ ] 타입 에러 해결

### 커밋 메시지 형식

```bash
[Type]: 제목 (50자 이내)

# Type 종류
[Feat]     # 새로운 기능
[Fix]      # 버그 수정
[Refactor] # 리팩토링 (기능 변경 없음)
[Style]    # 스타일/포맷팅
[Docs]     # 문서
[Test]     # 테스트
[Chore]    # 빌드, 설정 등
```

### 좋은 커밋 vs 나쁜 커밋

```bash
# ❌ Bad: 범위가 넓고 모호함
git commit -m "[Feat]: 여러 기능 추가 및 버그 수정"
git commit -m "[Fix]: 수정"
git commit -m "[Refactor]: 코드 정리"

# ✅ Good: 구체적이고 원자적
git commit -m "[Feat]: 상담 일정 추가 모달 UI 구현"
git commit -m "[Fix]: 상담 종류 뱃지 스타일을 네모로 변경"
git commit -m "[Refactor]: 날짜 유틸 함수를 shared/lib로 이동"
```

### 커밋 분리 예시

하나의 기능을 구현할 때도 단계별로 커밋합니다:

```bash
# 상담 일정 추가 기능 구현 시
git commit -m "[Feat]: 상담 일정 추가 모달 UI 구현"
git commit -m "[Feat]: 상담 일정 추가 Mock 데이터 구성"
git commit -m "[Refactor]: 모달 디자인을 캘린더와 일관성 맞춤"
git commit -m "[Feat]: 학생 선택 시 학부모 자동 연결"
git commit -m "[Fix]: 모바일 반응형 레이아웃 수정"
```

---

## 워크플로우 예시

### 새 기능 개발

```bash
# 1. develop 최신화
git checkout develop && git pull origin develop

# 2. 새 브랜치 생성
git checkout -b feat/consultations-add-modal

# 3. 작업 & 마이크로 커밋 (반복)
# ... 코드 작성 ...
git add apps/web/src/features/consultations/
git commit -m "[Feat]: 상담 일정 추가 모달 UI 구현"

# ... 추가 작업 ...
git add .
git commit -m "[Feat]: Mock 데이터 추가"

# 4. 푸시
git push -u origin feat/consultations-add-modal

# 5. PR 생성
gh pr create --title "[Feat]: 상담 일정 추가 모달" --body "..."
```

### 버그 수정

```bash
git checkout develop && git pull
git checkout -b fix/calendar-timezone-bug

# 수정 & 커밋
git commit -m "[Fix]: 캘린더 시간대 오프셋 계산 수정"

git push -u origin fix/calendar-timezone-bug
gh pr create --title "[Fix]: 캘린더 시간대 버그 수정" --body "..."
```

### 여러 도메인 동시 작업

```bash
# 도메인 A 작업
git checkout -b feat/reports-batch-send
# ... 작업 & 커밋 ...
git push -u origin feat/reports-batch-send
gh pr create ...

# 도메인 B 작업 (develop에서 새로 시작)
git checkout develop && git pull
git checkout -b feat/consultations-script-template
# ... 작업 & 커밋 ...
git push -u origin feat/consultations-script-template
gh pr create ...
```

---

## 체크리스트

### 브랜치 생성 전

- [ ] develop 브랜치가 최신 상태인가?
- [ ] 브랜치명이 작업 내용을 명확히 설명하는가?
- [ ] 하나의 도메인/기능만 다루는 브랜치인가?

### 커밋 전

- [ ] 변경이 하나의 논리적 단위인가?
- [ ] 커밋 메시지가 변경 내용을 명확히 설명하는가?
- [ ] 불필요한 파일이 포함되지 않았는가?

### PR 생성 전

- [ ] 모든 변경사항이 커밋되었는가?
- [ ] 린트/빌드가 통과하는가?
- [ ] PR 제목과 본문이 템플릿을 따르는가?

---

## 참고

- [commit.md](./commit.md) - 커밋 메시지 컨벤션
- [branch.md](./branch.md) - 브랜치 네이밍 컨벤션
- [pull-request-template.md](./pull-request-template.md) - PR 템플릿
- [release-workflow.md](./release-workflow.md) - 릴리즈 워크플로우
