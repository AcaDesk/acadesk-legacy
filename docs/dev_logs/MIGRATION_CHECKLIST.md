# 피처 플래그 시스템 마이그레이션 체크리스트

전략 패턴을 적용한 새로운 피처 플래그 시스템으로 마이그레이션하는 단계별 가이드입니다.

## 📋 마이그레이션 단계

### ✅ Phase 1: 새 시스템 구축 완료

다음 파일들이 생성되었습니다:

- [x] `src/components/features/FeatureGuard.tsx` - 핵심 가드 컴포넌트
- [x] `src/lib/feature-strategies.tsx` - 상태별 전략 맵
- [x] `src/components/layout/beta-badge.tsx` - 베타 상태 컴포넌트
- [x] `src/components/layout/deprecated.tsx` - 폐지 예정 상태 컴포넌트
- [x] `FEATURE_GUARD_GUIDE.md` - 사용 가이드
- [x] `src/app/(dashboard)/attendance/page.refactored.example.tsx` - 리팩토링 예시

### 🔄 Phase 2: 기존 페이지 마이그레이션 (선택 사항)

현재 if 문을 사용하는 페이지들을 새 방식으로 변경합니다.

#### 마이그레이션 우선순위

**높음 (자주 수정되는 페이지)**
- [ ] `src/app/(dashboard)/attendance/page.tsx`
- [ ] `src/app/(dashboard)/grades/page.tsx`
- [ ] `src/app/(dashboard)/classes/page.tsx`

**중간 (가끔 수정되는 페이지)**
- [ ] `src/app/(dashboard)/guardians/page.tsx`
- [ ] `src/app/(dashboard)/consultations/page.tsx`
- [ ] `src/app/(dashboard)/library/page.tsx`

**낮음 (거의 수정 안 되는 페이지)**
- [ ] `src/app/(dashboard)/reports/page.tsx`
- [ ] `src/app/(dashboard)/notifications/page.tsx`
- [ ] `src/app/(dashboard)/staff/page.tsx`

#### 마이그레이션 템플릿

```tsx
// Before
export default function MyPage() {
  const status = FEATURES.myFeature

  if (status === 'inactive') {
    return <ComingSoon featureName="내 기능" />
  }

  if (status === 'maintenance') {
    return <Maintenance featureName="내 기능" />
  }

  // ... 비즈니스 로직
}

// After
import { FeatureGuard } from '@/components/features/FeatureGuard'

export default function MyPage() {
  return (
    <FeatureGuard
      feature="myFeature"
      featureName="내 기능"
      description="기능 설명"
    >
      <MyPageContent />
    </FeatureGuard>
  )
}

async function MyPageContent() {
  // ... 비즈니스 로직
}
```

### 🧪 Phase 3: 테스트

새로운 피처 상태를 실제로 테스트해봅니다.

#### 테스트 시나리오

1. **Active 상태 테스트**
   ```tsx
   // features.config.ts
   attendanceManagement: 'active' as FeatureStatus
   ```
   - [ ] 정상적으로 페이지 로드
   - [ ] 모든 기능 동작 확인

2. **Inactive 상태 테스트**
   ```tsx
   attendanceManagement: 'inactive' as FeatureStatus
   ```
   - [ ] ComingSoon 페이지 표시
   - [ ] "대시보드로 돌아가기" 버튼 동작

3. **Maintenance 상태 테스트**
   ```tsx
   attendanceManagement: 'maintenance' as FeatureStatus
   ```
   - [ ] Maintenance 페이지 표시
   - [ ] 점검 중 메시지 표시

4. **Beta 상태 테스트**
   ```tsx
   attendanceManagement: 'beta' as FeatureStatus
   ```
   - [ ] 실제 기능 표시
   - [ ] 베타 배지 표시
   - [ ] 피드백 안내 메시지 표시

5. **Deprecated 상태 테스트**
   ```tsx
   attendanceManagement: 'deprecated' as FeatureStatus
   ```
   - [ ] 경고 배너 표시
   - [ ] 실제 기능 표시 (흐릿하게)
   - [ ] 대체 기능 안내

### 🎉 Phase 4: 기존 코드 정리 (선택 사항)

모든 페이지를 마이그레이션한 후:

- [ ] 사용하지 않는 if 문 제거
- [ ] 불필요한 import 제거 (ComingSoon, Maintenance 직접 import)
- [ ] 코드 리뷰 및 통합 테스트

## 🚀 즉시 사용 가능

**중요:** 기존 if 문 방식도 계속 작동합니다. 새 시스템과 공존 가능합니다.

- 새로운 페이지는 FeatureGuard 사용
- 기존 페이지는 필요할 때만 마이그레이션
- 점진적 마이그레이션 권장

## 💡 권장 사항

### 1. 새 페이지는 항상 FeatureGuard 사용

```tsx
// ✅ 권장
export default function NewFeaturePage() {
  return (
    <FeatureGuard feature="newFeature" featureName="새 기능">
      <NewFeatureContent />
    </FeatureGuard>
  )
}

// ❌ 비권장
export default function NewFeaturePage() {
  if (FEATURES.newFeature === 'inactive') {
    return <ComingSoon featureName="새 기능" />
  }
  // ...
}
```

### 2. 기존 페이지는 다음 수정 시 마이그레이션

페이지를 수정해야 할 때:
1. 수정하려는 로직만 변경하지 말고
2. 동시에 FeatureGuard로 마이그레이션
3. 코드 품질 향상

### 3. 팀 컨벤션 설정

```tsx
// team-convention.md에 추가
## 피처 플래그 사용 규칙

1. 모든 새 페이지는 FeatureGuard 사용
2. 기존 페이지 수정 시 FeatureGuard로 마이그레이션
3. if 문 방식은 레거시로 간주
```

## 📊 기대 효과

### Before (기존 시스템)
- 🔴 새 상태 추가 시 모든 페이지 수정 필요
- 🔴 중복 코드 다수
- 🔴 유지보수 어려움
- 🔴 일관성 없는 패턴

### After (새 시스템)
- 🟢 새 상태 추가 시 한 파일만 수정
- 🟢 중복 코드 제거
- 🟢 유지보수 용이
- 🟢 일관된 패턴

### 코드 라인 수 절감

```
평균 페이지당:
- Before: ~150줄 (if 문 포함)
- After: ~130줄 (FeatureGuard 사용)
- 절감: ~13%

전체 프로젝트 (30개 페이지 가정):
- Before: ~4,500줄
- After: ~3,900줄
- 절감: ~600줄 (약 13%)
```

## 🆘 문제 해결

### Q: 기존 코드가 작동하지 않습니다.
A: 기존 if 문 방식도 계속 작동합니다. FeatureGuard는 추가 옵션입니다.

### Q: 모든 페이지를 한번에 마이그레이션해야 하나요?
A: 아니요! 점진적으로 마이그레이션 가능합니다. 새 페이지부터 시작하세요.

### Q: 커스텀 상태를 추가하고 싶습니다.
A: `FEATURE_GUARD_GUIDE.md`의 "새로운 상태 추가하기" 섹션을 참고하세요.

### Q: 테스트는 어떻게 작성하나요?
A: FeatureGuard를 Mock하여 테스트합니다:

```tsx
// MyPage.test.tsx
import { FeatureGuard } from '@/components/features/FeatureGuard'

jest.mock('@/components/features/FeatureGuard', () => ({
  FeatureGuard: ({ children }: any) => children,
}))

// 이제 실제 기능만 테스트하면 됩니다!
```

## 📚 추가 자료

- [FEATURE_GUARD_GUIDE.md](./FEATURE_GUARD_GUIDE.md) - 상세 사용 가이드
- [page.refactored.example.tsx](./src/app/(dashboard)/attendance/page.refactored.example.tsx) - 리팩토링 예시
- [전략 패턴 설명](https://refactoring.guru/design-patterns/strategy)

---

**준비 완료!** 이제 새로운 피처 플래그 시스템을 사용할 수 있습니다. 🎉
