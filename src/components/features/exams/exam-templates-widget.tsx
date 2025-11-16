'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Button } from '@ui/button'
import { Copy, Plus } from 'lucide-react'

export function ExamTemplatesWidget() {
  const router = useRouter()

  // Mock templates for demonstration
  // In a real implementation, these could be passed as props or fetched
  const templates = [
    { id: '1', name: '주간 쪽지시험' },
    { id: '2', name: '월말 총괄평가' },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>시험 템플릿</CardTitle>
        <CardDescription>
          자주 사용하는 시험 유형을 템플릿으로 저장하고 재사용하세요.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {templates.map((template) => (
          <div
            key={template.id}
            className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
          >
            <p className="text-base font-medium">{template.name}</p>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary"
              title="템플릿 사용"
              onClick={() => router.push('/grades/exam-templates')}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        ))}

        <Button
          variant="outline"
          className="w-full mt-2 border-dashed text-primary hover:text-primary hover:bg-primary/10"
          onClick={() => router.push('/grades/exam-templates')}
        >
          <Plus className="h-4 w-4 mr-2" />
          템플릿 관리
        </Button>
      </CardContent>
    </Card>
  )
}
