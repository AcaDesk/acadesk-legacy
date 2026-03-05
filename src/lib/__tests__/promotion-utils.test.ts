import { describe, it, expect } from 'vitest'
import {
  getNextGrade,
  getPromotionCategory,
  buildPromotionPlans,
  groupByCategory,
  groupTransfersByCurrentSchool,
} from '../promotion-utils'

describe('getNextGrade', () => {
  it('일반 진급: 초1 → 초2', () => {
    expect(getNextGrade('초1')).toBe('초2')
  })

  it('일반 진급: 중2 → 중3', () => {
    expect(getNextGrade('중2')).toBe('중3')
  })

  it('학교 전환: 초6 → 중1', () => {
    expect(getNextGrade('초6')).toBe('중1')
  })

  it('학교 전환: 중3 → 고1', () => {
    expect(getNextGrade('중3')).toBe('고1')
  })

  it('졸업: 고3 → null', () => {
    expect(getNextGrade('고3')).toBeNull()
  })

  it('알 수 없는 학년 → null', () => {
    expect(getNextGrade('대1')).toBeNull()
  })

  it('null → null', () => {
    expect(getNextGrade(null)).toBeNull()
  })
})

describe('getPromotionCategory', () => {
  it('일반 진급 학년', () => {
    expect(getPromotionCategory('초1')).toBe('normal')
    expect(getPromotionCategory('중1')).toBe('normal')
    expect(getPromotionCategory('고2')).toBe('normal')
  })

  it('학교 전환 학년', () => {
    expect(getPromotionCategory('초6')).toBe('school_transfer')
    expect(getPromotionCategory('중3')).toBe('school_transfer')
  })

  it('졸업 학년', () => {
    expect(getPromotionCategory('고3')).toBe('graduation')
  })

  it('학년 미입력', () => {
    expect(getPromotionCategory(null)).toBe('no_grade')
    expect(getPromotionCategory('대1')).toBe('no_grade')
  })
})

describe('buildPromotionPlans', () => {
  const students = [
    { id: '1', name: '김일반', grade: '초3', school: '서울초' },
    { id: '2', name: '이전환', grade: '초6', school: '서울초' },
    { id: '3', name: '박졸업', grade: '고3', school: '서울고' },
    { id: '4', name: '최미입력', grade: null, school: null },
  ]

  it('혼합 학생 목록에 대한 정확한 계획 생성', () => {
    const plans = buildPromotionPlans(students)

    expect(plans).toHaveLength(4)

    // 일반 진급
    expect(plans[0]).toMatchObject({
      studentId: '1',
      currentGrade: '초3',
      nextGrade: '초4',
      nextSchool: '서울초',
      category: 'normal',
      selected: true,
    })

    // 학교 전환 - nextSchool은 null (나중에 지정)
    expect(plans[1]).toMatchObject({
      studentId: '2',
      currentGrade: '초6',
      nextGrade: '중1',
      nextSchool: null,
      category: 'school_transfer',
      selected: true,
    })

    // 졸업 - 기본 미선택
    expect(plans[2]).toMatchObject({
      studentId: '3',
      currentGrade: '고3',
      nextGrade: null,
      category: 'graduation',
      selected: false,
    })

    // 학년 미입력 - 기본 미선택
    expect(plans[3]).toMatchObject({
      studentId: '4',
      currentGrade: null,
      nextGrade: null,
      category: 'no_grade',
      selected: false,
    })
  })
})

describe('groupByCategory', () => {
  it('카테고리별 올바르게 그룹핑', () => {
    const plans = buildPromotionPlans([
      { id: '1', name: 'A', grade: '초3', school: 'S1' },
      { id: '2', name: 'B', grade: '초6', school: 'S1' },
      { id: '3', name: 'C', grade: '고3', school: 'S2' },
      { id: '4', name: 'D', grade: null, school: null },
    ])

    const groups = groupByCategory(plans)

    expect(groups.normal).toHaveLength(1)
    expect(groups.school_transfer).toHaveLength(1)
    expect(groups.graduation).toHaveLength(1)
    expect(groups.no_grade).toHaveLength(1)
  })
})

describe('groupTransfersByCurrentSchool', () => {
  it('학교별 그룹핑', () => {
    const plans = buildPromotionPlans([
      { id: '1', name: 'A', grade: '초6', school: '서울초' },
      { id: '2', name: 'B', grade: '초6', school: '서울초' },
      { id: '3', name: 'C', grade: '중3', school: '강남중' },
      { id: '4', name: 'D', grade: '초6', school: null },
    ])

    const groups = groupTransfersByCurrentSchool(plans)

    expect(groups['서울초']).toHaveLength(2)
    expect(groups['강남중']).toHaveLength(1)
    expect(groups['학교 미입력']).toHaveLength(1)
  })

  it('학교 전환 외 카테고리는 무시', () => {
    const plans = buildPromotionPlans([
      { id: '1', name: 'A', grade: '초3', school: '서울초' },
      { id: '2', name: 'B', grade: '고3', school: '서울고' },
    ])

    const groups = groupTransfersByCurrentSchool(plans)
    expect(Object.keys(groups)).toHaveLength(0)
  })
})
