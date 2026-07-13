'use client'

import { useState, useEffect, useTransition } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'
import { getStudentsForBatchFilter, patchBatchDraft } from '@/app/actions/batch'
import { queryKeys } from '@/lib/query-keys'
import { TargetFilterPanel, type SchoolLevel } from '../shared/TargetFilterPanel'
import { TargetTable } from '../shared/TargetTable'
import { SelectionSummary } from '../shared/SelectionSummary'
import { WizardNavButtons } from '../wizard/WizardNavButtons'
import type { BatchTarget, BatchActionType } from '@/core/types/batch.types'

interface StepTargetsProps {
  draftId: string
  initialTargetIds: string[]
  presetActionType?: BatchActionType | null
}

export function StepTargets({ draftId, initialTargetIds, presetActionType }: StepTargetsProps) {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(initialTargetIds))
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [grade, setGrade] = useState('all')
  const [classId, setClassId] = useState('all')
  const [schoolLevel, setSchoolLevel] = useState<SchoolLevel>('all')

  function getSchoolLevel(g: string | null): SchoolLevel {
    if (!g) return 'all'
    if (g.startsWith('초')) return 'elementary'
    if (g.startsWith('중')) return 'middle'
    if (g.startsWith('고')) return 'high'
    return 'all'
  }

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const studentsQuery = useQuery({
    queryKey: queryKeys.batch.targets({ grade, classId, search: debouncedSearch }),
    queryFn: async (): Promise<BatchTarget[]> => {
      const result = await getStudentsForBatchFilter({
        grade: grade === 'all' ? undefined : grade,
        classId: classId === 'all' ? undefined : classId,
        search: debouncedSearch || undefined,
      })
      if (!result.success || !result.data) {
        throw new Error(result.error || '학생 목록 조회 실패')
      }
      return result.data
    },
    placeholderData: keepPreviousData,
  })
  const students = studentsQuery.data ?? []
  const loading = studentsQuery.isPending

  const grades = [...new Set(students.map((s) => s.grade).filter(Boolean))] as string[]
  const classes = [...new Map(
    students
      .filter((s) => s.class_id && s.class_name)
      .map((s) => [s.class_id!, { id: s.class_id!, name: s.class_name! }])
  ).values()]

  const filteredStudents = schoolLevel === 'all'
    ? students
    : students.filter((s) => getSchoolLevel(s.grade) === schoolLevel)

  const handleNext = async (): Promise<boolean> => {
    if (selectedIds.size === 0) {
      toast({ title: '대상을 1명 이상 선택해주세요.', variant: 'destructive' })
      return false
    }

    return new Promise<boolean>((resolve) => {
      startTransition(async () => {
        const result = await patchBatchDraft(draftId, {
          target_ids: Array.from(selectedIds),
          target_snapshot_count: selectedIds.size,
          step: presetActionType ? 'options' : 'action',
        })
        if (!result.success) {
          toast({ title: '저장 실패', description: result.error ?? '', variant: 'destructive' })
          resolve(false)
        } else {
          resolve(true)
        }
      })
    })
  }

  return (
    <div className="space-y-6">
      <SelectionSummary totalCount={filteredStudents.length} selectedCount={selectedIds.size} />

      <TargetFilterPanel
        search={search}
        onSearchChange={setSearch}
        grade={grade}
        onGradeChange={setGrade}
        classId={classId}
        onClassIdChange={setClassId}
        grades={grades}
        classes={classes}
        schoolLevel={schoolLevel}
        onSchoolLevelChange={setSchoolLevel}
      />

      {loading ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground">
          불러오는 중...
        </div>
      ) : studentsQuery.isError ? (
        <div className="flex items-center justify-center h-48 text-destructive">
          학생 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
        </div>
      ) : (
        <TargetTable
          students={filteredStudents}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
        />
      )}

      <WizardNavButtons
        draftId={draftId}
        currentStep="targets"
        onNext={handleNext}
        isNextDisabled={selectedIds.size === 0}
        isLoading={isPending}
        overrideNextStep={presetActionType ? 'options' : undefined}
      />
    </div>
  )
}
