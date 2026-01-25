# 릴리즈 워크플로우 (develop → main)

이 문서는 develop 브랜치에서 main 브랜치로 배포하는 워크플로우를 설명합니다.

## 브랜치 구조

```
main     ─────●─────────────●─────────────●────► (배포용, 안정 버전)
              ▲             ▲             ▲
              │ 릴리즈      │ 릴리즈      │ 릴리즈
              │             │             │
develop ──●──●──●──●──●──●──●──●──●──●──●──●──► (개발용, 기능 통합)
          ▲  ▲  ▲     ▲  ▲     ▲  ▲  ▲
          │  │  │     │  │     │  │  │
          feature/    fix/     refactor/
          branches    branches branches
```

## 릴리즈 시점

다음 조건을 만족할 때 릴리즈를 진행합니다:

- [ ] 배포할 기능들이 develop에 모두 머지됨
- [ ] CI/CD 파이프라인 통과 (빌드, 린트, 테스트)
- [ ] QA 테스트 완료 (해당되는 경우)
- [ ] 릴리즈 노트 작성 준비 완료

---

## 릴리즈 워크플로우

### 1. 릴리즈 준비

```bash
# develop 브랜치 최신화
git checkout develop
git pull origin develop

# 릴리즈 브랜치 생성 (선택사항, 핫픽스 필요 시)
git checkout -b release/v1.2.0
```

### 2. 버전 업데이트 (Changesets 사용 시)

```bash
# 버전 범프 및 CHANGELOG 생성
pnpm version

# 변경사항 커밋
git add .
git commit -m "[Chore]: v1.2.0 릴리즈 준비"
```

### 3. main으로 머지

```bash
# main 브랜치로 이동
git checkout main
git pull origin main

# develop (또는 release 브랜치) 머지
git merge develop --no-ff -m "Release v1.2.0"

# 또는 PR을 통한 머지 (권장)
gh pr create --base main --head develop \
  --title "Release v1.2.0" \
  --body "## 릴리즈 내용\n- 기능 A\n- 버그 수정 B"
```

### 4. 태그 생성

```bash
# 버전 태그 생성
git tag -a v1.2.0 -m "Release v1.2.0"

# 태그 푸시
git push origin v1.2.0

# main 브랜치 푸시
git push origin main
```

### 5. GitHub 릴리즈 생성

```bash
# GitHub 릴리즈 생성
gh release create v1.2.0 \
  --title "v1.2.0" \
  --notes "## What's Changed
- 기능 A 추가
- 버그 B 수정

**Full Changelog**: https://github.com/AcaDesk/acadesk/compare/v1.1.0...v1.2.0"
```

---

## 버전 규칙 (Semantic Versioning)

```
v{MAJOR}.{MINOR}.{PATCH}

예: v1.2.3
```

| 버전      | 변경 시점                     | 예시            |
| --------- | ----------------------------- | --------------- |
| **MAJOR** | Breaking changes, 대규모 변경 | v1.0.0 → v2.0.0 |
| **MINOR** | 새 기능 추가 (하위 호환)      | v1.0.0 → v1.1.0 |
| **PATCH** | 버그 수정, 핫픽스             | v1.0.0 → v1.0.1 |

---

## 핫픽스 워크플로우

프로덕션에서 긴급 버그 발견 시:

```bash
# 1. main에서 핫픽스 브랜치 생성
git checkout main
git pull origin main
git checkout -b hotfix/critical-bug-fix

# 2. 버그 수정 & 커밋
git commit -m "[Fix]: 긴급 버그 수정"

# 3. main으로 PR 생성 및 머지
gh pr create --base main --head hotfix/critical-bug-fix

# 4. 태그 생성 (패치 버전 증가)
git checkout main
git pull origin main
git tag -a v1.2.1 -m "Hotfix v1.2.1"
git push origin v1.2.1

# 5. develop에도 머지 (중요!)
git checkout develop
git merge main
git push origin develop
```

---

## 롤백 절차

배포 후 문제 발생 시:

### 방법 1: 이전 버전으로 되돌리기

```bash
# 이전 태그로 main 리셋
git checkout main
git reset --hard v1.1.0
git push origin main --force-with-lease
```

### 방법 2: 리버트 커밋

```bash
# 문제 커밋 리버트
git checkout main
git revert <commit-hash>
git push origin main
```

---

## 릴리즈 체크리스트

### 릴리즈 전

- [ ] develop 브랜치 최신 상태 확인
- [ ] CI/CD 파이프라인 통과 확인
- [ ] 테스트 완료
- [ ] 버전 번호 결정
- [ ] CHANGELOG 업데이트

### 릴리즈 중

- [ ] main으로 머지
- [ ] 버전 태그 생성
- [ ] GitHub 릴리즈 생성

### 릴리즈 후

- [ ] 배포 상태 확인
- [ ] 모니터링 확인
- [ ] 팀 공지

---

## 참고

- [micro-strategy.md](./micro-strategy.md) - 마이크로 브랜치 전략
- [commit.md](./commit.md) - 커밋 메시지 컨벤션
- [Semantic Versioning](https://semver.org/lang/ko/)
