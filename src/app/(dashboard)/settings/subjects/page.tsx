'use client'

import { useState, useEffect } from 'react'
import { PageWrapper } from '@/components/layout/page-wrapper'
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
import { useToast } from '@/hooks/use-toast'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  BookOpen,
  Plus,
  Edit,
  Trash2,
  Loader2,
} from 'lucide-react'
import type { SubjectStatistics } from '@/app/actions/subjects'
import {
  getSubjectsWithStatistics,
  createSubject,
  updateSubject,
  deleteSubject,
} from '@/app/actions/subjects'
import { DEFAULT_SUBJECT_COLORS } from '@/core/types/subject'
import { FEATURES } from '@/lib/features.config'
import { ComingSoon } from '@/components/layout/coming-soon'
import { Maintenance } from '@/components/layout/maintenance'
import { getErrorMessage } from '@/lib/error-handlers'
import { ConfirmationDialog } from '@ui/confirmation-dialog'

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

export default function SubjectsPage() {
  // All Hooks must be called before any early returns
  const [subjects, setSubjects] = useState<SubjectStatistics[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const { toast } = useToast()

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

  // Load subjects
  const loadSubjects = async () => {
    try {
      setLoading(true)
      const result = await getSubjectsWithStatistics()

      if (result.success && result.data) {
        setSubjects(result.data)
      } else {
        throw new Error(result.error || '과목 목록을 불러올 수 없습니다')
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '과목 로드 실패',
        description: getErrorMessage(error),
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSubjects()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Handle add subject
  const handleAddSubject = async (data: SubjectFormValues) => {
    setIsSubmitting(true)
    try {
      const result = await createSubject({
        name: data.name,
        description: data.description || null,
        code: data.code || null,
        color: data.color,
        active: data.active,
        sort_order: subjects.length,
      })

      if (!result.success) {
        throw new Error(result.error || '과목 추가 실패')
      }

      await loadSubjects()
      setIsAddModalOpen(false)
      form.reset()

      toast({
        title: '과목 추가 완료',
        description: `"${data.name}" 과목이 추가되었습니다.`,
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '과목 추가 실패',
        description: getErrorMessage(error),
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle edit subject
  const handleEditSubject = async (data: SubjectFormValues) => {
    if (!editingSubject) return

    setIsSubmitting(true)
    try {
      const result = await updateSubject(editingSubject.id, {
        name: data.name,
        description: data.description || null,
        code: data.code || null,
        color: data.color,
        active: data.active,
      })

      if (!result.success) {
        throw new Error(result.error || '과목 수정 실패')
      }

      await loadSubjects()
      setIsEditModalOpen(false)
      setEditingSubject(null)
      form.reset()

      toast({
        title: '과목 수정 완료',
        description: `"${data.name}" 과목이 수정되었습니다.`,
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '과목 수정 실패',
        description: getErrorMessage(error),
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle delete subject click
  const handleDeleteClick = (subject: Subject) => {
    setSubjectToDelete(subject)
    setDeleteDialogOpen(true)
  }

  // Handle confirm delete
  const handleConfirmDelete = async () => {
    if (!subjectToDelete) return

    setIsDeleting(true)

    try {
      const result = await deleteSubject(subjectToDelete.id)

      if (!result.success) {
        throw new Error(result.error || '과목 삭제 실패')
      }

      await loadSubjects()

      toast({
        title: '과목 삭제 완료',
        description: `"${subjectToDelete.name}" 과목이 삭제되었습니다.`,
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '과목 삭제 실패',
        description: getErrorMessage(error),
      })
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
      setSubjectToDelete(null)
    }
  }

  // Open edit modal
  const openEditModal = (subject: Subject) => {
    setEditingSubject(subject)
    form.reset({
      name: subject.name,
      description: subject.description || '',
      code: subject.code || '',
      color: subject.color,
      active: subject.active,
    })
    setIsEditModalOpen(true)
  }

  // Feature flag checks after all Hooks
  const featureStatus = FEATURES.subjectManagement;

  if (featureStatus === 'inactive') {
    return <ComingSoon featureName="과목 관리" description="학원의 과목을 등록하고 관리하여 수업과 성적 관리에 활용할 수 있는 기능을 준비하고 있습니다." />;
  }

  if (featureStatus === 'maintenance') {
    return <Maintenance featureName="과목 관리" reason="과목 관리 시스템 업데이트가 진행 중입니다." />;
  }

  return (
    <PageWrapper
      title="과목 관리"
      subtitle="학원의 과목을 등록하고 관리합니다"
      icon={<BookOpen className="w-6 h-6" />}
      actions={
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          과목 추가
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>등록된 과목</CardTitle>
          <CardDescription>
            과목은 수업, 성적, 리포트 등 전체 시스템에서 일관되게 사용됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : subjects.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">등록된 과목이 없습니다</p>
              <Button onClick={() => setIsAddModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                첫 과목 추가하기
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>과목명</TableHead>
                  <TableHead>과목 코드</TableHead>
                  <TableHead>설명</TableHead>
                  <TableHead className="text-center">수업 수</TableHead>
                  <TableHead className="text-center">상태</TableHead>
                  <TableHead className="text-right">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subjects.map((subject) => (
                  <TableRow key={subject.id}>
                    <TableCell>
                      <div
                        className="w-8 h-8 rounded-md"
                        style={{ backgroundColor: subject.color }}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{subject.name}</TableCell>
                    <TableCell>
                      {subject.code ? (
                        <Badge variant="outline">{subject.code}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {subject.description || '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{subject.class_count}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {subject.active ? (
                        <Badge>활성</Badge>
                      ) : (
                        <Badge variant="outline">비활성</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditModal(subject as Subject)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(subject as Subject)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Subject Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>과목 추가</DialogTitle>
            <DialogDescription>
              새로운 과목을 등록합니다. 과목 정보는 수업과 성적 관리에 사용됩니다.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAddSubject)} className="space-y-4">
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
                    <FormDescription>
                      짧은 식별자 (선택사항)
                    </FormDescription>
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
                    <FormDescription>
                      차트와 뱃지에 사용될 색상
                    </FormDescription>
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
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={isSubmitting}
                >
                  취소
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSubmitting ? '추가 중...' : '추가'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Subject Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>과목 수정</DialogTitle>
            <DialogDescription>
              과목 정보를 수정합니다.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleEditSubject)} className="space-y-4">
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
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={isSubmitting}
                >
                  취소
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSubmitting ? '저장 중...' : '저장'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="정말로 삭제하시겠습니까?"
        description={subjectToDelete ? `"${subjectToDelete.name}" 과목이 삭제됩니다. 연결된 수업은 과목 정보가 제거됩니다. 이 작업은 되돌릴 수 없습니다.` : ''}
        confirmText="삭제"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
      />
    </PageWrapper>
  )
}
