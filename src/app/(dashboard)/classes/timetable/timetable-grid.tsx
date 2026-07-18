'use client'

/**
 * 주간 시간표 그리드 (요일 열 × 시간 행)
 *
 * - 수업 블록: 반 이름/강사/강의실, 수업별 고정 색상, 클릭 시 상세로 이동
 * - 겹치는 블록은 레인 분할로 나란히 표시
 * - 강의실/강사 충돌은 상단 배너 + 블록 강조로 표시
 */

import { useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertTriangle, CalendarX2 } from 'lucide-react'
import { Badge } from '@ui/badge'
import { cn } from '@/lib/utils'
import {
  assignLanes,
  buildTimetableBlocks,
  computeTimeRange,
  findConflicts,
  ISO_DAY_LABELS,
  type TimetableBlock,
  type TimetableClassInput,
} from '@/lib/timetable'

const HOUR_HEIGHT = 56 // px per hour

/** 수업 id 기반 고정 색상 (팔레트 순환) */
const BLOCK_COLORS = [
  'bg-blue-100 border-blue-300 text-blue-900 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-100',
  'bg-emerald-100 border-emerald-300 text-emerald-900 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-100',
  'bg-amber-100 border-amber-300 text-amber-900 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-100',
  'bg-violet-100 border-violet-300 text-violet-900 dark:bg-violet-950 dark:border-violet-800 dark:text-violet-100',
  'bg-rose-100 border-rose-300 text-rose-900 dark:bg-rose-950 dark:border-rose-800 dark:text-rose-100',
  'bg-cyan-100 border-cyan-300 text-cyan-900 dark:bg-cyan-950 dark:border-cyan-800 dark:text-cyan-100',
  'bg-lime-100 border-lime-300 text-lime-900 dark:bg-lime-950 dark:border-lime-800 dark:text-lime-100',
]

function colorForClass(classId: string): string {
  let hash = 0
  for (let i = 0; i < classId.length; i++) {
    hash = (hash * 31 + classId.charCodeAt(i)) >>> 0
  }
  return BLOCK_COLORS[hash % BLOCK_COLORS.length]
}

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

interface TimetableGridProps {
  classes: TimetableClassInput[]
}

export function TimetableGrid({ classes }: TimetableGridProps) {
  const router = useRouter()

  const { blocks, unscheduled, conflicts, lanes, range, conflictedBlocks } = useMemo(() => {
    const { blocks, unscheduled } = buildTimetableBlocks(classes)
    const conflicts = findConflicts(blocks)
    const conflictedBlocks = new Set<TimetableBlock>()
    for (const c of conflicts) {
      conflictedBlocks.add(c.a)
      conflictedBlocks.add(c.b)
    }
    return {
      blocks,
      unscheduled,
      conflicts,
      lanes: assignLanes(blocks),
      range: computeTimeRange(blocks),
      conflictedBlocks,
    }
  }, [classes])

  const hours = Array.from(
    { length: range.endHour - range.startHour },
    (_, i) => range.startHour + i
  )
  const gridHeight = hours.length * HOUR_HEIGHT

  return (
    <div className="space-y-4">
      {/* 충돌 배너 */}
      {conflicts.length > 0 && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 space-y-2">
          <div className="flex items-center gap-2 font-semibold text-destructive">
            <AlertTriangle className="h-4 w-4" />
            시간 충돌 {conflicts.length}건
          </div>
          <ul className="text-sm space-y-1">
            {conflicts.map((conflict, index) => (
              <li key={index} className="text-destructive/90">
                [{ISO_DAY_LABELS[conflict.day]}]{' '}
                {conflict.type === 'room'
                  ? `강의실 ${conflict.a.room} 겹침`
                  : `강사 ${conflict.a.instructorName ?? ''} 겹침`}
                {' — '}
                <span className="font-medium">{conflict.a.className}</span>
                {` (${formatMinutes(conflict.a.startMinutes)}~${formatMinutes(conflict.a.endMinutes)})`}
                {' ↔ '}
                <span className="font-medium">{conflict.b.className}</span>
                {` (${formatMinutes(conflict.b.startMinutes)}~${formatMinutes(conflict.b.endMinutes)})`}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 그리드 */}
      {blocks.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border rounded-lg">
          <CalendarX2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>시간이 설정된 수업이 없습니다.</p>
          <p className="text-sm mt-1">수업 편집에서 요일과 시간을 지정하면 시간표에 표시됩니다.</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto bg-card">
          <div className="min-w-[840px]">
            {/* 요일 헤더 */}
            <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b">
              <div />
              {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                <div
                  key={day}
                  className={cn(
                    'py-2 text-center text-sm font-semibold border-l',
                    day >= 6 && 'text-red-500'
                  )}
                >
                  {ISO_DAY_LABELS[day]}
                </div>
              ))}
            </div>

            {/* 본문: 시간 눈금 + 7일 컬럼 */}
            <div className="grid grid-cols-[56px_repeat(7,1fr)]">
              {/* 시간 눈금 */}
              <div className="relative" style={{ height: gridHeight }}>
                {hours.map((hour, i) => (
                  <div
                    key={hour}
                    className="absolute right-2 text-xs text-muted-foreground -translate-y-1/2"
                    style={{ top: i * HOUR_HEIGHT }}
                  >
                    {i > 0 && `${String(hour).padStart(2, '0')}:00`}
                  </div>
                ))}
              </div>

              {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                <div key={day} className="relative border-l" style={{ height: gridHeight }}>
                  {/* 시간선 */}
                  {hours.map((hour, i) => (
                    <div
                      key={hour}
                      className="absolute inset-x-0 border-t border-border/50"
                      style={{ top: i * HOUR_HEIGHT }}
                    />
                  ))}

                  {/* 수업 블록 */}
                  {blocks
                    .filter((block) => block.day === day)
                    .map((block, index) => {
                      const lane = lanes.get(block) ?? { lane: 0, laneCount: 1 }
                      const top =
                        ((block.startMinutes - range.startHour * 60) / 60) * HOUR_HEIGHT
                      const height =
                        ((block.endMinutes - block.startMinutes) / 60) * HOUR_HEIGHT
                      const widthPct = 100 / lane.laneCount
                      const isConflicted = conflictedBlocks.has(block)

                      return (
                        <button
                          key={`${block.classId}-${index}`}
                          type="button"
                          onClick={() => router.push(`/classes/${block.classId}`)}
                          className={cn(
                            'absolute rounded-md border px-1.5 py-1 text-left text-xs leading-tight overflow-hidden transition-shadow hover:shadow-md hover:z-10',
                            colorForClass(block.classId),
                            isConflicted && 'ring-2 ring-destructive'
                          )}
                          style={{
                            top: top + 1,
                            height: Math.max(height - 2, 22),
                            left: `calc(${lane.lane * widthPct}% + 2px)`,
                            width: `calc(${widthPct}% - 4px)`,
                          }}
                          title={`${block.className} ${formatMinutes(block.startMinutes)}~${formatMinutes(block.endMinutes)}${block.room ? ` · ${block.room}` : ''}${block.instructorName ? ` · ${block.instructorName}` : ''}`}
                        >
                          <div className="font-semibold truncate">{block.className}</div>
                          {height >= 40 && (
                            <div className="truncate opacity-80">
                              {formatMinutes(block.startMinutes)}~{formatMinutes(block.endMinutes)}
                            </div>
                          )}
                          {height >= 56 && (block.room || block.instructorName) && (
                            <div className="truncate opacity-70">
                              {[block.room, block.instructorName].filter(Boolean).join(' · ')}
                            </div>
                          )}
                        </button>
                      )
                    })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 시간 미설정 수업 안내 */}
      {unscheduled.length > 0 && (
        <div className="rounded-lg border bg-muted/40 p-4">
          <div className="flex items-center gap-2 text-sm font-medium mb-2">
            <CalendarX2 className="h-4 w-4 text-muted-foreground" />
            시간 미설정 수업 {unscheduled.length}개
            <span className="text-muted-foreground font-normal">
              — 수업 편집에서 요일/시간을 지정하면 시간표에 표시됩니다
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {unscheduled.map((cls) => (
              <Link key={cls.id} href={`/classes/${cls.id}`}>
                <Badge variant="outline" className="cursor-pointer hover:bg-accent">
                  {cls.name}
                </Badge>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
