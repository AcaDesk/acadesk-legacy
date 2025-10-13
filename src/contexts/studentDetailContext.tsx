'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { StudentDetailData } from '@/types/studentDetail.types'

interface StudentDetailContextValue extends StudentDetailData {
  onRefresh?: () => void
}

const StudentDetailContext = createContext<StudentDetailContextValue | null>(null)

interface StudentDetailProviderProps {
  children: ReactNode
  value: StudentDetailContextValue
}

export function StudentDetailProvider({ children, value }: StudentDetailProviderProps) {
  return (
    <StudentDetailContext.Provider value={value}>
      {children}
    </StudentDetailContext.Provider>
  )
}

export function useStudentDetail() {
  const context = useContext(StudentDetailContext)
  if (!context) {
    throw new Error('useStudentDetail must be used within StudentDetailProvider')
  }
  return context
}
