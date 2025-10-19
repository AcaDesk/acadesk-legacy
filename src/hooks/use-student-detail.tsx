'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { StudentDetailData } from '@/types/studentDetail.types'

/**
 * Student Detail Context
 * 학생 상세 페이지의 데이터를 컴포넌트 트리에 전달하기 위한 Context
 *
 * Clean Architecture: Presentation Layer
 * - Props drilling을 방지하기 위한 UI 레이어의 상태 관리
 * - 비즈니스 로직은 포함하지 않음 (Use Cases에서 가져온 데이터만 전달)
 */

interface StudentDetailContextValue extends StudentDetailData {
  onRefresh?: () => void
}

const StudentDetailContext = createContext<StudentDetailContextValue | null>(null)

interface StudentDetailProviderProps {
  children: ReactNode
  value: StudentDetailContextValue
}

/**
 * Provider Component
 * 학생 상세 데이터를 하위 컴포넌트에 제공
 */
export function StudentDetailProvider({ children, value }: StudentDetailProviderProps) {
  return (
    <StudentDetailContext.Provider value={value}>
      {children}
    </StudentDetailContext.Provider>
  )
}

/**
 * Custom Hook
 * StudentDetailProvider 내부에서 학생 상세 데이터에 접근
 *
 * @throws Error - Provider 외부에서 사용 시 에러 발생
 * @returns StudentDetailContextValue - 학생 상세 데이터 및 새로고침 함수
 *
 * @example
 * ```tsx
 * function StudentInfo() {
 *   const { student, recentScores, onRefresh } = useStudentDetail()
 *   return <div>{student.name}</div>
 * }
 * ```
 */
export function useStudentDetail() {
  const context = useContext(StudentDetailContext)
  if (!context) {
    throw new Error('useStudentDetail must be used within StudentDetailProvider')
  }
  return context
}
