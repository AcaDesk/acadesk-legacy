'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Edit, Phone, Mail, Users as UsersIcon, UserCircle, ChevronRight } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { PageWrapper } from "@/components/layout/page-wrapper"
import { FEATURES } from '@/lib/features.config'
import { ComingSoon } from '@/components/layout/coming-soon'
import { Maintenance } from '@/components/layout/maintenance'

interface GuardianDetail {
  id: string
  relationship: string | null
  users: {
    name: string
    email: string | null
    phone: string | null
  } | null
  student_guardians: Array<{
    is_primary: boolean
    students: {
      id: string
      student_code: string
      grade: string | null
      users: {
        name: string
      } | null
    } | null
  }>
}

export default function GuardianDetailPage() {
  // All Hooks must be called before any early returns
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const [guardian, setGuardian] = useState<GuardianDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (params.id) {
      loadGuardianDetail(params.id as string)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  // Function definitions
  async function loadGuardianDetail(guardianId: string) {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('guardians')
        .select(`
          id,
          relationship,
          users (
            name,
            email,
            phone
          ),
          student_guardians (
            is_primary,
            students (
              id,
              student_code,
              grade,
              users (
                name
              )
            )
          )
        `)
        .eq('id', guardianId)
        .maybeSingle()

      if (error) {
        console.error('Error fetching guardian:', error)
        throw error
      }

      if (!data) {
        throw new Error('보호자 정보를 찾을 수 없습니다.')
      }

      setGuardian(data as GuardianDetail)
    } catch (error) {
      console.error('Error loading guardian:', error)
      toast({
        title: '데이터 로드 오류',
        description: '보호자 정보를 불러오는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // Feature flag checks after all Hooks
  const featureStatus = FEATURES.guardianManagement;

  if (featureStatus === 'inactive') {
    return <ComingSoon featureName="보호자 상세" description="보호자 정보와 연결된 학생 목록을 확인하고 관리할 수 있는 기능을 준비하고 있습니다." />;
  }

  if (featureStatus === 'maintenance') {
    return <Maintenance featureName="보호자 상세" reason="보호자 관리 시스템 업데이트가 진행 중입니다." />;
  }

  if (loading) {
    return (
      <PageWrapper>
        <div className="text-center py-12">로딩 중...</div>
      </PageWrapper>
    )
  }

  if (!guardian) {
    return (
      <PageWrapper>
        <div className="text-center py-12">
          <p className="text-muted-foreground">보호자를 찾을 수 없습니다.</p>
          <Button className="mt-4" onClick={() => router.push('/guardians')}>
            목록으로 돌아가기
          </Button>
        </div>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-4">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <button onClick={() => router.push('/guardians')} className="hover:text-foreground transition-colors">
              보호자 관리
            </button>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground font-medium">{guardian.users?.name || '이름 없음'}</span>
          </nav>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">{guardian.users?.name || '이름 없음'}</h1>
              <p className="text-muted-foreground">
                {guardian.relationship ? `${guardian.relationship} · ` : ''}보호자
              </p>
            </div>
            <Button onClick={() => router.push(`/guardians/${guardian.id}/edit`)}>
              <Edit className="h-4 w-4 mr-2" />
              수정
            </Button>
          </div>
        </div>

        {/* Basic Info Cards */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">연락처 정보</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {guardian.users?.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{guardian.users.phone}</span>
                  </div>
                )}
                {guardian.users?.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{guardian.users.email}</span>
                  </div>
                )}
                {!guardian.users?.phone && !guardian.users?.email && (
                  <p className="text-sm text-muted-foreground">연락처 정보 없음</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">관계 정보</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <UserCircle className="h-4 w-4 text-muted-foreground" />
                {guardian.relationship ? (
                  <Badge variant="outline">{guardian.relationship}</Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">관계 정보 없음</span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="students" className="space-y-4">
          <TabsList>
            <TabsTrigger value="students">연결된 학생</TabsTrigger>
          </TabsList>

          {/* Students Tab */}
          <TabsContent value="students">
            <Card>
              <CardHeader>
                <CardTitle>연결된 학생 목록</CardTitle>
              </CardHeader>
              <CardContent>
                {guardian.student_guardians && guardian.student_guardians.length > 0 ? (
                  <div className="space-y-3">
                    {guardian.student_guardians.map((sg, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between border-b pb-3 last:border-0"
                      >
                        <div className="flex items-center gap-4">
                          <UsersIcon className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="flex items-center gap-2">
                              <div className="font-medium">
                                {sg.students?.users?.name || '이름 없음'}
                              </div>
                              {sg.is_primary && (
                                <Badge variant="default" className="text-xs">
                                  주 보호자
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {sg.students?.student_code || '학번 없음'}
                              {sg.students?.grade && ` · ${sg.students.grade}`}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            sg.students?.id && router.push(`/students/${sg.students.id}`)
                          }
                        >
                          학생 상세
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <UsersIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-sm text-muted-foreground">연결된 학생이 없습니다.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageWrapper>
  )
}
