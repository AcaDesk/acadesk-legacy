'use client'

import { useState, useEffect, ReactNode } from 'react'
import { Plus, Upload } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@ui/button'
import { AddStudentWizard, type StudentInitialValues } from '@/components/features/students/add-student-wizard'
import { RoleGuard } from '@/components/auth/role-guard'

interface StudentsPageClientProps {
  children: ReactNode
  initialValues?: StudentInitialValues
}

export function StudentsPageClient({ children, initialValues }: StudentsPageClientProps) {
  const router = useRouter()
  const [addDialogOpen, setAddDialogOpen] = useState(false)
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
      {/* Header Actions */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex-1">{/* Children will include PageHeader */}</div>
        <RoleGuard allowedRoles={['owner', 'instructor']}>
          <div className="flex gap-2">
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
      </div>

      {/* Page Content */}
      {children}

      {/* Add Student Wizard Dialog */}
      <AddStudentWizard
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={handleStudentAdded}
        initialValues={wizardInitialValues}
      />
    </>
  )
}
