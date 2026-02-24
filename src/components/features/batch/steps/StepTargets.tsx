'use client'

import { useState, useEffect, useCallback, useTransition } from 'react'
import { useToast } from '@/hooks/use-toast'
import { getStudentsForBatchFilter, patchBatchDraft } from '@/app/actions/batch-drafts'
import { TargetFilterPanel, type SchoolLevel } from '../shared/TargetFilterPanel'
import { TargetTable } from '../shared/TargetTable'
import { SelectionSummary } from '../shared/SelectionSummary'
import { WizardNavButtons } from '../wizard/WizardNavButtons'
import type { BatchTarget } from '@/core/types/batch.types'

interface StepTargetsProps {
  draftId: string
  initialTargetIds: string[]
}

export function StepTargets({ draftId, initialTargetIds }: StepTargetsProps) {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()

  const [students, setStudents] = useState<BatchTarget[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(initialTargetIds))
  const [search, setSearch] = useState('')
  const [grade, setGrade] = useState('all')
  const [classId, setClassId] = useState('all')
  const [schoolLevel, setSchoolLevel] = useState<SchoolLevel>('all')
  const [loading, setLoading] = useState(true)

  function getSchoolLevel(g: string | null): SchoolLevel {
    if (!g) return 'all'
    if (g.startsWith('초')) return 'elementary'
    if (g.startsWith('중')) return 'middle'
    if (g.startsWith('고')) return 'high'
    return 'all'
  }

  const loadStudents = useCallback(async () => {
    setLoading(true)
    const result = await getStudentsForBatchFilter({
      grade: grade === 'all' ? undefined : grade,
      classId: classId === 'all' ? undefined : classId,
      search: search || undefined,
    })
    if (result.success && result.data) {
      setStudents(result.data)
    } else {
      toast({ title: '학생 목록 조회 실패', description: result.error ?? '', variant: 'destructive' })
    }
    setLoading(false)
  }, [grade, classId, search, toast])

  useEffect(() => {
    const timer = setTimeout(loadStudents, 300)
    return () => clearTimeout(timer)
  }, [loadStudents])

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
          step: 'action',
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
      />
    </div>
  )
}
