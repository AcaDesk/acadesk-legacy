/**
 * GetStudentsUseCase Test
 * MockDataSource를 사용한 유닛 테스트 예제
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { createGetStudentsUseCase } from '@core/application/factories/studentUseCaseFactory.client'
import { createMockDataSource } from '@/lib/data-source-provider'
import { StudentCode } from '@core/domain/value-objects/StudentCode'

describe('GetStudentsUseCase', () => {
  let mockDataSource: ReturnType<typeof createMockDataSource>

  beforeEach(() => {
    // Mock DataSource 생성 및 초기화
    mockDataSource = createMockDataSource()
    mockDataSource.clear()
  })

  it('should return empty array when no students exist', async () => {
    // Arrange
    const useCase = createGetStudentsUseCase({ customDataSource: mockDataSource })

    // Act
    const result = await useCase.execute({ tenantId: 'tenant-1' })

    // Assert
    expect(result.students).toEqual([])
    expect(result.error).toBeNull()
  })

  it('should return students for given tenant', async () => {
    // Arrange
    mockDataSource.seed('students', [
      {
        id: 'student-1',
        tenant_id: 'tenant-1',
        user_id: null,
        student_code: 'S001',
        name: 'John Doe',
        birth_date: '2010-01-01',
        gender: 'male',
        student_phone: null,
        profile_image_url: null,
        grade: '초등학교 6학년',
        school: 'ABC 초등학교',
        enrollment_date: '2024-01-01',
        withdrawal_date: null,
        emergency_contact: '010-1234-5678',
        notes: null,
        commute_method: null,
        marketing_source: null,
        kiosk_pin: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        deleted_at: null,
      },
      {
        id: 'student-2',
        tenant_id: 'tenant-1',
        user_id: null,
        student_code: 'S002',
        name: 'Jane Smith',
        birth_date: '2011-01-01',
        gender: 'female',
        student_phone: null,
        profile_image_url: null,
        grade: '초등학교 5학년',
        school: 'ABC 초등학교',
        enrollment_date: '2024-01-01',
        withdrawal_date: null,
        emergency_contact: '010-2345-6789',
        notes: null,
        commute_method: null,
        marketing_source: null,
        kiosk_pin: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        deleted_at: null,
      },
      {
        id: 'student-3',
        tenant_id: 'tenant-2',
        user_id: null,
        student_code: 'S003',
        name: 'Other Tenant Student',
        birth_date: '2010-01-01',
        gender: 'male',
        student_phone: null,
        profile_image_url: null,
        grade: '초등학교 6학년',
        school: 'XYZ 초등학교',
        enrollment_date: '2024-01-01',
        withdrawal_date: null,
        emergency_contact: '010-3456-7890',
        notes: null,
        commute_method: null,
        marketing_source: null,
        kiosk_pin: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        deleted_at: null,
      },
    ])

    const useCase = createGetStudentsUseCase({ customDataSource: mockDataSource })

    // Act
    const result = await useCase.execute({ tenantId: 'tenant-1' })

    // Assert
    expect(result.students).toHaveLength(2)
    expect(result.students[0].name).toBe('John Doe')
    expect(result.students[1].name).toBe('Jane Smith')
  })

  it('should filter students by grade', async () => {
    // Arrange
    mockDataSource.seed('students', [
      {
        id: 'student-1',
        tenant_id: 'tenant-1',
        user_id: null,
        student_code: 'S001',
        name: 'John Doe',
        birth_date: '2010-01-01',
        gender: 'male',
        student_phone: null,
        profile_image_url: null,
        grade: '초등학교 6학년',
        school: 'ABC 초등학교',
        enrollment_date: '2024-01-01',
        withdrawal_date: null,
        emergency_contact: '010-1234-5678',
        notes: null,
        commute_method: null,
        marketing_source: null,
        kiosk_pin: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        deleted_at: null,
      },
      {
        id: 'student-2',
        tenant_id: 'tenant-1',
        user_id: null,
        student_code: 'S002',
        name: 'Jane Smith',
        birth_date: '2011-01-01',
        gender: 'female',
        student_phone: null,
        profile_image_url: null,
        grade: '초등학교 5학년',
        school: 'ABC 초등학교',
        enrollment_date: '2024-01-01',
        withdrawal_date: null,
        emergency_contact: '010-2345-6789',
        notes: null,
        commute_method: null,
        marketing_source: null,
        kiosk_pin: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        deleted_at: null,
      },
    ])

    const useCase = createGetStudentsUseCase({ customDataSource: mockDataSource })

    // Act
    const result = await useCase.execute({
      tenantId: 'tenant-1',
      filters: { grade: '초등학교 6학년' },
    })

    // Assert
    expect(result.students).toHaveLength(1)
    expect(result.students[0].name).toBe('John Doe')
  })

  it('should exclude deleted students', async () => {
    // Arrange
    mockDataSource.seed('students', [
      {
        id: 'student-1',
        tenant_id: 'tenant-1',
        user_id: null,
        student_code: 'S001',
        name: 'Active Student',
        birth_date: '2010-01-01',
        gender: 'male',
        student_phone: null,
        profile_image_url: null,
        grade: '초등학교 6학년',
        school: 'ABC 초등학교',
        enrollment_date: '2024-01-01',
        withdrawal_date: null,
        emergency_contact: '010-1234-5678',
        notes: null,
        commute_method: null,
        marketing_source: null,
        kiosk_pin: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        deleted_at: null,
      },
      {
        id: 'student-2',
        tenant_id: 'tenant-1',
        user_id: null,
        student_code: 'S002',
        name: 'Deleted Student',
        birth_date: '2011-01-01',
        gender: 'female',
        student_phone: null,
        profile_image_url: null,
        grade: '초등학교 5학년',
        school: 'ABC 초등학교',
        enrollment_date: '2024-01-01',
        withdrawal_date: null,
        emergency_contact: '010-2345-6789',
        notes: null,
        commute_method: null,
        marketing_source: null,
        kiosk_pin: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        deleted_at: '2024-06-01T00:00:00Z',
      },
    ])

    const useCase = createGetStudentsUseCase({ customDataSource: mockDataSource })

    // Act
    const result = await useCase.execute({ tenantId: 'tenant-1' })

    // Assert
    expect(result.students).toHaveLength(1)
    expect(result.students[0].name).toBe('Active Student')
  })
})
