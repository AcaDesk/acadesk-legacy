'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ui/tabs'
import { Button } from '@ui/button'
import { Input } from '@ui/input'
import { Label } from '@ui/label'
import { Badge } from '@ui/badge'
import { Checkbox } from '@ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui/select'
import { ScrollArea } from '@ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/error-handlers'
import { GUARDIAN_RELATIONSHIPS } from '@/lib/constants'
import {
  searchGuardians,
  bulkLinkGuardianToStudents,
  getAutoMatchSuggestions,
} from '@/app/actions/guardians'
import type { Student } from './student-table-improved'
import { Search, UserX, Link } from 'lucide-react'

interface BulkGuardianLinkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedStudents: Student[]
  onComplete: () => void
}

interface GuardianOption {
  id: string
  name: string
  phone: string | null
}

interface MatchSuggestion {
  studentId: string
  studentName: string
  guardianId: string
  guardianName: string
  phone: string
  checked: boolean
  relation: string
}

export function BulkGuardianLinkDialog({
  open,
  onOpenChange,
  selectedStudents,
  onComplete,
}: BulkGuardianLinkDialogProps) {
  const { toast } = useToast()

  // 탭 1: 기존 보호자 연결
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [selectedGuardian, setSelectedGuardian] = useState<GuardianOption | null>(null)
  const [relation, setRelation] = useState('')

  // 탭 2: 자동 매칭
  const [suggestions, setSuggestions] = useState<MatchSuggestion[]>([])
  const [autoMatchEnabled, setAutoMatchEnabled] = useState(false)

  // Dialog 열릴 때 초기화
  useEffect(() => {
    if (open) {
      setSearchQuery('')
      setDebouncedQuery('')
      setSelectedGuardian(null)
      setRelation('')
      setSuggestions([])
      setAutoMatchEnabled(false)
    }
  }, [open])

  // 검색어 디바운스 (300ms)
  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery, open])

  // 보호자 검색 쿼리 — 디바운스된 검색어가 key
  const searchGuardiansQuery = useQuery({
    queryKey: ['guardians', 'search', debouncedQuery],
    queryFn: async (): Promise<GuardianOption[]> => {
      const result = await searchGuardians(debouncedQuery || '', 20)
      if (!result.success || !result.data) return []
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return result.data.map((g: any) => {
        const users = Array.isArray(g.users) ? g.users[0] : g.users
        return { id: g.id, name: users?.name || '이름 없음', phone: users?.phone || null }
      })
    },
    enabled: open,
  })
  const guardianOptions = searchGuardiansQuery.data ?? []
  const searchLoading = searchGuardiansQuery.isFetching

  // 자동 매칭 쿼리 — 탭 클릭 시(autoMatchEnabled) 1회 로드
  const autoMatchQuery = useQuery({
    queryKey: ['guardians', 'autoMatch', selectedStudents.map((s) => s.id)],
    queryFn: async () => {
      const result = await getAutoMatchSuggestions(selectedStudents.map((s) => s.id))
      if (!result.success || !result.data) return []
      return result.data
    },
    enabled: open && autoMatchEnabled,
  })
  const autoMatchLoading = autoMatchQuery.isFetching

  // 서버 제안이 도착하면 편집 가능한 로컬 상태로 시딩
  useEffect(() => {
    if (autoMatchQuery.data) {
      setSuggestions(
        autoMatchQuery.data.map((s) => ({ ...s, checked: true, relation: 'mother' }))
      )
    }
  }, [autoMatchQuery.data])

  useEffect(() => {
    if (autoMatchQuery.error) {
      toast({
        title: '자동 매칭 실패',
        description: getErrorMessage(autoMatchQuery.error),
        variant: 'destructive',
      })
    }
  }, [autoMatchQuery.error, toast])

  function loadAutoMatch() {
    setAutoMatchEnabled(true)
  }

  // 탭 1: 연결 실행
  const linkMutation = useMutation({
    mutationFn: async () => {
      const result = await bulkLinkGuardianToStudents(
        selectedGuardian!.id,
        selectedStudents.map((s) => s.id),
        relation
      )
      if (!result.success) throw new Error(result.error)
      return result.data ?? { linkedCount: 0, skippedCount: 0 }
    },
    onSuccess: ({ linkedCount = 0, skippedCount = 0 }) => {
      toast({
        title: '보호자 연결 완료',
        description: `${linkedCount}명 연결됨${skippedCount > 0 ? `, ${skippedCount}명 이미 연결됨 (건너뜀)` : ''}`,
      })
      onComplete()
      onOpenChange(false)
    },
    onError: (error: Error) => {
      toast({ title: '보호자 연결 실패', description: error.message, variant: 'destructive' })
    },
  })
  const linkLoading = linkMutation.isPending

  function handleLink() {
    if (!selectedGuardian) {
      toast({ title: '보호자를 선택해주세요', variant: 'destructive' })
      return
    }
    if (!relation) {
      toast({ title: '관계를 선택해주세요', variant: 'destructive' })
      return
    }
    linkMutation.mutate()
  }

  // 탭 2: 자동 매칭 연결 실행
  const autoLinkMutation = useMutation({
    mutationFn: async (checkedSuggestions: MatchSuggestion[]) => {
      // 보호자별로 그룹화하여 배치 처리
      const byGuardian = new Map<string, { studentIds: string[]; relation: string }>()
      for (const s of checkedSuggestions) {
        if (!byGuardian.has(s.guardianId)) {
          byGuardian.set(s.guardianId, { studentIds: [], relation: s.relation })
        }
        byGuardian.get(s.guardianId)!.studentIds.push(s.studentId)
      }

      let totalLinked = 0
      let totalSkipped = 0
      for (const [guardianId, { studentIds, relation }] of byGuardian) {
        const result = await bulkLinkGuardianToStudents(guardianId, studentIds, relation)
        if (result.success && result.data) {
          totalLinked += result.data.linkedCount ?? 0
          totalSkipped += result.data.skippedCount ?? 0
        }
      }
      return { totalLinked, totalSkipped }
    },
    onSuccess: ({ totalLinked, totalSkipped }) => {
      toast({
        title: '자동 매칭 연결 완료',
        description: `${totalLinked}명 연결됨${totalSkipped > 0 ? `, ${totalSkipped}명 건너뜀` : ''}`,
      })
      onComplete()
      onOpenChange(false)
    },
    onError: (error: Error) => {
      toast({ title: '자동 매칭 연결 실패', description: error.message, variant: 'destructive' })
    },
  })
  const autoLinkLoading = autoLinkMutation.isPending

  function handleAutoLink() {
    const checkedSuggestions = suggestions.filter((s) => s.checked)
    if (!checkedSuggestions.length) {
      toast({ title: '연결할 항목을 선택해주세요', variant: 'destructive' })
      return
    }
    autoLinkMutation.mutate(checkedSuggestions)
  }

  const checkedCount = suggestions.filter(s => s.checked).length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            보호자 일괄 연결
          </DialogTitle>
          <DialogDescription>
            {selectedStudents.length}명의 학생에게 보호자를 연결합니다.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="manual">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">기존 보호자 연결</TabsTrigger>
            <TabsTrigger value="auto" onClick={loadAutoMatch}>
              자동 매칭
            </TabsTrigger>
          </TabsList>

          {/* 탭 1: 기존 보호자 연결 */}
          <TabsContent value="manual" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>보호자 검색</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="이름, 전화번호로 검색..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              {searchLoading && (
                <p className="text-xs text-muted-foreground">검색 중...</p>
              )}
              {guardianOptions.length > 0 && (
                <ScrollArea className="h-40 rounded-md border">
                  <div className="p-1">
                    {guardianOptions.map(g => (
                      <button
                        key={g.id}
                        type="button"
                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors hover:bg-muted ${
                          selectedGuardian?.id === g.id ? 'bg-primary/10 border border-primary/30' : ''
                        }`}
                        onClick={() => setSelectedGuardian(g)}
                      >
                        <span className="font-medium">{g.name}</span>
                        {g.phone && (
                          <span className="ml-2 text-muted-foreground">{g.phone}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              )}
              {!searchLoading && guardianOptions.length === 0 && searchQuery && (
                <p className="text-xs text-muted-foreground">검색 결과가 없습니다.</p>
              )}
            </div>

            {selectedGuardian && (
              <div className="rounded-lg bg-primary/5 border border-primary/20 px-3 py-2 flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium">선택됨: {selectedGuardian.name}</span>
                  {selectedGuardian.phone && (
                    <span className="ml-2 text-xs text-muted-foreground">{selectedGuardian.phone}</span>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedGuardian(null)}>
                  변경
                </Button>
              </div>
            )}

            <div className="space-y-2">
              <Label>관계</Label>
              <Select value={relation} onValueChange={setRelation}>
                <SelectTrigger>
                  <SelectValue placeholder="관계 선택" />
                </SelectTrigger>
                <SelectContent>
                  {GUARDIAN_RELATIONSHIPS.map(r => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>연결 대상 학생 ({selectedStudents.length}명)</Label>
              <ScrollArea className="h-32 rounded-md border">
                <div className="p-2 space-y-1">
                  {selectedStudents.map(s => (
                    <div key={s.id} className="flex items-center gap-2 px-2 py-1 text-sm">
                      <Badge variant="outline" className="text-xs">
                        {s.student_code}
                      </Badge>
                      <span>{s.users?.name || '이름 없음'}</span>
                      {(!s.guardians || s.guardians.length === 0) && (
                        <UserX className="h-3 w-3 text-yellow-500" />
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                취소
              </Button>
              <Button
                onClick={handleLink}
                disabled={linkLoading || !selectedGuardian || !relation}
              >
                {linkLoading ? '연결 중...' : `${selectedStudents.length}명에게 연결`}
              </Button>
            </DialogFooter>
          </TabsContent>

          {/* 탭 2: 자동 매칭 */}
          <TabsContent value="auto" className="space-y-4 mt-4">
            {autoMatchLoading ? (
              <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
                매칭 분석 중...
              </div>
            ) : !autoMatchQuery.isSuccess ? (
              <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
                자동 매칭 탭을 클릭하면 분석이 시작됩니다.
              </div>
            ) : suggestions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-2 text-sm text-muted-foreground">
                <UserX className="h-8 w-8 opacity-40" />
                <p>매칭된 보호자가 없습니다.</p>
                <p className="text-xs">학생의 비상연락처와 일치하는 보호자 전화번호가 없습니다.</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  비상연락처 전화번호 기준으로 {suggestions.length}건의 매칭이 발견되었습니다.
                </p>
                <ScrollArea className="h-64 rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium w-8">
                          <Checkbox
                            checked={checkedCount === suggestions.length}
                            onCheckedChange={checked => {
                              setSuggestions(prev =>
                                prev.map(s => ({ ...s, checked: !!checked }))
                              )
                            }}
                          />
                        </th>
                        <th className="px-3 py-2 text-left font-medium">학생</th>
                        <th className="px-3 py-2 text-left font-medium">보호자</th>
                        <th className="px-3 py-2 text-left font-medium">관계</th>
                      </tr>
                    </thead>
                    <tbody>
                      {suggestions.map((s, idx) => (
                        <tr key={`${s.studentId}-${s.guardianId}`} className="border-t">
                          <td className="px-3 py-2">
                            <Checkbox
                              checked={s.checked}
                              onCheckedChange={checked => {
                                setSuggestions(prev =>
                                  prev.map((item, i) =>
                                    i === idx ? { ...item, checked: !!checked } : item
                                  )
                                )
                              }}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <div className="font-medium">{s.studentName}</div>
                            <div className="text-xs text-muted-foreground">{s.phone}</div>
                          </td>
                          <td className="px-3 py-2">{s.guardianName}</td>
                          <td className="px-3 py-2">
                            <Select
                              value={s.relation}
                              onValueChange={value => {
                                setSuggestions(prev =>
                                  prev.map((item, i) =>
                                    i === idx ? { ...item, relation: value } : item
                                  )
                                )
                              }}
                            >
                              <SelectTrigger className="h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {GUARDIAN_RELATIONSHIPS.map(r => (
                                  <SelectItem key={r.value} value={r.value}>
                                    {r.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{checkedCount}건 선택됨</span>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    취소
                  </Button>
                  <Button
                    onClick={handleAutoLink}
                    disabled={autoLinkLoading || checkedCount === 0}
                  >
                    {autoLinkLoading ? '연결 중...' : `${checkedCount}건 연결`}
                  </Button>
                </DialogFooter>
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
