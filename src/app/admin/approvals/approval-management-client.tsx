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
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckCircle, XCircle, Clock, User, Building2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { approveUser, rejectUser } from "@/app/actions/approve-user"

interface PendingUser {
  id: string
  name: string
  email: string
  phone?: string
  role_code: string
  approval_status: string
  created_at: string
  tenant_id: string
  tenants: {
    name: string
    slug: string
  }[]
}

interface RecentDecision {
  id: string
  name: string
  email: string
  approval_status: string
  approved_at: string
  created_at: string
  tenants: {
    name: string
  }[]
}

interface ApprovalManagementClientProps {
  pendingUsers: PendingUser[]
  recentDecisions: RecentDecision[]
  currentUserId: string
}

export function ApprovalManagementClient({
  pendingUsers,
  recentDecisions,
  currentUserId,
}: ApprovalManagementClientProps) {
  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null)
  const [action, setAction] = useState<"approve" | "reject" | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleApprove = async () => {
    if (!selectedUser) return

    setIsProcessing(true)
    try {
      const result = await approveUser(selectedUser.id)

      if (!result.success) {
        toast({
          title: "승인 실패",
          description: result.error || "사용자 승인에 실패했습니다.",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "승인 완료",
        description: `${selectedUser.name}님의 가입을 승인했습니다.`,
      })

      setSelectedUser(null)
      setAction(null)
      router.refresh()
    } catch (_error) {
      toast({
        title: "오류",
        description: "알 수 없는 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!selectedUser) return

    setIsProcessing(true)
    try {
      const result = await rejectUser(selectedUser.id, "관리자가 가입을 거부했습니다.")

      if (!result.success) {
        toast({
          title: "거부 실패",
          description: result.error || "사용자 거부에 실패했습니다.",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "거부 완료",
        description: `${selectedUser.name}님의 가입을 거부했습니다.`,
      })

      setSelectedUser(null)
      setAction(null)
      router.refresh()
    } catch (_error) {
      toast({
        title: "오류",
        description: "알 수 없는 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const getRoleLabel = (roleCode: string) => {
    switch (roleCode) {
      case "admin":
        return "원장"
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
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            대기 중
          </Badge>
        )
      case "approved":
        return (
          <Badge variant="default" className="gap-1">
            <CheckCircle className="h-3 w-3" />
            승인됨
          </Badge>
        )
      case "rejected":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            거부됨
          </Badge>
        )
      default:
        return <Badge>{status}</Badge>
    }
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">가입 승인 관리</h1>
            <p className="text-muted-foreground">
              신규 원장 가입 신청을 검토하고 승인합니다
            </p>
          </div>

          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-600">
                  {pendingUsers.length}
                </div>
                <p className="text-xs text-muted-foreground">승인 대기</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">
            승인 대기 ({pendingUsers.length})
          </TabsTrigger>
          <TabsTrigger value="history">
            처리 내역 ({recentDecisions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>승인 대기 중인 사용자</CardTitle>
              <CardDescription>
                신규 가입 신청을 검토하고 승인 또는 거부하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingUsers.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  승인 대기 중인 사용자가 없습니다.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>이름</TableHead>
                      <TableHead>이메일</TableHead>
                      <TableHead>연락처</TableHead>
                      <TableHead>학원명</TableHead>
                      <TableHead>역할</TableHead>
                      <TableHead>신청일</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead className="text-right">액션</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            {user.name}
                          </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.phone || "-"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            {user.tenants[0]?.name || '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {getRoleLabel(user.role_code)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(user.created_at).toLocaleDateString("ko-KR")}
                        </TableCell>
                        <TableCell>{getStatusBadge(user.approval_status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => {
                                setSelectedUser(user)
                                setAction("approve")
                              }}
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              승인
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setSelectedUser(user)
                                setAction("reject")
                              }}
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              거부
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
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>최근 처리 내역</CardTitle>
              <CardDescription>최근 승인/거부된 사용자 목록입니다</CardDescription>
            </CardHeader>
            <CardContent>
              {recentDecisions.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  처리 내역이 없습니다.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>이름</TableHead>
                      <TableHead>이메일</TableHead>
                      <TableHead>학원명</TableHead>
                      <TableHead>결정</TableHead>
                      <TableHead>처리일</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentDecisions.map((decision) => (
                      <TableRow key={decision.id}>
                        <TableCell className="font-medium">{decision.name}</TableCell>
                        <TableCell>{decision.email}</TableCell>
                        <TableCell>{decision.tenants[0]?.name || '-'}</TableCell>
                        <TableCell>{getStatusBadge(decision.approval_status)}</TableCell>
                        <TableCell>
                          {new Date(decision.approved_at).toLocaleString("ko-KR")}
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

      {/* 승인 확인 다이얼로그 */}
      <AlertDialog
        open={action === "approve"}
        onOpenChange={(open) => !open && setAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>가입 승인</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedUser?.name}님의 가입을 승인하시겠습니까?
              <br />
              승인 후 사용자는 학원 설정을 진행할 수 있습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleApprove} disabled={isProcessing}>
              {isProcessing ? "처리 중..." : "승인"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 거부 확인 다이얼로그 */}
      <AlertDialog
        open={action === "reject"}
        onOpenChange={(open) => !open && setAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>가입 거부</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedUser?.name}님의 가입을 거부하시겠습니까?
              <br />
              거부된 사용자는 시스템에 로그인할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={isProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isProcessing ? "처리 중..." : "거부"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
