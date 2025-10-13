import { Suspense } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageWrapper } from "@/components/layout/page-wrapper"
import { GuardianList } from '@/components/features/guardians/guardian-list'
import { FEATURES } from '@/lib/features.config'
import { ComingSoon } from '@/components/layout/coming-soon'

export default function GuardiansPage() {
  // 피처 플래그 체크
  if (!FEATURES.guardianManagement) {
    return <ComingSoon featureName="보호자 관리" description="학부모 및 보호자 정보를 체계적으로 관리하고, 효과적인 소통을 지원하는 기능을 준비하고 있습니다." />;
  }
  return (
    <PageWrapper>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">보호자 관리</h1>
            <p className="text-muted-foreground">학부모 및 보호자 정보를 관리합니다</p>
          </div>
          <Link href="/guardians/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              보호자 추가
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>전체 보호자 목록</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div className="text-center py-8">로딩 중...</div>}>
              <GuardianList />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  )
}
