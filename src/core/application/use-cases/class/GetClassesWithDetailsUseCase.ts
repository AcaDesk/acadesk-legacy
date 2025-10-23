/**
 * Get Classes with Details Use Case
 * 수업 목록을 강사 이름과 수강생 수와 함께 조회
 */

import { IClassRepository, ClassWithDetails } from '@core/domain/repositories/IClassRepository'

export interface ClassDTO {
  id: string
  name: string
  description: string | null
  subject: string | null
  gradeLevel: string | null
  instructorName: string | null
  studentCount: number
  schedule: Record<string, unknown> | null
  room: string | null
  status: string
  active: boolean
  createdAt: string
}

export class GetClassesWithDetailsUseCase {
  constructor(private readonly classRepository: IClassRepository) {}

  async execute(): Promise<ClassDTO[]> {
    const classesWithDetails = await this.classRepository.findAllWithDetails()

    return classesWithDetails.map((item) => ({
      id: item.class.id,
      name: item.class.name,
      description: item.class.description,
      subject: item.class.subject,
      gradeLevel: item.class.gradeLevel,
      instructorName: item.instructorName,
      studentCount: item.studentCount,
      schedule: item.class.schedule,
      room: item.class.room,
      status: item.class.status,
      active: item.class.active,
      createdAt: item.class.createdAt.toISOString(),
    }))
  }
}
