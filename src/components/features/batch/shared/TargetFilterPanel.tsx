'use client'

import { Label } from '@ui/label'
import { Input } from '@ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui/select'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'

type SchoolLevel = 'all' | 'elementary' | 'middle' | 'high'

const SCHOOL_LEVEL_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'elementary', label: '초등' },
  { value: 'middle', label: '중등' },
  { value: 'high', label: '고등' },
] as const

interface TargetFilterPanelProps {
  search: string
  onSearchChange: (value: string) => void
  grade: string
  onGradeChange: (value: string) => void
  classId: string
  onClassIdChange: (value: string) => void
  grades: string[]
  classes: { id: string; name: string }[]
  schoolLevel: SchoolLevel
  onSchoolLevelChange: (value: SchoolLevel) => void
}

export function TargetFilterPanel({
  search,
  onSearchChange,
  grade,
  onGradeChange,
  classId,
  onClassIdChange,
  grades,
  classes,
  schoolLevel,
  onSchoolLevelChange,
}: TargetFilterPanelProps) {
  return (
    <div className="space-y-3">
      <div className="flex gap-1 bg-muted/40 p-1 rounded-lg w-fit">
        {SCHOOL_LEVEL_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => onSchoolLevelChange(value)}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-semibold transition-all',
              schoolLevel === value
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <Label htmlFor="search" className="text-sm font-medium mb-1.5 block">
            검색
          </Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              placeholder="이름 또는 학생코드 검색..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="w-[150px]">
          <Label className="text-sm font-medium mb-1.5 block">학년</Label>
          <Select value={grade} onValueChange={onGradeChange}>
            <SelectTrigger>
              <SelectValue placeholder="전체" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              {grades.map((g) => (
                <SelectItem key={g} value={g}>{g}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-[180px]">
          <Label className="text-sm font-medium mb-1.5 block">반</Label>
          <Select value={classId} onValueChange={onClassIdChange}>
            <SelectTrigger>
              <SelectValue placeholder="전체" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}

export type { SchoolLevel }
