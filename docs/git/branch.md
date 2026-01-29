## 브랜치 컨벤션

**`type/description`**

---

### 구성 요소

- **`type`**: **이슈/커밋 타입**과 동일한 접두사를 소문자로 사용합니다.
  - `feat`: 새로운 기능 구현
  - `fix`: 버그 수정
  - `refactor`: 코드 리팩토링
  - `design`: UI 구현 및 뷰 관련 수정
  - `chore`: 잡무성 작업 (빌드, 환경설정 등)
  - `docs`: 문서 작업
  - `test`: 테스트 코드
  - `perf`: 성능 개선
  - `setting`: 프로젝트 세팅
  - ... 등 기존 타입을 모두 활용합니다.
- **`description`**: 작업 내용을 명확하게 알 수 있도록 **케밥 케이스(kebab-case)**로 작성합니다.
  - 띄어쓰기 대신 하이픈()을 사용합니다.
  - 가능한 간결하고 명확하게 작성합니다.

---

### 브랜치 이름 예시

- **기능 구현**: `feat/login-with-social-account`
- **버그 수정**: `fix/image-caching-error`
- **리팩토링**: `refactor/separate-viewmodel-logic`
- **UI 구현**: `design/add-splash-screen-animation`
- **환경 설정**: `chore/setup-ci-workflow`
