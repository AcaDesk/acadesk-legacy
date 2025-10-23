'use client'

/**
 * 학생 Import 마법사 (메인 컴포넌트)
 */

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Alert, AlertDescription, AlertTitle } from '@ui/alert'
import { Button } from '@ui/button'
import { InfoIcon, CheckCircle } from 'lucide-react'
import { TemplateDownloadButton } from './template-download-button'
import { FileUpload } from './file-upload'
import { ImportPreview } from './import-preview'
import { parseExcelFile, validateImportItems, validateExcelHeaders, downloadErrorReport } from '@/lib/excel-parser'
import { previewStudentImport, confirmStudentImport } from '@/app/actions/student-import'
import type { StudentImportItem } from '@core/domain/entities/StudentImport'
import type { StudentImportPreview } from '@core/domain/value-objects/StudentImportPreview'

type Step = 'upload' | 'preview' | 'complete'

export function StudentImportWizard() {
  const [step, setStep] = useState<Step>('upload')
  const [items, setItems] = useState<StudentImportItem[]>([])
  const [allItems, setAllItems] = useState<StudentImportItem[]>([]) // 오류 리포트용
  const [invalidItems, setInvalidItems] = useState<Array<{ item: StudentImportItem; errors: string[] }>>([])
  const [preview, setPreview] = useState<StudentImportPreview | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ created: number; updated: number } | null>(null)

  /**
   * 파일 선택 시 처리
   */
  const handleFileSelect = async (file: File) => {
    setIsLoading(true)
    setError(null)
    setInvalidItems([])

    try {
      // 1. 헤더 검증 (치명적 오류)
      const headerValidation = await validateExcelHeaders(file)
      if (!headerValidation.valid) {
        setError(
          `필수 항목이 누락되었습니다:\n${headerValidation.missing.join(', ')}\n\n템플릿을 다시 다운로드하여 사용해주세요.`
        )
        return
      }

      // 2. 엑셀 파일 파싱
      const parsedItems = await parseExcelFile(file)

      if (parsedItems.length === 0) {
        setError('파일에 유효한 데이터가 없습니다.')
        return
      }

      if (parsedItems.length > 1000) {
        setError('한 번에 최대 1000명까지만 등록할 수 있습니다.')
        return
      }

      // 3. 클라이언트 측 기본 유효성 검사 (파일 내 중복 포함)
      const validation = validateImportItems(parsedItems)

      // 모든 항목 저장 (오류 리포트용)
      setAllItems(parsedItems)
      setInvalidItems(validation.invalid)

      // 파일 내 중복 경고
      if (validation.duplicatesInFile.length > 0) {
        const dupWarnings = validation.duplicatesInFile
          .slice(0, 3)
          .map(
            (d) =>
              `${d.item.student.name} (${d.item.student.birth_date}) - ${d.item.rowIndex}번 행과 ${d.duplicateIndexes.join(', ')}번 행`
          )
          .join('\n')
        console.warn(
          `파일 내 중복 발견:\n${dupWarnings}${validation.duplicatesInFile.length > 3 ? `\n외 ${validation.duplicatesInFile.length - 3}건...` : ''}\n\n첫 번째 항목만 처리하고 나머지는 건너뜁니다.`
        )
      }

      // 유효성 검사 실패 시
      if (validation.invalid.length > 0) {
        const errorMessages = validation.invalid
          .slice(0, 5)
          .map((v) => `${v.item.rowIndex}번 행: ${v.errors.join(', ')}`)
          .join('\n')
        setError(
          `유효성 검사 실패:\n${errorMessages}${validation.invalid.length > 5 ? `\n외 ${validation.invalid.length - 5}개 오류...` : ''}\n\n아래 "오류 리포트 다운로드" 버튼을 클릭하여 상세 내용을 확인하세요.`
        )
        return
      }

      // 4. 서버에서 미리보기 (중복 검사)
      const jsonItems = validation.valid.map((item) => item.toJSON()) as Array<{
        student: {
          name: string
          birth_date: string
          grade?: string
          school?: string
          student_phone?: string
          student_code?: string
          notes?: string
        }
        guardians: Array<{
          emergency_phone: string
          relationship?: string
          is_primary?: boolean
          can_pickup?: boolean
          can_view_reports?: boolean
        }>
      }>
      const result = await previewStudentImport({ items: jsonItems })

      if (!result.success || !result.data) {
        throw new Error(result.error || '미리보기를 가져올 수 없습니다')
      }

      setItems(validation.valid)
      setPreview(result.data as unknown as StudentImportPreview)
      setStep('preview')
    } catch (err) {
      console.error('파일 처리 오류:', err)
      setError(err instanceof Error ? err.message : '파일 처리 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * 오류 리포트 다운로드
   */
  const handleDownloadErrorReport = () => {
    if (invalidItems.length === 0) return
    try {
      downloadErrorReport(allItems, invalidItems)
    } catch (err) {
      console.error('오류 리포트 다운로드 실패:', err)
      alert('오류 리포트 다운로드에 실패했습니다.')
    }
  }

  /**
   * Import 확정 실행
   */
  const handleConfirm = async (onDuplicate: 'skip' | 'update') => {
    if (!preview) return

    setIsProcessing(true)
    setError(null)

    try {
      const jsonItems = items.map((item) => item.toJSON()) as Array<{
        student: {
          name: string
          birth_date: string
          grade?: string
          school?: string
          student_phone?: string
          student_code?: string
          notes?: string
        }
        guardians: Array<{
          emergency_phone: string
          relationship?: string
          is_primary?: boolean
          can_pickup?: boolean
          can_view_reports?: boolean
        }>
      }>
      const result = await confirmStudentImport({ items: jsonItems, onDuplicate })

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Import에 실패했습니다.')
      }

      setResult({
        created: result.data.created_count || 0,
        updated: result.data.updated_count || 0,
      })
      setStep('complete')
    } catch (err) {
      console.error('Import 실행 오류:', err)
      setError(err instanceof Error ? err.message : 'Import 실행 중 오류가 발생했습니다.')
    } finally {
      setIsProcessing(false)
    }
  }

  /**
   * 처음으로 돌아가기
   */
  const handleReset = () => {
    setStep('upload')
    setItems([])
    setPreview(null)
    setError(null)
    setResult(null)
  }

  return (
    <div className="space-y-6">
      {/* 안내 메시지 */}
      {step === 'upload' && (
        <>
          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertTitle>학생 일괄 등록 안내</AlertTitle>
            <AlertDescription>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
                <li>엑셀 템플릿을 다운로드하여 학생 정보를 입력하세요.</li>
                <li>작성한 파일을 업로드하면 자동으로 분석됩니다.</li>
                <li>미리보기에서 신규/중복/오류를 확인한 후 최종 가져오기를 진행합니다.</li>
                <li>중복 학생은 건너뛰거나 정보를 업데이트할 수 있습니다.</li>
              </ul>
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle>1단계: 템플릿 다운로드</CardTitle>
              <CardDescription>
                엑셀 템플릿을 다운로드하여 학생 정보를 입력하세요.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TemplateDownloadButton />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2단계: 파일 업로드</CardTitle>
              <CardDescription>작성한 엑셀 파일을 업로드하세요.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
                    <p className="mt-2 text-sm text-muted-foreground">파일 분석 중...</p>
                  </div>
                </div>
              ) : (
                <FileUpload onFileSelect={handleFileSelect} />
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* 미리보기 */}
      {step === 'preview' && preview && (
        <Card>
          <CardHeader>
            <CardTitle>3단계: 미리보기 및 확인</CardTitle>
            <CardDescription>
              분석 결과를 확인하고 최종 가져오기를 진행하세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ImportPreview
              preview={preview}
              items={items}
              onConfirm={handleConfirm}
              onCancel={handleReset}
              isProcessing={isProcessing}
            />
          </CardContent>
        </Card>
      )}

      {/* 완료 */}
      {step === 'complete' && result && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-green-500" />
              <CardTitle>가져오기 완료</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>성공적으로 처리되었습니다</AlertTitle>
              <AlertDescription>
                <ul className="mt-2 space-y-1">
                  <li>• 신규 등록: {result.created}명</li>
                  {result.updated > 0 && <li>• 정보 업데이트: {result.updated}명</li>}
                </ul>
              </AlertDescription>
            </Alert>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={handleReset}>
                추가로 가져오기
              </Button>
              <Button onClick={() => (window.location.href = '/students')}>
                학생 목록으로
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 에러 메시지 */}
      {error && (
        <Alert variant="destructive">
          <AlertTitle>오류</AlertTitle>
          <AlertDescription className="whitespace-pre-line">{error}</AlertDescription>
          {invalidItems.length > 0 && (
            <div className="mt-4">
              <Button variant="outline" size="sm" onClick={handleDownloadErrorReport}>
                오류 리포트 다운로드
              </Button>
              <p className="mt-2 text-xs text-muted-foreground">
                다운로드한 파일에서 "⚠️ 오류 내용" 컬럼을 확인하여 수정 후 다시 업로드하세요.
              </p>
            </div>
          )}
        </Alert>
      )}
    </div>
  )
}
