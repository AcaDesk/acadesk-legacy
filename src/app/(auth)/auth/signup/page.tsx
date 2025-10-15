import SignupForm from "@/components/auth/SignupForm"
import { Card, CardContent } from "@/components/ui/card"
import { getFeatureStatus } from "@/lib/features.config"
import { getFeatureStrategy } from "@/lib/feature-strategies"

export default function SignupPage() {
  const signupStatus = getFeatureStatus('signup')
  const strategy = getFeatureStrategy(signupStatus)

  // 피처 플래그에 따라 적절한 컴포넌트 렌더링
  return strategy({
    featureName: '회원가입',
    description: '현재 1차 MVP 출시 준비 중입니다. 계정은 관리자가 직접 발급해 드립니다.',
    children: (
      <Card>
        <CardContent className="pt-6">
          <SignupForm />
        </CardContent>
      </Card>
    ),
  })
}
