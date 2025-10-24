'use client'

/**
 * Import 미리보기 컴포넌트
 */

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Badge } from '@ui/badge'
import { Button } from '@ui/button'
import { RadioGroup, RadioGroupItem } from '@ui/radio-group'
import { Label } from '@ui/label'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@ui/accordion'
import { Alert, AlertDescription, AlertTitle } from '@ui/alert'
import { CheckCircle, AlertCircle, XCircle } from 'lucide-react'
import type { StudentImportPreview } from '@/core/types/student-import-preview'
import type { StudentImportItem } from '@/core/types/student-import'

interface ImportPreviewProps {
  preview: StudentImportPreview
  items: StudentImportItem[]
  onConfirm: (onDuplicate: 'skip' | 'update') => void
  onCancel: () => void
  isProcessing?: boolean
}

export function ImportPreview({
  preview,
  items,
  onConfirm,
  onCancel,
  isProcessing = false,
}: ImportPreviewProps) {
  const [duplicateStrategy, setDuplicateStrategy] = useState<'skip' | 'update'>('skip')

  const summary = preview.summary

  if (!summary) {
    return null
  }

  const processableCount = preview.getProcessableCount(duplicateStrategy)

  return (
    <div className="space-y-6">
      {/* 요약 카드 */}
      <Card>
        <CardHeader>
          <CardTitle>분석 결과</CardTitle>
          <CardDescription>총 {summary.total}개 행을 분석했습니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">신규 등록</p>
                <p className="text-2xl font-bold">{summary.newCount}명</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">중복 발견</p>
                <p className="text-2xl font-bold">{summary.dupCount}명</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">오류</p>
                <p className="text-2xl font-bold">{summary.errorCount}명</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">처리 예정</p>
                <p className="text-2xl font-bold">{processableCount}명</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 오류 목록 */}
      {preview.hasErrors() && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>오류가 발견되었습니다</AlertTitle>
          <AlertDescription>
            <div className="mt-2 space-y-1">
              {preview.errors.map((error, index) => (
                <div key={index} className="text-sm">
                  • {error.rowIndex}번 행: {error.reason}
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* 중복 처리 전략 선택 */}
      {preview.hasDuplicates() && (
        <Card>
          <CardHeader>
            <CardTitle>중복 처리 방식</CardTitle>
            <CardDescription>
              이미 등록된 학생({summary.dupCount}명)을 어떻게 처리할까요?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup value={duplicateStrategy} onValueChange={(v) => setDuplicateStrategy(v as 'skip' | 'update')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="skip" id="skip" />
                <Label htmlFor="skip" className="font-normal">
                  건너뛰기 (기존 정보 유지) - 권장
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="update" id="update" />
                <Label htmlFor="update" className="font-normal">
                  덮어쓰기 (엑셀 파일 정보로 업데이트)
                </Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {/* 상세 내역 */}
      <Accordion type="single" collapsible className="w-full">
        {/* 신규 학생 */}
        {summary.newCount > 0 && (
          <AccordionItem value="new">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <Badge variant="default">{summary.newCount}</Badge>
                <span>신규 등록 예정 학생</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                {preview.newStudents.slice(0, 10).map((item, index) => (
                  <div key={index} className="rounded-lg border p-3 text-sm">
                    <p className="font-medium">
                      {item.student.name} ({item.student.birth_date})
                    </p>
                    {item.student.school && (
                      <p className="text-muted-foreground">{item.student.school}</p>
                    )}
                    {item.guardians.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        보호자: {item.guardians.map((g) => g.name).join(', ')}
                      </p>
                    )}
                  </div>
                ))}
                {preview.newStudents.length > 10 && (
                  <p className="text-sm text-muted-foreground">
                    외 {preview.newStudents.length - 10}명...
                  </p>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* 중복 학생 */}
        {summary.dupCount > 0 && (
          <AccordionItem value="duplicates">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{summary.dupCount}</Badge>
                <span>중복 학생</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                {preview.duplicateStudents.slice(0, 10).map((item, index) => (
                  <div key={index} className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm dark:border-yellow-900 dark:bg-yellow-950">
                    <p className="font-medium">
                      {item.student.name} ({item.student.birth_date})
                    </p>
                    <div className="mt-2 grid gap-1 text-xs">
                      {item.student.school !== item.existingStudent.school && (
                        <p>
                          학교: <span className="text-muted-foreground">{item.existingStudent.school}</span> →{' '}
                          <span className="font-medium">{item.student.school}</span>
                        </p>
                      )}
                      {item.student.grade !== item.existingStudent.grade && (
                        <p>
                          학년: <span className="text-muted-foreground">{item.existingStudent.grade}</span> →{' '}
                          <span className="font-medium">{item.student.grade}</span>
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {preview.duplicateStudents.length > 10 && (
                  <p className="text-sm text-muted-foreground">
                    외 {preview.duplicateStudents.length - 10}명...
                  </p>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>

      {/* 액션 버튼 */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel} disabled={isProcessing}>
          취소
        </Button>
        <Button
          onClick={() => onConfirm(duplicateStrategy)}
          disabled={isProcessing || !preview.hasImportableData()}
        >
          {isProcessing ? '처리 중...' : `${processableCount}명 가져오기 확인`}
        </Button>
      </div>
    </div>
  )
}
