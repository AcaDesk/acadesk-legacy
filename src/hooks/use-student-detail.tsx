/**
 * useStudentDetail Hook & Context
 *
 * Provides student detail data across student detail page tabs
 * ✅ Migrated to use Server Actions
 */

'use client'

import { createContext, useContext, ReactNode } from 'react'
import type {
  StudentDetail,
  ExamScore,
  StudentTodo,
  Consultation,
  AttendanceRecord,
  Invoice,
  KPIs,
} from '@/core/types/studentDetail.types'

interface StudentDetailContextValue {
  student: StudentDetail
  recentScores: ExamScore[]
  classAverages: Record<string, number>
  recentTodos: StudentTodo[]
  consultations: Consultation[]
  attendanceRecords: AttendanceRecord[]
  invoices: Invoice[]
  kpis: KPIs
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
