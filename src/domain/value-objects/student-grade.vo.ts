/**
 * 학년 Value Object
 * 불변 객체로 학년 유효성을 보장
 */
export class StudentGrade {
  private static readonly VALID_GRADES = [
    "초1",
    "초2",
    "초3",
    "초4",
    "초5",
    "초6",
    "중1",
    "중2",
    "중3",
    "고1",
    "고2",
    "고3",
  ]

  private constructor(private readonly value: string) {
    this.validate(value)
  }

  static create(value: string): StudentGrade {
    return new StudentGrade(value)
  }

  private validate(value: string): void {
    if (!StudentGrade.VALID_GRADES.includes(value)) {
      throw new Error(
        `Invalid grade: ${value}. Must be one of ${StudentGrade.VALID_GRADES.join(", ")}`
      )
    }
  }

  getValue(): string {
    return this.value
  }

  getSchoolLevel(): "elementary" | "middle" | "high" {
    if (this.isElementarySchool()) return "elementary"
    if (this.isMiddleSchool()) return "middle"
    return "high"
  }

  isElementarySchool(): boolean {
    return this.value.startsWith("초")
  }

  isMiddleSchool(): boolean {
    return this.value.startsWith("중")
  }

  isHighSchool(): boolean {
    return this.value.startsWith("고")
  }

  equals(other: StudentGrade): boolean {
    return this.value === other.value
  }
}
