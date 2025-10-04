import type { IStudentRepository } from "@/domain/repositories/student.repository.interface"
import type {
  ListStudentsInput,
  ListStudentsOutput,
} from "./list-students.dto"

/**
 * List Students Use Case
 * 학생 목록을 조회하는 유스케이스
 */
export class ListStudentsUseCase {
  constructor(private readonly studentRepository: IStudentRepository) {}

  async execute(input: ListStudentsInput): Promise<ListStudentsOutput> {
    this.validateInput(input)

    const page = input.page || 1
    const pageSize = input.pageSize || 10
    const offset = (page - 1) * pageSize

    const students = await this.studentRepository.findAll({
      tenantId: input.tenantId,
      status: input.status,
      grade: input.grade,
      search: input.search,
      limit: pageSize,
      offset,
    })

    const total = await this.studentRepository.count({
      tenantId: input.tenantId,
      status: input.status,
      grade: input.grade,
      search: input.search,
    })

    const studentDTOs = students.map((student) => student.toDTO())

    return {
      students: studentDTOs,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  }

  private validateInput(input: ListStudentsInput): void {
    if (!input.tenantId) {
      throw new Error("tenantId is required")
    }

    if (input.page && input.page < 1) {
      throw new Error("page must be greater than 0")
    }

    if (input.pageSize && input.pageSize < 1) {
      throw new Error("pageSize must be greater than 0")
    }
  }
}
