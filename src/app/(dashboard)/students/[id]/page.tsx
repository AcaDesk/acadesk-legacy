'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowLeft,
  Edit,
  Phone,
  Mail,
  Calendar,
  GraduationCap,
  BookOpen,
  Users,
  FileText,
  Send,
  TrendingUp,
  CheckCircle,
  Target,
  Cake,
  User,
  MapPin,
  Briefcase,
} from 'lucide-react'
import { differenceInYears, format as formatDate } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useToast } from '@/hooks/use-toast'
import { getStudentAvatar } from '@/lib/avatar'
import { PageWrapper } from "@/components/layout/page-wrapper"
import { DAYS_OF_WEEK, getAttendanceStatusInfo } from '@/lib/constants'
import { ManageGuardiansDialog } from '@/components/features/students/manage-guardians-dialog'
import { ManageClassesDialog } from '@/components/features/students/manage-classes-dialog'
import { GradesLineChart } from '@/components/features/charts/grades-line-chart'
import { TodoCompletionDonut } from '@/components/features/charts/todo-completion-donut'
import { AttendanceHeatmap } from '@/components/features/charts/attendance-heatmap'
import { SubjectRadarChart } from '@/components/features/charts/subject-radar-chart'
import { ActivityTimeline } from '@/components/features/students/activity-timeline'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ProfileImageUpload } from '@/components/ui/profile-image-upload'
import { motion, AnimatePresence } from 'motion/react'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface StudentDetail {
  id: string
  student_code: string
  grade: string | null
  school: string | null
  enrollment_date: string
  birth_date: string | null
  gender: string | null
  student_phone: string | null
  profile_image_url: string | null
  commute_method: string | null
  marketing_source: string | null
  emergency_contact: string | null
  notes: string | null
  users: {
    name: string
    email: string | null
    phone: string | null
  } | null
  student_guardians: Array<{
    guardians: {
      id: string
      users: {
        name: string
        phone: string | null
      } | null
      relationship: string | null
    } | null
  }>
  class_enrollments: Array<{
    class_id: string
    classes: {
      id: string
      name: string
      subject: string | null
      instructor_id: string | null
    } | null
  }>
  student_schedules: Array<{
    day_of_week: number
    scheduled_arrival_time: string
  }>
}

export default function StudentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const [student, setStudent] = useState<StudentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [guardianDialogOpen, setGuardianDialogOpen] = useState(false)
  const [classDialogOpen, setClassDialogOpen] = useState(false)
  const [profileDialogOpen, setProfileDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('learning')
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [notesValue, setNotesValue] = useState('')
  const [isConsultationDialogOpen, setIsConsultationDialogOpen] = useState(false)
  const [consultationDate, setConsultationDate] = useState<Date | undefined>()
  const [consultationType, setConsultationType] = useState('대면')
  const [consultationContent, setConsultationContent] = useState('')
  const [consultations, setConsultations] = useState<Array<{
    id: string
    consultation_date: string
    consultation_type: string
    content: string
    created_at: string
    instructor_id?: string
  }>>([])
  const [recentScores, setRecentScores] = useState<Array<{
    id: string
    percentage: number
    created_at: string
    exams: {
      name: string
      exam_date: string
      category_code: string
    } | null
  }>>([])
  const [recentTodos, setRecentTodos] = useState<Array<{
    id: string
    title: string
    due_date: string
    subject: string | null
    completed_at: string | null
  }>>([])
  const [attendanceRecords, setAttendanceRecords] = useState<Array<{
    id: string
    status: string
    check_in_at: string | null
    check_out_at: string | null
    notes: string | null
    attendance_sessions: {
      session_date: string
      scheduled_start_at: string
      scheduled_end_at: string
      classes: {
        name: string
      } | null
    } | null
  }>>([])

  useEffect(() => {
    if (params.id) {
      const studentId = params.id as string
      loadStudentDetail(studentId)
      loadRecentScores(studentId)
      loadRecentTodos(studentId)
      loadAttendanceRecords(studentId)
      loadConsultations(studentId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  async function loadStudentDetail(studentId: string) {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('students')
        .select(`
          id,
          student_code,
          grade,
          school,
          enrollment_date,
          birth_date,
          gender,
          student_phone,
          profile_image_url,
          commute_method,
          marketing_source,
          emergency_contact,
          notes,
          users (
            name,
            email,
            phone
          ),
          student_guardians (
            guardians (
              id,
              users (
                name,
                phone
              ),
              relationship
            )
          ),
          class_enrollments (
            class_id,
            classes (
              id,
              name,
              subject,
              instructor_id
            )
          ),
          student_schedules (
            day_of_week,
            scheduled_arrival_time
          )
        `)
        .eq('id', studentId)
        .is('deleted_at', null)
        .maybeSingle()

      if (error) {
        console.error('Error fetching student:', error)
        throw error
      }

      if (!data) {
        throw new Error('학생 정보를 찾을 수 없습니다.')
      }

      setStudent(data as StudentDetail)
      setNotesValue(data.notes || '')
    } catch (error) {
      console.error('Error loading student:', error)
      toast({
        title: '데이터 로드 오류',
        description: '학생 정보를 불러오는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveNotes = async () => {
    if (!student) return

    try {
      const { error } = await supabase
        .from('students')
        .update({ notes: notesValue })
        .eq('id', student.id)

      if (error) throw error

      setStudent({
        ...student,
        notes: notesValue,
      })

      setIsEditingNotes(false)

      toast({
        title: '저장 완료',
        description: '메모가 저장되었습니다.',
      })
    } catch (error) {
      console.error('Error saving notes:', error)
      toast({
        title: '저장 오류',
        description: '메모를 저장하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    }
  }

  const handleSaveConsultation = async () => {
    if (!student || !consultationDate || !consultationContent) {
      toast({
        title: '입력 오류',
        description: '상담 날짜와 내용을 모두 입력해주세요.',
        variant: 'destructive',
      })
      return
    }

    try {
      const { data, error } = await supabase
        .from('consultations')
        .insert({
          student_id: student.id,
          consultation_date: formatDate(consultationDate, 'yyyy-MM-dd'),
          consultation_type: consultationType,
          content: consultationContent,
        })
        .select()
        .single()

      if (error) throw error

      setConsultations([data, ...consultations])
      setIsConsultationDialogOpen(false)
      setConsultationDate(undefined)
      setConsultationType('대면')
      setConsultationContent('')

      toast({
        title: '저장 완료',
        description: '상담 기록이 저장되었습니다.',
      })
    } catch (error) {
      console.error('Error saving consultation:', error)
      toast({
        title: '저장 오류',
        description: '상담 기록을 저장하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    }
  }

  async function loadRecentScores(studentId: string) {
    try {
      const { data, error } = await supabase
        .from('exam_scores')
        .select(`
          id,
          percentage,
          created_at,
          exams (
            name,
            exam_date,
            category_code
          )
        `)
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error
      setRecentScores(data || [])
    } catch (error) {
      console.error('Error loading scores:', error)
    }
  }

  async function loadRecentTodos(studentId: string) {
    try {
      const { data, error } = await supabase
        .from('student_todos')
        .select('*')
        .eq('student_id', studentId)
        .order('due_date', { ascending: false })
        .limit(10)

      if (error) throw error
      setRecentTodos(data || [])
    } catch (error) {
      console.error('Error loading todos:', error)
    }
  }

  async function loadConsultations(studentId: string) {
    try {
      const { data, error } = await supabase
        .from('consultations')
        .select('*')
        .eq('student_id', studentId)
        .order('consultation_date', { ascending: false })
        .limit(20)

      if (error) throw error
      setConsultations(data || [])
    } catch (error) {
      console.error('Error loading consultations:', error)
    }
  }

  async function loadAttendanceRecords(studentId: string) {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select(`
          id,
          status,
          check_in_at,
          check_out_at,
          notes,
          attendance_sessions (
            session_date,
            scheduled_start_at,
            scheduled_end_at,
            classes (
              name
            )
          )
        `)
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(30)

      if (error) throw error
      setAttendanceRecords(data || [])
    } catch (error) {
      console.error('Error loading attendance:', error)
    }
  }

  const handleGenerateReport = async () => {
    if (!student) return

    router.push(`/reports?student_id=${student.id}`)
  }

  const handleContactGuardian = () => {
    if (!student || !student.student_guardians || student.student_guardians.length === 0) {
      toast({
        title: '보호자 정보 없음',
        description: '등록된 보호자가 없습니다.',
        variant: 'destructive',
      })
      return
    }

    const guardian = student.student_guardians[0].guardians
    if (!guardian?.users?.phone) {
      toast({
        title: '연락처 정보 없음',
        description: '보호자 연락처가 등록되어 있지 않습니다.',
        variant: 'destructive',
      })
      return
    }

    // In real implementation, this would open a contact dialog or initiate a call/SMS
    toast({
      title: '보호자 연락',
      description: `${guardian.users.name} (${guardian.users.phone})`,
    })
  }

  // Calculate KPIs
  const calculateKPIs = () => {
    // Attendance rate (last 30 days)
    const attendanceRate = attendanceRecords.length > 0
      ? Math.round((attendanceRecords.filter(r => r.status === 'present').length / attendanceRecords.length) * 100)
      : 0

    // Average score (recent 10 exams)
    const avgScore = recentScores.length > 0
      ? Math.round(recentScores.reduce((sum, s) => sum + s.percentage, 0) / recentScores.length)
      : 0

    // Homework completion rate
    const homeworkRate = recentTodos.length > 0
      ? Math.round((recentTodos.filter(t => t.completed_at).length / recentTodos.length) * 100)
      : 0

    return { attendanceRate, avgScore, homeworkRate }
  }

  if (loading) {
    return (
      <PageWrapper>
        <div className="text-center py-12">로딩 중...</div>
      </PageWrapper>
    )
  }

  if (!student) {
    return (
      <PageWrapper>
        <div className="text-center py-12">
          <p className="text-muted-foreground">학생을 찾을 수 없습니다.</p>
          <Button className="mt-4" onClick={() => router.push('/students')}>
            목록으로 돌아가기
          </Button>
        </div>
      </PageWrapper>
    )
  }

  const kpis = calculateKPIs()

  // Helper functions
  const getGenderLabel = (gender: string | null) => {
    if (!gender) return null
    const labels: Record<string, string> = {
      male: '남성',
      female: '여성',
      other: '기타'
    }
    return labels[gender] || gender
  }

  const getCommuteMethodLabel = (method: string | null) => {
    if (!method) return null
    const labels: Record<string, string> = {
      shuttle: '셔틀버스',
      walk: '도보',
      private: '자가',
      public: '대중교통',
      other: '기타'
    }
    return labels[method] || method
  }

  const getMarketingSourceLabel = (source: string | null) => {
    if (!source) return null
    const labels: Record<string, string> = {
      referral: '지인 소개',
      blog: '블로그',
      sign: '간판',
      online_ad: '온라인 광고',
      social_media: 'SNS',
      other: '기타'
    }
    return labels[source] || source
  }

  const calculateAge = (birthDate: string | null) => {
    if (!birthDate) return null
    return differenceInYears(new Date(), new Date(birthDate))
  }

  const handleProfileImageUpdate = async (url: string) => {
    if (!student) return

    try {
      const { error } = await supabase
        .from('students')
        .update({ profile_image_url: url })
        .eq('id', student.id)

      if (error) throw error

      // Update local state
      setStudent({
        ...student,
        profile_image_url: url,
      })

      toast({
        title: '프로필 업데이트',
        description: '프로필 사진이 업데이트되었습니다.',
      })

      setProfileDialogOpen(false)
    } catch (error) {
      console.error('Error updating profile image:', error)
      toast({
        title: '업데이트 오류',
        description: '프로필 사진을 업데이트하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    }
  }

  return (
    <PageWrapper>
      <motion.div
        className="space-y-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Compact Header */}
        <div className="space-y-4">
          <motion.div
            className="flex items-center justify-between"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.push('/students')}>
                <ArrowLeft className="h-4 w-4" />
              </Button>

              {/* Profile Image - 더 작게 */}
              <motion.div
                className="h-16 w-16 rounded-full bg-muted flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80 transition-opacity relative group"
                onClick={() => setProfileDialogOpen(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <img
                  src={getStudentAvatar(
                    student.profile_image_url,
                    student.id,
                    student.users?.name || 'Student',
                    student.gender
                  )}
                  alt={student.users?.name || '학생'}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Edit className="h-5 w-5 text-white" />
                </div>
              </motion.div>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold">{student.users?.name || '이름 없음'}</h1>
                  {student.gender && (
                    <Badge variant="outline" className="text-xs">{getGenderLabel(student.gender)}</Badge>
                  )}
                  <span className="text-sm text-muted-foreground">
                    {student.grade || '-'}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                  <span>{student.student_code}</span>
                  {student.birth_date && (
                    <>
                      <span>•</span>
                      <span>{calculateAge(student.birth_date)}세</span>
                    </>
                  )}
                  {student.student_phone && (
                    <>
                      <span>•</span>
                      <span>{student.student_phone}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions - 헤더로 이동 */}
            <div className="flex gap-2">
              <Button
                onClick={handleGenerateReport}
                className="gap-2"
              >
                <FileText className="h-4 w-4" />
                리포트
              </Button>
              <Button
                variant="outline"
                onClick={handleContactGuardian}
                className="gap-2"
              >
                <Send className="h-4 w-4" />
                연락
              </Button>
              <Button
                variant="outline"
                onClick={() => setClassDialogOpen(true)}
                className="gap-2"
              >
                <Users className="h-4 w-4" />
                반 배정
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push(`/students/${student.id}/edit`)}
              >
                <Edit className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>

          {/* KPI Cards - 더 컴팩트하게 */}
          <div className="grid gap-3 md:grid-cols-3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="border-l-4 border-l-primary">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">출석률</p>
                      <p className="text-2xl font-bold mt-1">
                        {kpis.attendanceRate}%
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        최근 30일 기준
                      </p>
                    </div>
                    <div className="h-10 w-10 rounded-full flex items-center justify-center bg-muted">
                      <Target className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="border-l-4 border-l-primary">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">성적 평균</p>
                      <p className="text-2xl font-bold mt-1">
                        {kpis.avgScore}점
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        최근 10회 시험
                      </p>
                    </div>
                    <div className="h-10 w-10 rounded-full flex items-center justify-center bg-muted">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="border-l-4 border-l-primary">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">과제 완료율</p>
                      <p className="text-2xl font-bold mt-1">
                        {kpis.homeworkRate}%
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        최근 10개 과제
                      </p>
                    </div>
                    <div className="h-10 w-10 rounded-full flex items-center justify-center bg-muted">
                      <CheckCircle className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>

        {/* Basic Info - Compact Single Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">기본 정보</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 text-sm">
                {/* 학교 정보 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <GraduationCap className="h-4 w-4" />
                    <span className="font-medium">학교</span>
                  </div>
                  <div className="pl-6">
                    <p className="font-medium">{student.school || '-'}</p>
                  </div>
                </div>

                {/* 연락처 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span className="font-medium">연락처</span>
                  </div>
                  <div className="pl-6 space-y-1">
                    {student.users?.email && (
                      <p className="text-xs truncate">{student.users.email}</p>
                    )}
                    {student.emergency_contact && (
                      <p className="text-xs font-medium">긴급: {student.emergency_contact}</p>
                    )}
                  </div>
                </div>

                {/* 입회 정보 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span className="font-medium">입회일</span>
                  </div>
                  <div className="pl-6">
                    <p className="font-medium">
                      {formatDate(new Date(student.enrollment_date), 'yyyy.MM.dd')}
                    </p>
                    {student.commute_method && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {getCommuteMethodLabel(student.commute_method)}
                      </p>
                    )}
                  </div>
                </div>

                {/* 보호자 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span className="font-medium">보호자</span>
                  </div>
                  <div className="pl-6">
                    {student.student_guardians && student.student_guardians.length > 0 ? (
                      <div className="space-y-1">
                        {student.student_guardians.slice(0, 2).map((sg, idx) => (
                          <p key={idx} className="text-xs">
                            {sg.guardians?.users?.name} ({sg.guardians?.relationship})
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">-</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tabs - 학습 현황을 기본으로 */}
        <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue="learning" className="space-y-3">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="learning" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              학습 현황
            </TabsTrigger>
            <TabsTrigger value="schedule" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              수업/스케줄
            </TabsTrigger>
            <TabsTrigger value="consultations" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              상담/리포트
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              이력
            </TabsTrigger>
          </TabsList>

          {/* Schedule Tab - 수업과 스케줄 */}
          <TabsContent value="schedule" className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
            {/* Classes */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>수강 중인 수업</CardTitle>
                    <CardDescription className="mt-1">학생이 수강 중인 반 목록</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setClassDialogOpen(true)}
                  >
                    수업 관리
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {student.class_enrollments && student.class_enrollments.length > 0 ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {student.class_enrollments.map((enrollment, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                          <div className="font-medium">{enrollment.classes?.name || 'Unknown'}</div>
                          {enrollment.classes?.subject && (
                            <div className="text-sm text-muted-foreground">
                              {enrollment.classes.subject}
                            </div>
                          )}
                        </div>
                        <Badge variant="secondary">진행 중</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">배정된 수업이 없습니다.</p>
                )}
              </CardContent>
            </Card>

            {/* Schedule */}
            <Card>
              <CardHeader>
                <CardTitle>요일별 스케줄</CardTitle>
                <CardDescription>학생의 주간 등원 시간</CardDescription>
              </CardHeader>
              <CardContent>
                {student.student_schedules && student.student_schedules.length > 0 ? (
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {student.student_schedules.map((schedule, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="font-medium">
                          {DAYS_OF_WEEK[schedule.day_of_week]}요일
                        </div>
                        <Badge variant="outline">{schedule.scheduled_arrival_time}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">등록된 스케줄이 없습니다.</p>
                )}
              </CardContent>
            </Card>
            </motion.div>
          </TabsContent>

          {/* Learning Status Tab */}
          <TabsContent value="learning" className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
            {/* Charts Section */}
            <div className="space-y-4">
              {/* Subject Radar Chart and Grades Chart */}
              <div className="grid gap-4 md:grid-cols-2">
                {/* Subject Radar Chart */}
                {recentScores.length > 0 && (
                  <SubjectRadarChart
                    data={[
                      { subject: '국어', score: 85, classAverage: 78, previousScore: 80 },
                      { subject: '영어', score: 92, classAverage: 85, previousScore: 88 },
                      { subject: '수학', score: 78, classAverage: 82, previousScore: 75 },
                      { subject: '과학', score: 88, classAverage: 80, previousScore: 85 },
                      { subject: '사회', score: 90, classAverage: 83, previousScore: 87 },
                    ]}
                    title="과목별 성취도"
                    description="과목별 점수 분포 및 비교"
                  />
                )}

                {/* Grades Line Chart */}
                {recentScores.length > 0 && (
                  <GradesLineChart
                    data={recentScores.map(score => ({
                      examName: score.exams?.name || '시험',
                      score: score.percentage,
                      date: score.exams?.exam_date,
                    }))}
                    title="성적 추이"
                    description="최근 시험별 점수 변화"
                    showClassAverage={false}
                  />
                )}
              </div>

              {/* Attendance & Todo Charts */}
              <div className="grid gap-4 md:grid-cols-2">
                {/* Attendance Heatmap */}
                {attendanceRecords.length > 0 && (
                  <AttendanceHeatmap
                    data={attendanceRecords.map(record => ({
                      date: new Date(record.attendance_sessions?.session_date || record.check_in_at || ''),
                      status: record.status as 'present' | 'late' | 'absent' | 'none',
                      note: record.notes || undefined,
                    }))}
                    title="출석 현황"
                    description="최근 출석 캘린더"
                    year={new Date().getFullYear()}
                    month={new Date().getMonth() + 1}
                  />
                )}

                {/* Todo Completion Donut */}
                {recentTodos.length > 0 && (
                  <TodoCompletionDonut
                    data={{
                      completed: recentTodos.filter(t => t.completed_at).length,
                      incomplete: recentTodos.filter(t => !t.completed_at).length,
                    }}
                    title="과제 완료율"
                    description="완료 vs 미완료 비율"
                  />
                )}
              </div>
            </div>

            {/* Recent Attendance */}
            <Card>
              <CardHeader>
                <CardTitle>최근 출석 이력</CardTitle>
                <CardDescription>최근 10개의 출석 기록</CardDescription>
              </CardHeader>
              <CardContent>
                {attendanceRecords.length > 0 ? (
                  <div className="space-y-2">
                    {attendanceRecords.slice(0, 10).map((record) => {
                      const statusInfo = getAttendanceStatusInfo(record.status)

                      return (
                        <div key={record.id} className="flex items-center justify-between p-2.5 rounded-lg border">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <div className="font-medium text-sm">
                                {record.attendance_sessions?.classes?.name || '수업 정보 없음'}
                              </div>
                              <Badge variant={statusInfo.variant} className="text-xs">{statusInfo.label}</Badge>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {record.attendance_sessions?.session_date &&
                                new Date(record.attendance_sessions.session_date).toLocaleDateString('ko-KR')}
                              {record.check_in_at &&
                                ` · ${new Date(record.check_in_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">기록된 출석이 없습니다.</p>
                )}
              </CardContent>
            </Card>

            {/* Recent Todos */}
            <Card>
              <CardHeader>
                <CardTitle>최근 TODO</CardTitle>
                <CardDescription>최근 10개의 과제</CardDescription>
              </CardHeader>
              <CardContent>
                {recentTodos.length > 0 ? (
                  <div className="space-y-2">
                    {recentTodos.slice(0, 10).map((todo) => (
                      <div key={todo.id} className="flex items-center justify-between p-2.5 rounded-lg border">
                        <div>
                          <div className="font-medium text-sm">{todo.title}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {todo.due_date} · {todo.subject || '일반'}
                          </div>
                        </div>
                        <Badge variant={todo.completed_at ? 'default' : 'secondary'} className="text-xs">
                          {todo.completed_at ? '완료' : '진행 중'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">등록된 TODO가 없습니다.</p>
                )}
              </CardContent>
            </Card>

            {/* Recent Grades */}
            <Card>
              <CardHeader>
                <CardTitle>최근 성적</CardTitle>
                <CardDescription>최근 10개의 시험 성적</CardDescription>
              </CardHeader>
              <CardContent>
                {recentScores.length > 0 ? (
                  <div className="space-y-2">
                    {recentScores.slice(0, 10).map((score) => (
                      <div key={score.id} className="flex items-center justify-between p-2.5 rounded-lg border">
                        <div>
                          <div className="font-medium text-sm">{score.exams?.name || 'Unknown'}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {score.exams?.exam_date}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg">{score.percentage}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">기록된 성적이 없습니다.</p>
                )}
              </CardContent>
            </Card>
            </motion.div>
          </TabsContent>

          {/* Consultations & Reports Tab */}
          <TabsContent value="consultations" className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>상담 기록</CardTitle>
                    <CardDescription>학부모 상담 및 면담 기록</CardDescription>
                  </div>
                  <Button
                    onClick={() => setIsConsultationDialogOpen(true)}
                    size="sm"
                  >
                    상담 기록 추가
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {consultations.length > 0 ? (
                  <div className="space-y-3">
                    {consultations.map((consultation) => (
                      <div
                        key={consultation.id}
                        className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{consultation.consultation_type}</Badge>
                            <span className="text-sm text-muted-foreground">
                              {formatDate(new Date(consultation.consultation_date), 'yyyy-MM-dd', { locale: ko })}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(new Date(consultation.created_at), 'yyyy-MM-dd HH:mm', { locale: ko })}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{consultation.content}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>등록된 상담 기록이 없습니다</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => setIsConsultationDialogOpen(true)}
                    >
                      첫 상담 기록 추가하기
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>월간 리포트</CardTitle>
                <CardDescription>학생 학습 리포트 목록</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>리포트 기록이 없습니다</p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={handleGenerateReport}>
                    리포트 생성하기
                  </Button>
                </div>
              </CardContent>
            </Card>
            </motion.div>
          </TabsContent>

          {/* History & Notes Tab */}
          <TabsContent value="history" className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
            {/* Activity Timeline - 새로운 통합 타임라인 */}
            <ActivityTimeline studentId={student.id} limit={100} />

            {/* Notes */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>특이사항/메모</CardTitle>
                    <CardDescription>건강 문제, 성격, 학습 습관 등 관리자 기록</CardDescription>
                  </div>
                  {!isEditingNotes ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditingNotes(true)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      편집
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsEditingNotes(false)
                          setNotesValue(student.notes || '')
                        }}
                      >
                        취소
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveNotes}
                      >
                        저장
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isEditingNotes ? (
                  <Textarea
                    value={notesValue}
                    onChange={(e) => setNotesValue(e.target.value)}
                    placeholder="학생에 대한 특이사항이나 메모를 입력하세요..."
                    className="min-h-[120px]"
                  />
                ) : student.notes ? (
                  <div className="p-4 rounded-lg bg-muted">
                    <p className="text-sm whitespace-pre-wrap">{student.notes}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">등록된 메모가 없습니다.</p>
                )}
              </CardContent>
            </Card>
            </motion.div>
          </TabsContent>
        </Tabs>

        {/* Manage Guardians Dialog */}
        <ManageGuardiansDialog
          open={guardianDialogOpen}
          onOpenChange={setGuardianDialogOpen}
          studentId={student.id}
          currentGuardianIds={
            student.student_guardians
              ?.map((sg) => sg.guardians?.id)
              .filter(Boolean) as string[] || []
          }
          onSuccess={() => {
            if (params.id) {
              loadStudentDetail(params.id as string)
            }
          }}
        />

        {/* Manage Classes Dialog */}
        <ManageClassesDialog
          open={classDialogOpen}
          onOpenChange={setClassDialogOpen}
          studentId={student.id}
          currentClassIds={
            student.class_enrollments
              ?.map((ce) => ce.class_id)
              .filter(Boolean) as string[] || []
          }
          onSuccess={() => {
            if (params.id) {
              loadStudentDetail(params.id as string)
            }
          }}
        />

        {/* Profile Image Dialog */}
        <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>프로필 사진 변경</DialogTitle>
              <DialogDescription>
                학생의 프로필 사진을 업로드하거나 변경할 수 있습니다.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <ProfileImageUpload
                currentImageUrl={student.profile_image_url}
                studentId={student.id}
                studentName={student.users?.name || 'Student'}
                gender={student.gender}
                onImageUploaded={handleProfileImageUpdate}
              />
            </div>
          </DialogContent>
        </Dialog>

        {/* Consultation Dialog */}
        <Dialog open={isConsultationDialogOpen} onOpenChange={setIsConsultationDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>상담 기록 추가</DialogTitle>
              <DialogDescription>
                학부모와의 상담 내용을 기록합니다.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="consultation-date" className="text-sm font-medium">
                    상담 날짜 <span className="text-destructive">*</span>
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="consultation-date"
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !consultationDate && 'text-muted-foreground'
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {consultationDate ? (
                          formatDate(consultationDate, 'yyyy년 M월 d일', { locale: ko })
                        ) : (
                          <span>날짜를 선택하세요</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={consultationDate}
                        onSelect={setConsultationDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="consultation-type" className="text-sm font-medium">
                    상담 유형 <span className="text-destructive">*</span>
                  </Label>
                  <Select value={consultationType} onValueChange={setConsultationType}>
                    <SelectTrigger id="consultation-type" className="w-full">
                      <SelectValue placeholder="상담 유형을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="대면">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <span>대면</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="전화">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          <span>전화</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="온라인">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          <span>온라인</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="consultation-content" className="text-sm font-medium">
                  상담 내용 <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="consultation-content"
                  value={consultationContent}
                  onChange={(e) => setConsultationContent(e.target.value)}
                  placeholder="상담 내용을 자세히 입력하세요...&#10;&#10;예시:&#10;- 학습 태도 및 집중력에 대한 논의&#10;- 성적 향상 방안 상담&#10;- 진로 및 학습 계획 논의"
                  className="min-h-[180px] resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  {consultationContent.length} / 1000자
                </p>
              </div>
            </div>
            <div className="flex justify-between items-center pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                <span className="text-destructive">*</span> 필수 입력 항목
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsConsultationDialogOpen(false)
                    setConsultationDate(undefined)
                    setConsultationType('대면')
                    setConsultationContent('')
                  }}
                >
                  취소
                </Button>
                <Button
                  onClick={handleSaveConsultation}
                  disabled={!consultationDate || !consultationContent.trim()}
                >
                  저장
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>
    </PageWrapper>
  )
}
