'use client'

import { useState, useMemo } from 'react'
import { Button } from '@ui/button'
import { Input } from '@ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@ui/form'
import { Textarea } from '@ui/textarea'
import { Switch } from '@ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ui/table'
import { Badge } from '@ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui/select'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  BookOpen,
  Plus,
  Edit,
  Trash2,
  Loader2,
  MoreVertical,
  Search,
  Filter,
} from 'lucide-react'
import type { SubjectStatistics } from '@/app/actions/subjects'
import { DEFAULT_SUBJECT_COLORS } from '@/core/types/subject'
import { ConfirmationDialog } from '@ui/confirmation-dialog'
import { EmptyState, NoSearchResultsEmptyState } from '@ui/empty-state'
import { useSubjectsWithStatsQuery } from '@/hooks/queries/use-subjects-query'
import {
  useCreateSubjectMutation,
  useUpdateSubjectMutation,
  useDeleteSubjectMutation,
} from '@/hooks/mutations/use-subjects-mutations'

interface Subject {
  id: string
  name: string
  description: string | null
  code: string | null
  color: string
  active: boolean
}

const subjectFormSchema = z.object({
  name: z.string().min(1, '과목명을 입력해주세요'),
  description: z.string().optional(),
  code: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, '올바른 색상 코드를 입력해주세요'),
  active: z.boolean(),
})

type SubjectFormValues = z.infer<typeof subjectFormSchema>

interface SubjectsClientProps {
  initialSubjects: SubjectStatistics[]
}

type DialogState =
  | { type: 'closed' }
  | { type: 'create' }
  | { type: 'edit'; subject: Subject }
  | { type: 'delete'; subject: Subject }

export function SubjectsClient({ initialSubjects }: SubjectsClientProps) {
  const { data: subjects = [] } = useSubjectsWithStatsQuery(initialSubjects)
  const createMutation = useCreateSubjectMutation()
  const updateMutation = useUpdateSubjectMutation()
  const deleteMutation = useDeleteSubjectMutation()

  const [dialog, setDialog] = useState<DialogState>({ type: 'closed' })
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  const form = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectFormSchema),
    defaultValues: {
      name: '',
      description: '',
      code: '',
      color: DEFAULT_SUBJECT_COLORS[0],
      active: true,
    },
  })

  const isFormDialogOpen = dialog.type === 'create' || dialog.type === 'edit'
  const isDeleteDialogOpen = dialog.type === 'delete'
  const editingSubject = dialog.type === 'edit' ? dialog.subject : null
  const subjectToDelete = dialog.type === 'delete' ? dialog.subject : null

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  function openCreateDialog() {
    form.reset({
      name: '',
      description: '',
      code: '',
      color: DEFAULT_SUBJECT_COLORS[0],
      active: true,
    })
    setDialog({ type: 'create' })
  }

  function openEditDialog(subject: Subject) {
    form.reset({
      name: subject.name,
      description: subject.description || '',
      code: subject.code || '',
      color: subject.color,
      active: subject.active,
    })
    setDialog({ type: 'edit', subject })
  }

  function closeDialog() {
    setDialog({ type: 'closed' })
    form.reset()
  }

  async function handleFormSubmit(data: SubjectFormValues) {
    if (dialog.type === 'edit') {
      await updateMutation.mutateAsync(
        {
          id: dialog.subject.id,
          input: {
            name: data.name,
            description: data.description || null,
            code: data.code || null,
            color: data.color,
            active: data.active,
          },
        },
        {
          onSuccess: () => closeDialog(),
        },
      )
    } else {
      await createMutation.mutateAsync(
        {
          name: data.name,
          description: data.description || null,
          code: data.code || null,
          color: data.color,
          active: data.active,
          sort_order: subjects.length,
        },
        {
          onSuccess: () => closeDialog(),
        },
      )
    }
  }

  async function handleConfirmDelete() {
    if (!subjectToDelete) return
    await deleteMutation.mutateAsync(
      { id: subjectToDelete.id, name: subjectToDelete.name },
      {
        onSuccess: () => closeDialog(),
      },
    )
  }

  const filteredSubjects = useMemo(() => {
    let result = subjects

    if (statusFilter !== 'all') {
      result = result.filter((subject) =>
        statusFilter === 'active' ? subject.active : !subject.active
      )
    }

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase()
      result = result.filter(
        (subject) =>
          subject.name.toLowerCase().includes(lowerSearch) ||
          subject.code?.toLowerCase().includes(lowerSearch) ||
          subject.description?.toLowerCase().includes(lowerSearch)
      )
    }

    return result
  }, [subjects, statusFilter, searchTerm])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">과목 관리</h2>
          <p className="text-sm text-muted-foreground">학원의 과목을 등록하고 관리합니다</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="w-4 h-4 mr-2" />
          과목 추가
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>등록된 과목</CardTitle>
          <CardDescription>
            과목은 수업, 성적, 리포트 등 전체 시스템에서 일관되게 사용됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {subjects.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="등록된 과목이 없습니다"
              description="학원에서 다룰 과목을 먼저 등록해 두면 수업·성적·리포트에서 일관되게 활용할 수 있습니다"
              action={
                <Button onClick={openCreateDialog}>
                  <Plus className="w-4 h-4 mr-2" />
                  첫 과목 추가하기
                </Button>
              }
            />
          ) : (
            <div className="space-y-4">
              {/* Search and Filter Bar */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="과목명, 코드, 설명으로 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select
                  value={statusFilter}
                  onValueChange={(value: 'all' | 'active' | 'inactive') =>
                    setStatusFilter(value)
                  }
                >
                  <SelectTrigger className="w-full sm:w-[160px]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 상태</SelectItem>
                    <SelectItem value="active">활성만</SelectItem>
                    <SelectItem value="inactive">비활성만</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Results Count */}
              {(searchTerm || statusFilter !== 'all') && (
                <div className="text-sm text-muted-foreground">
                  {filteredSubjects.length}개의 과목{' '}
                  {searchTerm && `"${searchTerm}" 검색 결과`}
                </div>
              )}

              {/* Table */}
              {filteredSubjects.length === 0 ? (
                <NoSearchResultsEmptyState
                  icon={Search}
                  searchTerm={searchTerm || undefined}
                  onClearSearch={() => {
                    setSearchTerm('')
                    setStatusFilter('all')
                  }}
                />
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>과목</TableHead>
                        <TableHead className="hidden md:table-cell">설명</TableHead>
                        <TableHead className="text-center">수업 수</TableHead>
                        <TableHead className="text-center">상태</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSubjects.map((subject) => (
                        <TableRow key={subject.id}>
                          {/* Subject with Color */}
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div
                                className="w-10 h-10 rounded-lg flex-shrink-0"
                                style={{ backgroundColor: subject.color }}
                              />
                              <div className="min-w-0 flex-1">
                                <p className="font-medium">{subject.name}</p>
                                {subject.code && (
                                  <Badge variant="outline" className="mt-1">
                                    {subject.code}
                                  </Badge>
                                )}
                                {/* Show description on mobile */}
                                {subject.description && (
                                  <p className="md:hidden text-sm text-muted-foreground mt-1 line-clamp-1">
                                    {subject.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          {/* Description (desktop only) */}
                          <TableCell className="hidden md:table-cell">
                            {subject.description ? (
                              <p
                                className="text-sm text-muted-foreground line-clamp-2"
                                title={subject.description}
                              >
                                {subject.description}
                              </p>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>

                          {/* Class Count */}
                          <TableCell className="text-center">
                            <Badge variant="secondary" className="font-mono">
                              {subject.class_count}
                            </Badge>
                          </TableCell>

                          {/* Status */}
                          <TableCell className="text-center">
                            {subject.active ? (
                              <Badge className="bg-success/10 text-success hover:bg-success/20">
                                활성
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground">
                                비활성
                              </Badge>
                            )}
                          </TableCell>

                          {/* Actions */}
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => openEditDialog(subject as Subject)}
                                >
                                  <Edit className="w-4 h-4 mr-2" />
                                  수정
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => setDialog({ type: 'delete', subject: subject as Subject })}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  삭제
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Subject Modal */}
      <Dialog
        open={isFormDialogOpen}
        onOpenChange={(open) => {
          if (!open) closeDialog()
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSubject ? '과목 수정' : '과목 추가'}</DialogTitle>
            <DialogDescription>
              {editingSubject
                ? '과목 정보를 수정합니다.'
                : '새로운 과목을 등록합니다. 과목 정보는 수업과 성적 관리에 사용됩니다.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>과목명 *</FormLabel>
                    <FormControl>
                      <Input placeholder="예: 수학, 영어" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>과목 코드</FormLabel>
                    <FormControl>
                      <Input placeholder="예: MATH, ENG" {...field} />
                    </FormControl>
                    <FormDescription>짧은 식별자 (선택사항)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>대표 색상 *</FormLabel>
                    <div className="flex items-center gap-2">
                      <FormControl>
                        <Input type="color" className="w-20 h-10" {...field} />
                      </FormControl>
                      <Input
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="#3b82f6"
                        className="flex-1"
                      />
                    </div>
                    <div className="flex gap-2 mt-2">
                      {DEFAULT_SUBJECT_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          className="w-8 h-8 rounded-md border-2 border-transparent hover:border-primary"
                          style={{ backgroundColor: color }}
                          onClick={() => form.setValue('color', color)}
                        />
                      ))}
                    </div>
                    <FormDescription>차트와 뱃지에 사용될 색상</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>설명</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="과목에 대한 설명을 입력하세요"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">활성화</FormLabel>
                      <FormDescription>
                        비활성화하면 수업 등록 시 선택할 수 없습니다
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeDialog}
                  disabled={isSubmitting}
                >
                  취소
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSubmitting
                    ? (editingSubject ? '저장 중...' : '추가 중...')
                    : (editingSubject ? '저장' : '추가')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          if (!open) closeDialog()
        }}
        title="정말로 삭제하시겠습니까?"
        description={
          subjectToDelete
            ? `"${subjectToDelete.name}" 과목이 삭제됩니다. 연결된 수업은 과목 정보가 제거됩니다. 이 작업은 되돌릴 수 없습니다.`
            : ''
        }
        confirmText="삭제"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}
