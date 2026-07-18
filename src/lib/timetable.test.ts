import { describe, it, expect } from 'vitest'
import {
  parseTimeToMinutes,
  buildTimetableBlocks,
  findConflicts,
  assignLanes,
  computeTimeRange,
  type TimetableClassInput,
} from './timetable'

function makeClass(overrides: Partial<TimetableClassInput> = {}): TimetableClassInput {
  return {
    id: 'class-1',
    name: '중2 수학 A',
    subject: '수학',
    room: '201호',
    instructorId: 'inst-1',
    instructorName: '김강사',
    schedule: { days: ['monday', 'wednesday'], startTime: '16:00', endTime: '17:30' },
    ...overrides,
  }
}

describe('parseTimeToMinutes', () => {
  it('HH:MM을 분으로 변환', () => {
    expect(parseTimeToMinutes('09:00')).toBe(540)
    expect(parseTimeToMinutes('16:30')).toBe(990)
    expect(parseTimeToMinutes('23:59')).toBe(1439)
  })

  it('불량 형식은 null', () => {
    expect(parseTimeToMinutes('25:00')).toBeNull()
    expect(parseTimeToMinutes('9시')).toBeNull()
    expect(parseTimeToMinutes(null)).toBeNull()
    expect(parseTimeToMinutes(930)).toBeNull()
  })
})

describe('buildTimetableBlocks', () => {
  it('요일별로 블록을 생성한다', () => {
    const { blocks, unscheduled } = buildTimetableBlocks([makeClass()])
    expect(blocks).toHaveLength(2)
    expect(blocks[0]).toMatchObject({ day: 1, startMinutes: 960, endMinutes: 1050 })
    expect(blocks[1].day).toBe(3)
    expect(unscheduled).toHaveLength(0)
  })

  it('schedule 미설정/불량 수업은 unscheduled로 분리', () => {
    const { blocks, unscheduled } = buildTimetableBlocks([
      makeClass({ id: 'c1', schedule: null }),
      makeClass({ id: 'c2', schedule: { days: [], startTime: '16:00', endTime: '17:00' } }),
      makeClass({ id: 'c3', schedule: { days: ['monday'], startTime: '18:00', endTime: '17:00' } }),
      makeClass({ id: 'c4' }),
    ])
    expect(unscheduled.map((c) => c.id)).toEqual(['c1', 'c2', 'c3'])
    expect(blocks.every((b) => b.classId === 'c4')).toBe(true)
  })
})

describe('findConflicts', () => {
  it('같은 강의실 시간 겹침을 감지한다', () => {
    const { blocks } = buildTimetableBlocks([
      makeClass({ id: 'c1', instructorId: 'i1', room: '201호' }),
      makeClass({
        id: 'c2',
        instructorId: 'i2',
        room: '201호',
        schedule: { days: ['monday'], startTime: '17:00', endTime: '18:00' },
      }),
    ])
    const conflicts = findConflicts(blocks)
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0].type).toBe('room')
    expect(conflicts[0].day).toBe(1)
  })

  it('같은 강사 시간 겹침을 감지한다 (다른 강의실이어도)', () => {
    const { blocks } = buildTimetableBlocks([
      makeClass({ id: 'c1', room: '201호', instructorId: 'i1' }),
      makeClass({
        id: 'c2',
        room: '302호',
        instructorId: 'i1',
        schedule: { days: ['wednesday'], startTime: '17:00', endTime: '19:00' },
      }),
    ])
    const conflicts = findConflicts(blocks)
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0].type).toBe('instructor')
    expect(conflicts[0].day).toBe(3)
  })

  it('시간이 안 겹치면 충돌 아님 (경계 접촉 포함)', () => {
    const { blocks } = buildTimetableBlocks([
      makeClass({ id: 'c1' }),
      makeClass({
        id: 'c2',
        schedule: { days: ['monday'], startTime: '17:30', endTime: '19:00' },
      }),
    ])
    expect(findConflicts(blocks)).toHaveLength(0)
  })

  it('강의실 미지정끼리는 room 충돌로 보지 않는다', () => {
    const { blocks } = buildTimetableBlocks([
      makeClass({ id: 'c1', room: null, instructorId: 'i1' }),
      makeClass({ id: 'c2', room: null, instructorId: 'i2' }),
    ])
    expect(findConflicts(blocks)).toHaveLength(0)
  })
})

describe('assignLanes', () => {
  it('겹치는 블록은 서로 다른 레인, laneCount 공유', () => {
    const { blocks } = buildTimetableBlocks([
      makeClass({ id: 'c1', schedule: { days: ['monday'], startTime: '16:00', endTime: '18:00' } }),
      makeClass({ id: 'c2', schedule: { days: ['monday'], startTime: '17:00', endTime: '19:00' } }),
      makeClass({ id: 'c3', schedule: { days: ['monday'], startTime: '19:00', endTime: '20:00' } }),
    ])
    const lanes = assignLanes(blocks)
    const [b1, b2, b3] = blocks
    expect(lanes.get(b1)!.lane).not.toBe(lanes.get(b2)!.lane)
    expect(lanes.get(b1)!.laneCount).toBe(2)
    // 겹치지 않는 c3는 자체 클러스터 (단일 레인)
    expect(lanes.get(b3)!.laneCount).toBe(1)
  })
})

describe('computeTimeRange', () => {
  it('블록 범위를 정시로 확장하되 기본 범위를 보장', () => {
    const { blocks } = buildTimetableBlocks([
      makeClass({ schedule: { days: ['monday'], startTime: '07:30', endTime: '23:30' } }),
    ])
    expect(computeTimeRange(blocks)).toEqual({ startHour: 7, endHour: 24 })
    expect(computeTimeRange([])).toEqual({ startHour: 9, endHour: 22 })
  })
})
