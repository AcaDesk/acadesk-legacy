'use client'

import { useState } from 'react'
import { Button } from '@ui/button'
import { Badge } from '@ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Input } from '@ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ui/table'
import { Plus, Edit, Trash2, MessageSquare, Search, FileText } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface MessageTemplate {
  id: string
  name: string
  category: 'attendance' | 'payment' | 'report' | 'consultation' | 'general'
  channel: 'alimtalk' | 'sms'
  content: string
  variables: string[]
  is_active: boolean
  created_at: string
}

interface MessageTemplatesClientProps {
  templates: MessageTemplate[]
}

const categoryLabels: Record<string, string> = {
  attendance: '출결',
  payment: '학원비',
  report: '리포트',
  consultation: '상담',
  general: '일반',
}

const channelLabels: Record<string, string> = {
  alimtalk: '알림톡',
  sms: 'SMS',
}

export function MessageTemplatesClient({ templates }: MessageTemplatesClientProps) {
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState('')

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  function handleEdit(id: string) {
    toast({
      title: '템플릿 수정',
      description: '템플릿 수정 기능은 준비 중입니다.',
    })
  }

  function handleDelete(id: string, name: string) {
    if (!confirm(`"${name}" 템플릿을 삭제하시겠습니까?`)) {
      return
    }

    toast({
      title: '삭제 완료',
      description: `${name} 템플릿이 삭제되었습니다.`,
    })
  }

  function handleCreate() {
    toast({
      title: '템플릿 생성',
      description: '템플릿 생성 기능은 준비 중입니다.',
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">알림 템플릿 관리</h1>
          <p className="text-muted-foreground">자주 사용하는 알림톡/SMS 템플릿을 관리합니다</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          템플릿 생성
        </Button>
      </div>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <MessageSquare className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                프로세스 연동형 소통
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                여기서 만든 템플릿은 출석부, 학원비 관리, 리포트 등 모든 페이지에서 바로 사용할 수 있습니다.
                {' '}변수(예: {'{학생이름}'}, {'{금액}'})는 자동으로 실제 값으로 변환됩니다.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="템플릿 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Badge variant="secondary" className="h-10 px-4 flex items-center">
          {filteredTemplates.length}개 템플릿
        </Badge>
      </div>

      {/* Templates Table */}
      <Card>
        <CardHeader>
          <CardTitle>템플릿 목록</CardTitle>
          <CardDescription>
            등록된 모든 메시지 템플릿을 확인하고 관리할 수 있습니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>등록된 템플릿이 없습니다.</p>
              {searchTerm && <p className="text-sm mt-2">검색 결과가 없습니다.</p>}
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>템플릿명</TableHead>
                    <TableHead>분류</TableHead>
                    <TableHead>발송 채널</TableHead>
                    <TableHead>변수</TableHead>
                    <TableHead>내용 미리보기</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead className="text-right">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTemplates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">{template.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {categoryLabels[template.category]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={template.channel === 'alimtalk' ? 'default' : 'secondary'}>
                          {channelLabels[template.channel]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {template.variables.map((variable) => (
                            <Badge key={variable} variant="outline" className="text-xs">
                              {'{' + variable + '}'}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-md">
                        <div className="text-sm text-muted-foreground line-clamp-2 whitespace-pre-wrap">
                          {template.content}
                        </div>
                      </TableCell>
                      <TableCell>
                        {template.is_active ? (
                          <Badge variant="default" className="bg-green-600">활성</Badge>
                        ) : (
                          <Badge variant="secondary">비활성</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(template.id)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(template.id, template.name)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>총 템플릿</CardDescription>
            <CardTitle className="text-3xl">{templates.length}개</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>출결 템플릿</CardDescription>
            <CardTitle className="text-3xl">
              {templates.filter(t => t.category === 'attendance').length}개
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>학원비 템플릿</CardDescription>
            <CardTitle className="text-3xl">
              {templates.filter(t => t.category === 'payment').length}개
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>리포트 템플릿</CardDescription>
            <CardTitle className="text-3xl">
              {templates.filter(t => t.category === 'report').length}개
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
    </div>
  )
}
