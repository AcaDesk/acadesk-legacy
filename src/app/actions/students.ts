/**
 * Student Management Server Actions - Barrel File
 *
 * 모든 학생 관련 Server Actions를 re-export합니다.
 * 기존 import 경로를 유지하면서 내부 모듈을 분할합니다.
 * 각 하위 모듈이 'use server'를 선언하므로 barrel에서는 생략합니다.
 */

// Mutations (CUD operations)
export {
  createStudentComplete,
  updateStudent,
  deleteStudent,
  withdrawStudent,
} from './students/mutations'

// Queries (Read operations)
export {
  getStudentDetail,
  getStudents,
  getStudentFilterOptions,
} from './students/queries'

// Bulk operations
export {
  bulkUpdateStudents,
  bulkDeleteStudents,
  bulkEnrollClass,
  updateStudentClassEnrollments,
} from './students/bulk'

// Promotion operations
export {
  getPromotionCandidates,
  executePromotion,
  getStudentChangeLogs,
} from './students/promotion'
