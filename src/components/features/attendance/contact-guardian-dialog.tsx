'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useCurrentUser } from '@/hooks/use-current-user'
import { Loader2, Phone, MessageSquare, Mail, User } from 'lucide-react'

interface Guardian {
  id: string
  relationship: string | null
  users: {
    id: string
    name: string
    email: string | null
    phone: string | null
  } | null
}

interface ContactGuardianDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  studentId: string
  studentName: string
  sessionId: string
  onContactLogged?: () => void
}

export function ContactGuardianDialog({
  open,
  onOpenChange,
  studentId,
  studentName,
  sessionId,
  onContactLogged,
}: ContactGuardianDialogProps) {
  const [guardians, setGuardians] = useState<Guardian[]>([])
  const [loading, setLoading] = useState(false)
  const [contactMethod] = useState = useState<'phone' | 'sms' | 'email' | null>(null)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()
  const { user: currentUser } = useCurrentUser()

  useEffect(() => {
    if (open) {
      loadGuardians()
      setContactMethod(null)
      setNotes('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, studentId])

  async function loadGuardians() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('student_guardians')
        .select(`
          guardians (
            id,
            relationship,
            users (
              id,
              name,
              email,
              phone
            )
          )
        `)
        .eq('student_id', studentId)

      if (error) throw error

      // Extract guardian data from the nested structure
      interface StudentGuardianJoin {
        guardians: {
          id: string
          relationship: string | null
          users: {
            id: string
            name: string
            email: string | null
            phone: string | null
          }[] | null
        }[] | null
      }

      const guardianList = (data as unknown as StudentGuardianJoin[])
        ?.flatMap((item) => (item.guardians || []).map(g => ({
          id: g.id,
          relationship: g.relationship,
          users: g.users?.[0] || null
        })))
        .filter(Boolean) || []

      setGuardians(guardianList)
    } catch (error) {
      console.error('Error loading guardians:', error)
      toast({
        title: '데이터 로드 오류',
        description: '보호자 정보를 불러오는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleContactLog = async (guardianId: string, method: string) => {
    if (!currentUser) return

    setSaving(true)
    try {
      // Log the contact attempt
      const { error } = await supabase
        .from('notification_logs')
        .insert({
          tenant_id: currentUser.tenantId,
          student_id: studentId,
          guardian_id: guardianId,
          session_id: sessionId,
          notification_type: method,
          status: 'sent',
          message: `${studentName} 학생의 결석에 대한 연락`,
          notes: notes || null,
          sent_at: new Date().toISOString(),
        })

      if (error) throw error

      toast({
        title: '연락 기록 저장',
        description: `${method} 연락이 기록되었습니다.`,
      })

      if (onContactLogged) {
        onContactLogged()
      }

      onOpenChange(false)
    } catch (error: unknown) {
      console.error('Error logging contact:', error)
      toast({
        title: '저장 실패',
        description: error instanceof Error ? error.message : '연락 기록을 저장하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleContact = (guardianId: string, method: 'phone' | 'sms' | 'email') => {
    setContactMethod(method)

    // Simulate contact action
    setTimeout(() => {
      handleContactLog(guardianId, method)
    }, 500)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>보호자 연락</DialogTitle>
          <DialogDescription>
            {studentName} 학생의 보호자에게 연락합니다.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : guardians.length > 0 ? (
          <div className="space-y-4">
            {guardians.map((guardian) => (
              <div key={guardian.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-semibold">
                        {guardian.users?.name || '이름 없음'}
                      </div>
                      {guardian.relationship && (
                        <Badge variant="outline" className="text-xs mt-1">
                          {guardian.relationship}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="space-y-2 mb-4">
                  {guardian.users?.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>{guardian.users.phone}</span>
                    </div>
                  )}
                  {guardian.users?.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span>{guardian.users.email}</span>
                    </div>
                  )}
                </div>

                {/* Contact Actions */}
                <div className="flex gap-2">
                  {guardian.users?.phone && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleContact(guardian.id, 'phone')}
                        disabled={saving}
                        className="gap-2"
                      >
                        <Phone className="h-4 w-4" />
                        전화 걸기
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleContact(guardian.id, 'sms')}
                        disabled={saving}
                        className="gap-2"
                      >
                        <MessageSquare className="h-4 w-4" />
                        문자 보내기
                      </Button>
                    </>
                  )}
                  {guardian.users?.email && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleContact(guardian.id, 'email')}
                      disabled={saving}
                      className="gap-2"
                    >
                      <Mail className="h-4 w-4" />
                      이메일 보내기
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {/* Notes Section */}
            <div className="space-y-2">
              <label className="text-sm font-medium">연락 메모 (선택사항)</label>
              <Textarea
                placeholder="연락 내용이나 보호자 응답을 기록하세요..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              등록된 보호자가 없습니다.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              학생 정보 페이지에서 보호자를 추가해주세요.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            닫기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
