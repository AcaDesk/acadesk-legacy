import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Button } from '@ui/button'
import { Badge } from '@ui/badge'
import { Settings, HelpCircle, AlertTriangle, Trash2, UserX } from 'lucide-react'
import Link from 'next/link'

interface SettingsClientProps {
  systemInfo: {
    version: string
    academyName: string
    plan: string
    lastBackup: string
  }
}

const getPlanLabel = (plan: string) => {
  switch (plan) {
    case 'free':
      return '무료'
    case 'basic':
      return '베이직'
    case 'premium':
      return '프리미엄'
    case 'enterprise':
      return '엔터프라이즈'
    default:
      return '무료'
  }
}

export function SettingsClient({ systemInfo }: SettingsClientProps) {
  return (
    <div className="space-y-6">
      {/* System Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            시스템 정보
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">버전</p>
              <p className="font-medium">{systemInfo.version}</p>
            </div>
            <div>
              <p className="text-muted-foreground">학원명</p>
              <p className="font-medium">{systemInfo.academyName}</p>
            </div>
            <div>
              <p className="text-muted-foreground">플랜</p>
              <Badge variant="default">{getPlanLabel(systemInfo.plan)}</Badge>
            </div>
            <div>
              <p className="text-muted-foreground">마지막 백업</p>
              <p className="font-medium">{systemInfo.lastBackup}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Help & Support */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            도움말 및 지원
          </CardTitle>
          <CardDescription>
            문제가 발생했거나 도움이 필요하신가요?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href="/help/guide">사용자 가이드</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/help/faq">FAQ</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/help/inquiries">고객 지원</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/help/feedback">피드백 보내기</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            위험 구역
          </CardTitle>
          <CardDescription>
            주의: 이 작업들은 되돌릴 수 없습니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start text-destructive border-destructive/20 hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            모든 데이터 초기화
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start text-destructive border-destructive/20 hover:bg-destructive/10"
          >
            <UserX className="h-4 w-4 mr-2" />
            계정 삭제
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
