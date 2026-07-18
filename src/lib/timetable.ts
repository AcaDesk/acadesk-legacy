/**
 * 주간 시간표 도메인 로직 (순수 함수)
 *
 * classes.schedule jsonb({ days: ['monday'...], startTime: 'HH:MM', endTime: 'HH:MM' })를
 * 그리드 블록으로 변환하고, 강의실/강사 시간 충돌을 감지한다.
 */

export interface ClassScheduleJson {
  days?: unknown
  startTime?: unknown
  endTime?: unknown
}

export interface TimetableClassInput {
  id: string
  name: string
  subject: string | null
  room: string | null
  instructorId: string | null
  instructorName: string | null
  schedule: unknown
}

export interface TimetableBlock {
  classId: string
  className: string
  subject: string | null
  room: string | null
  instructorId: string | null
  instructorName: string | null
  /** ISO 요일 (1=월 ... 7=일) */
  day: number
  startMinutes: number
  endMinutes: number
}

export type ConflictType = 'room' | 'instructor'

export interface TimetableConflict {
  type: ConflictType
  day: number
  a: TimetableBlock
  b: TimetableBlock
}

const DAY_KEY_TO_ISO: Record<string, number> = {
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  sunday: 7,
}

export const ISO_DAY_LABELS: Record<number, string> = {
  1: '월', 2: '화', 3: '수', 4: '목', 5: '금', 6: '토', 7: '일',
}

/** 'HH:MM' → 분 (형식 불량 시 null) */
export function parseTimeToMinutes(value: unknown): number | null {
  if (typeof value !== 'string') return null
  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(value.trim())
  if (!match) return null
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10)
}

/**
 * 수업 목록 → 시간표 블록 목록
 * schedule이 없거나 형식이 불량한 수업은 unscheduled로 분리한다.
 */
export function buildTimetableBlocks(classes: TimetableClassInput[]): {
  blocks: TimetableBlock[]
  unscheduled: TimetableClassInput[]
} {
  const blocks: TimetableBlock[] = []
  const unscheduled: TimetableClassInput[] = []

  for (const cls of classes) {
    const schedule = (cls.schedule ?? null) as ClassScheduleJson | null
    const days = Array.isArray(schedule?.days) ? schedule.days : []
    const start = parseTimeToMinutes(schedule?.startTime)
    const end = parseTimeToMinutes(schedule?.endTime)

    const isoDays = days
      .map((d) => (typeof d === 'string' ? DAY_KEY_TO_ISO[d] : undefined))
      .filter((d): d is number => typeof d === 'number')

    if (isoDays.length === 0 || start === null || end === null || end <= start) {
      unscheduled.push(cls)
      continue
    }

    for (const day of isoDays) {
      blocks.push({
        classId: cls.id,
        className: cls.name,
        subject: cls.subject,
        room: cls.room?.trim() || null,
        instructorId: cls.instructorId,
        instructorName: cls.instructorName,
        day,
        startMinutes: start,
        endMinutes: end,
      })
    }
  }

  return { blocks, unscheduled }
}

function overlaps(a: TimetableBlock, b: TimetableBlock): boolean {
  return a.day === b.day && a.startMinutes < b.endMinutes && b.startMinutes < a.endMinutes
}

/**
 * 강의실/강사 시간 충돌 감지
 * - room: 같은 강의실(비어있지 않음)에 시간이 겹치는 서로 다른 수업
 * - instructor: 같은 강사에게 시간이 겹치는 서로 다른 수업
 */
export function findConflicts(blocks: TimetableBlock[]): TimetableConflict[] {
  const conflicts: TimetableConflict[] = []

  for (let i = 0; i < blocks.length; i++) {
    for (let j = i + 1; j < blocks.length; j++) {
      const a = blocks[i]
      const b = blocks[j]
      if (a.classId === b.classId) continue
      if (!overlaps(a, b)) continue

      if (a.room && b.room && a.room === b.room) {
        conflicts.push({ type: 'room', day: a.day, a, b })
      }
      if (a.instructorId && b.instructorId && a.instructorId === b.instructorId) {
        conflicts.push({ type: 'instructor', day: a.day, a, b })
      }
    }
  }

  return conflicts
}

/**
 * 같은 요일 내 겹치는 블록들의 가로 레인 배치 (그리드 렌더용)
 * 반환: classId+day 블록별 { lane, laneCount }
 */
export function assignLanes(
  blocks: TimetableBlock[]
): Map<TimetableBlock, { lane: number; laneCount: number }> {
  const result = new Map<TimetableBlock, { lane: number; laneCount: number }>()

  for (let day = 1; day <= 7; day++) {
    const dayBlocks = blocks
      .filter((b) => b.day === day)
      .sort((x, y) => x.startMinutes - y.startMinutes || x.endMinutes - y.endMinutes)

    // 겹침 클러스터 단위로 그리디 레인 배정
    let cluster: TimetableBlock[] = []
    let clusterEnd = -1

    const flushCluster = () => {
      if (cluster.length === 0) return
      const laneEnds: number[] = []
      const laneOf = new Map<TimetableBlock, number>()
      for (const block of cluster) {
        let lane = laneEnds.findIndex((end) => end <= block.startMinutes)
        if (lane === -1) {
          lane = laneEnds.length
          laneEnds.push(block.endMinutes)
        } else {
          laneEnds[lane] = block.endMinutes
        }
        laneOf.set(block, lane)
      }
      for (const block of cluster) {
        result.set(block, { lane: laneOf.get(block)!, laneCount: laneEnds.length })
      }
      cluster = []
    }

    for (const block of dayBlocks) {
      if (cluster.length > 0 && block.startMinutes >= clusterEnd) {
        flushCluster()
        clusterEnd = -1
      }
      cluster.push(block)
      clusterEnd = Math.max(clusterEnd, block.endMinutes)
    }
    flushCluster()
  }

  return result
}

/** 그리드 표시 시간 범위 (블록 기준, 정시로 내림/올림, 기본 09:00~22:00) */
export function computeTimeRange(blocks: TimetableBlock[]): { startHour: number; endHour: number } {
  if (blocks.length === 0) return { startHour: 9, endHour: 22 }
  const min = Math.min(...blocks.map((b) => b.startMinutes))
  const max = Math.max(...blocks.map((b) => b.endMinutes))
  return {
    startHour: Math.min(Math.floor(min / 60), 9),
    endHour: Math.max(Math.ceil(max / 60), 22),
  }
}
