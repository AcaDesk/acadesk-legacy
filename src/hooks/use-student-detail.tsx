/**
 * useStudentDetail Hook & Context
 *
 * Provides student detail data across student detail page tabs
 * TODO: Migrate to use Server Actions instead of client-side queries
 */

'use client'

import { createContext, useContext, ReactNode } from 'react'

export interface StudentDetail {
  id: string
  studentCode: string
  name: string
  birthDate?: string
  gender?: string
  grade?: string
  school?: string
  phone?: string
  profileImageUrl?: string
  enrollmentDate?: string
  withdrawalDate?: string
  emergencyContact?: string
  notes?: string
  commuteMethod?: string
  marketingSource?: string
  tenantId: string
  userId?: string
  createdAt: string
  updatedAt: string
}

interface StudentDetailContextValue {
  student: StudentDetail
  refreshStudent: () => Promise<void>
  onRefresh?: () => void  // Backward compatibility
}

const StudentDetailContext = createContext<StudentDetailContextValue | null>(null)

export function StudentDetailProvider({
  value,
  children,
}: {
  value: StudentDetailContextValue
  children: ReactNode
}) {
  return <StudentDetailContext.Provider value={value}>{children}</StudentDetailContext.Provider>
}

export function useStudentDetail() {
  const context = useContext(StudentDetailContext)
  if (!context) {
    throw new Error('useStudentDetail must be used within StudentDetailProvider')
  }
  return context
}
