"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ui/card"
import { Button } from "@ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@ui/dialog"
import { Input } from "@ui/input"
import { Label } from "@ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ui/select"
import { Badge } from "@ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@ui/tabs"
import { UserPlus, Copy } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { inviteStaff } from "@/app/actions/invitations"

interface StaffMember {
  id: string
  name: string
  email: string
  role_code: string
  phone?: string
  created_at: string
}

interface Invitation {
  id: string
  email: string
  role_code: string
  status: string
  token: string
  expires_at: string
  created_at: string
}

interface StaffManagementClientProps {
  staffList: StaffMember[]
  invitations: Invitation[]
}

export function StaffManagementClient({
  staffList,
  invitations,
}: StaffManagementClientProps) {
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<"instructor" | "assistant">("instructor")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleInvite = async () => {
    if (!inviteEmail) {
      toast({
        title: "오류",
        description: "이메일을 입력해주세요.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      const result = await inviteStaff({
        email: inviteEmail,
        roleCode: inviteRole,
      })

      if (!result.success) {
        toast({
          title: "초대 실패",
          description: result.error || "초대를 생성할 수 없습니다.",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "초대 완료",
        description: `${inviteEmail}님에게 초대를 보냈습니다.`,
      })

      setInviteEmail("")
      setInviteRole("instructor")
      setIsInviteDialogOpen(false)
      router.refresh()
    } catch (error) {
      console.error('초대 처리 오류:', error)
      toast({
        title: "오류",
        description: "알 수 없는 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const copyInvitationLink = (token: string) => {
    const link = `${window.location.origin}/auth/invite/accept?token=${token}`
    navigator.clipboard.writeText(link)
    toast({
      title: "링크 복사됨",
      description: "초대 링크가 클립보드에 복사되었습니다.",
    })
  }

  const getRoleLabel = (roleCode: string) => {
    switch (roleCode) {
      case "instructor":
        return "강사"
      case "assistant":
        return "조교"
      default:
        return roleCode
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline">대기 중</Badge>
      case "accepted":
        return <Badge variant="default">수락됨</Badge>
      case "expired":
        return <Badge variant="secondary">만료됨</Badge>
      case "cancelled":
        return <Badge variant="destructive">취소됨</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-end">
          <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                직원 초대
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>직원 초대</DialogTitle>
                <DialogDescription>
                  새로운 강사 또는 조교를 초대합니다. 초대 링크가 이메일로 전송됩니다.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email">이메일</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="staff@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">역할</Label>
                  <Select
                    value={inviteRole}
                    onValueChange={(value) =>
                      setInviteRole(value as "instructor" | "assistant")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="instructor">강사</SelectItem>
                      <SelectItem value="assistant">조교</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsInviteDialogOpen(false)}
                >
                  취소
                </Button>
                <Button onClick={handleInvite} disabled={isSubmitting}>
                  {isSubmitting ? "초대 중..." : "초대 보내기"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      <Tabs defaultValue="staff" className="space-y-4">
        <TabsList>
          <TabsTrigger value="staff">
            직원 목록 ({staffList.length})
          </TabsTrigger>
          <TabsTrigger value="invitations">
            초대 내역 ({invitations.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="staff" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>현재 직원</CardTitle>
              <CardDescription>학원에 소속된 강사와 조교 목록입니다</CardDescription>
            </CardHeader>
            <CardContent>
              {staffList.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  아직 직원이 없습니다. 직원을 초대해보세요.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>이름</TableHead>
                      <TableHead>이메일</TableHead>
                      <TableHead>역할</TableHead>
                      <TableHead>연락처</TableHead>
                      <TableHead>가입일</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staffList.map((staff) => (
                      <TableRow key={staff.id}>
                        <TableCell className="font-medium">{staff.name}</TableCell>
                        <TableCell>{staff.email}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {getRoleLabel(staff.role_code)}
                          </Badge>
                        </TableCell>
                        <TableCell>{staff.phone || "-"}</TableCell>
                        <TableCell>
                          {new Date(staff.created_at).toLocaleDateString("ko-KR")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invitations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>초대 내역</CardTitle>
              <CardDescription>보낸 초대 목록과 상태입니다</CardDescription>
            </CardHeader>
            <CardContent>
              {invitations.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  초대 내역이 없습니다.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>이메일</TableHead>
                      <TableHead>역할</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>만료일</TableHead>
                      <TableHead>초대일</TableHead>
                      <TableHead>액션</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invitations.map((invitation) => (
                      <TableRow key={invitation.id}>
                        <TableCell className="font-medium">
                          {invitation.email}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {getRoleLabel(invitation.role_code)}
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(invitation.status)}</TableCell>
                        <TableCell>
                          {new Date(invitation.expires_at).toLocaleDateString(
                            "ko-KR"
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(invitation.created_at).toLocaleDateString(
                            "ko-KR"
                          )}
                        </TableCell>
                        <TableCell>
                          {invitation.status === "pending" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyInvitationLink(invitation.token)}
                            >
                              <Copy className="mr-2 h-4 w-4" />
                              링크 복사
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
