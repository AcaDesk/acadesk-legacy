/**
 * Student Code Value Object
 * 학생 코드를 표현하는 값 객체
 */

export class StudentCode {
  private readonly value: string

  private constructor(value: string) {
    this.value = value
  }

  static create(code?: string): StudentCode {
    if (code) {
      return new StudentCode(code)
    }
    return StudentCode.generate()
  }

  static generate(): StudentCode {
    const timestamp = Date.now().toString(36).toUpperCase()
    const random = Math.random().toString(36).substring(2, 5).toUpperCase()
    return new StudentCode(`STD-${timestamp}${random}`)
  }

  getValue(): string {
    return this.value
  }

  equals(other: StudentCode): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}
