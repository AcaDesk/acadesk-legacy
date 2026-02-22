import { describe, it, expect } from 'vitest'
import { createGroupKey, generateInstructorComment } from './report-helpers'

// ============================================================================
// createGroupKey: 시험 그룹핑 키 생성 로직
// ============================================================================
describe('createGroupKey', () => {
  it('subject_id가 있으면 subject_ 접두사로 키 생성', () => {
    expect(createGroupKey('uuid-123', 'quiz', 'Reading Test')).toBe('subject_uuid-123')
  })

  it('subject_id 없고 시험명에 reading 키워드 → subject_reading', () => {
    expect(createGroupKey(null, 'quiz', 'Weekly Reading Test')).toBe('subject_reading')
  })

  it('subject_id 없고 시험명에 grammar 키워드 → subject_grammar', () => {
    expect(createGroupKey(null, null, 'Grammar Practice')).toBe('subject_grammar')
  })

  it('subject_id 없고 시험명에 vocabulary 키워드 → subject_vocabulary', () => {
    expect(createGroupKey(null, null, 'Vocabulary Quiz')).toBe('subject_vocabulary')
  })

  it('subject_id 없고 시험명에 vocab 키워드 → subject_vocabulary', () => {
    expect(createGroupKey(null, null, 'Weekly Vocab Test')).toBe('subject_vocabulary')
  })

  it('subject_id 없고 시험명에 단어 키워드 → subject_vocabulary', () => {
    expect(createGroupKey(null, null, '주간 단어 시험')).toBe('subject_vocabulary')
  })

  it('subject_id 없고 시험명에 speaking 키워드 → subject_speaking', () => {
    expect(createGroupKey(null, null, 'Speaking Assessment')).toBe('subject_speaking')
  })

  it('subject_id 없고 시험명에 listening 키워드 → subject_speaking', () => {
    expect(createGroupKey(null, null, 'Listening Comprehension')).toBe('subject_speaking')
  })

  it('subject_id 없고 시험명에 phonics 키워드 → subject_reading', () => {
    expect(createGroupKey(null, null, 'Phonics Level 3')).toBe('subject_reading')
  })

  it('subject_id 없고 시험명에 writing 키워드 → subject_grammar', () => {
    expect(createGroupKey(null, null, 'Writing Exercise')).toBe('subject_grammar')
  })

  it('키워드 매치 안 되면 category_code 사용', () => {
    expect(createGroupKey(null, 'monthly_exam', '3월 월말평가')).toBe('category_monthly_exam')
  })

  it('모두 없으면 시험명 기반 키 생성', () => {
    expect(createGroupKey(null, null, '특별 시험')).toBe('exam_특별 시험')
  })

  it('subject_id가 있으면 키워드 매칭을 건너뛴다', () => {
    // subject_id가 있으면 시험명에 키워드가 있어도 subject_id를 우선 사용
    expect(createGroupKey('sub-1', 'quiz', 'Grammar Final')).toBe('subject_sub-1')
  })

  it('대소문자 구분 없이 키워드 매칭', () => {
    expect(createGroupKey(null, null, 'READING COMPREHENSION')).toBe('subject_reading')
  })
})

// ============================================================================
// generateInstructorComment: 강사 코멘트 자동 생성
// ============================================================================
describe('generateInstructorComment', () => {
  it('출석률 95% 이상 → "매우 우수"', () => {
    const result = generateInstructorComment(
      { total: 20, present: 19, late: 1, absent: 0, rate: 100 },
      []
    )
    expect(result).toContain('출석률이 매우 우수합니다')
  })

  it('출석률 85~94% → "양호"', () => {
    const result = generateInstructorComment(
      { total: 20, present: 17, late: 0, absent: 3, rate: 85 },
      []
    )
    expect(result).toContain('출석률이 양호합니다')
  })

  it('출석률 85% 미만 → 주의 메시지', () => {
    const result = generateInstructorComment(
      { total: 20, present: 10, late: 2, absent: 8, rate: 60 },
      []
    )
    expect(result).toContain('출석에 더욱 신경')
  })

  it('향상된 과목 → 향상 코멘트 포함', () => {
    const result = generateInstructorComment(
      { total: 20, present: 20, late: 0, absent: 0, rate: 100 },
      [
        { category: 'Reading', current: 90, previous: 80, change: 10, tests: [] },
        { category: 'Grammar', current: 70, previous: 75, change: -5, tests: [] },
      ]
    )
    expect(result).toContain('Reading')
    expect(result).toContain('향상')
  })

  it('하락한 과목 → 집중 필요 코멘트 포함', () => {
    const result = generateInstructorComment(
      { total: 20, present: 20, late: 0, absent: 0, rate: 100 },
      [
        { category: 'Grammar', current: 60, previous: 80, change: -20, tests: [] },
      ]
    )
    expect(result).toContain('Grammar')
    expect(result).toContain('집중이 필요')
  })

  it('평균 90점 이상 → "매우 우수한 성취도"', () => {
    const result = generateInstructorComment(
      { total: 20, present: 20, late: 0, absent: 0, rate: 100 },
      [
        { category: 'Reading', current: 95, previous: 90, change: 5, tests: [] },
        { category: 'Grammar', current: 92, previous: 88, change: 4, tests: [] },
      ]
    )
    expect(result).toContain('매우 우수한 성취도')
  })

  it('평균 80~89점 → "양호한 성취도"', () => {
    const result = generateInstructorComment(
      { total: 20, present: 20, late: 0, absent: 0, rate: 100 },
      [
        { category: 'Reading', current: 85, previous: 80, change: 5, tests: [] },
        { category: 'Grammar', current: 80, previous: 78, change: 2, tests: [] },
      ]
    )
    expect(result).toContain('양호한 성취도')
  })

  it('평균 80점 미만 → 향상 노력 메시지', () => {
    const result = generateInstructorComment(
      { total: 20, present: 20, late: 0, absent: 0, rate: 100 },
      [
        { category: 'Reading', current: 60, previous: 55, change: 5, tests: [] },
        { category: 'Grammar', current: 50, previous: 45, change: 5, tests: [] },
      ]
    )
    expect(result).toContain('성취도 향상을 위해')
  })

  it('성적 데이터 없으면 데이터 부족 메시지', () => {
    const result = generateInstructorComment(
      { total: 20, present: 20, late: 0, absent: 0, rate: 100 },
      []
    )
    expect(result).toContain('성적 데이터가 부족')
  })

  it('change가 5 이하이면 향상/하락 코멘트 없음', () => {
    const result = generateInstructorComment(
      { total: 20, present: 20, late: 0, absent: 0, rate: 100 },
      [
        { category: 'Reading', current: 85, previous: 82, change: 3, tests: [] },
      ]
    )
    expect(result).not.toContain('향상')
    expect(result).not.toContain('집중이 필요')
  })
})
