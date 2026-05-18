'use client'

import { useState, useEffect, ReactNode } from 'react'
import { Plus, Upload, ArrowUpCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@ui/button'
import { PageHeader } from '@ui/page-header'
import { AddStudentWizard, type StudentInitialValues } from '@/components/features/students/add-student-wizard'
import { PromotionDialog } from '@/components/features/students/promotion/promotion-dialog'
import { RoleGuard } from '@/components/auth/role-guard'
import { Badge } from '@ui/badge'
import { isFeatureAvailable, isFeatureBeta } from '@/lib/features.config'

interface StudentsPageClientProps {
  children: ReactNode
  initialValues?: StudentInitialValues
}

export function StudentsPageClient({ children, initialValues }: StudentsPageClientProps) {
  const router = useRouter()
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [promotionDialogOpen, setPromotionDialogOpen] = useState(false)
  const [wizardInitialValues, setWizardInitialValues] = useState<StudentInitialValues | undefined>(initialValues)

  // Auto-open dialog if coming from consultation
  useEffect(() => {
    if (initialValues?.consultationId) {
      setAddDialogOpen(true)
      // Clear query parameters to avoid re-opening on refresh
      router.replace('/students', { scroll: false })
    }
  }, [initialValues, router])

  const handleStudentAdded = () => {
    // Clear initial values after adding
    setWizardInitialValues(undefined)
    // Refresh the page to show updated data
    router.refresh()
  }

  return (
    <>
      <PageHeader
        title="학생 관리"
        description="학생 정보 및 성적을 관리합니다"
        action={
          <RoleGuard allowedRoles={['owner', 'instructor']}>
            <div className="flex gap-2">
              {isFeatureAvailable('studentPromotion') && (
                <Button variant="outline" onClick={() => setPromotionDialogOpen(true)}>
                  <ArrowUpCircle className="mr-2 h-4 w-4" />
                  진급 관리
                  {isFeatureBeta('studentPromotion') && (
                    <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">Beta</Badge>
                  )}
                </Button>
              )}
              <Button variant="outline" onClick={() => router.push('/students/import')}>
                <Upload className="mr-2 h-4 w-4" />
                일괄 등록
              </Button>
              <Button onClick={() => setAddDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                학생 추가
              </Button>
            </div>
          </RoleGuard>
        }
      />

      {children}

      {/* Add Student Wizard Dialog */}
      <AddStudentWizard
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={handleStudentAdded}
        initialValues={wizardInitialValues}
      />

      {isFeatureAvailable('studentPromotion') && (
        <PromotionDialog
          open={promotionDialogOpen}
          onOpenChange={setPromotionDialogOpen}
          onCompleted={() => router.refresh()}
        />
      )}
    </>
  )
}
