/**
 * Bulk Upsert Attendance Use Case
 * 출석 기록 대량 생성/업데이트 유스케이스 - Application Layer
 */

import { AttendanceRepository, type BulkAttendanceInput } from '@/infrastructure/database/attendance.repository'
import { ValidationError } from '@/lib/error-types'
import { bulkAttendanceSchema } from '@/types/attendance'

export class BulkUpsertAttendanceUseCase {
  async execute(tenantId: string, input: BulkAttendanceInput) {
    if (!tenantId) {
      throw new ValidationError('Tenant ID는 필수입니다')
    }

    // Validate input
    const validated = bulkAttendanceSchema.parse(input)

    // Auto-set check_in_at for present/late students
    const attendances = validated.attendances.map((att) => {
      if (
        (att.status === 'present' || att.status === 'late') &&
        !att.check_in_at
      ) {
        return {
          ...att,
          check_in_at: new Date().toISOString(),
        }
      }
      return att
    })

    return await AttendanceRepository.bulkUpsertAttendance(
      tenantId,
      validated.session_id,
      attendances
    )
  }
}
