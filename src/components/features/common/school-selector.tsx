'use client'

import { useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { Button } from '@ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@ui/command'
import { cn } from '@/lib/utils'

interface SchoolSelectorProps {
  value?: string
  onChange?: (value: string) => void
  schools?: string[]
  placeholder?: string
  disabled?: boolean
  className?: string
}

/**
 * SchoolSelector Component
 *
 * 학교 선택 컴포넌트 - 검색 가능한 학교 목록 제공, 새로운 학교명 직접 입력 가능
 *
 * ## 사용 예시
 *
 * ### 기본 사용
 * ```tsx
 * const [school, setSchool] = useState<string>('')
 * const schools = ['서울초등학교', '서울중학교', '서울고등학교']
 *
 * <SchoolSelector
 *   value={school}
 *   onChange={setSchool}
 *   schools={schools}
 * />
 * ```
 *
 * ### React Hook Form과 함께
 * ```tsx
 * <SchoolSelector
 *   value={form.watch('school')}
 *   onChange={(value) => form.setValue('school', value)}
 *   schools={schools}
 *   placeholder="학교 선택 또는 입력..."
 * />
 * ```
 *
 * ## 기능
 * - 기존 학교 목록에서 검색 및 선택
 * - 새로운 학교명 직접 입력 가능
 * - Enter 키로 빠른 입력
 * - 검색 필터링
 */
export function SchoolSelector({
  value,
  onChange,
  schools = [],
  placeholder = '학교 선택 또는 입력...',
  disabled = false,
  className,
}: SchoolSelectorProps) {
  const [schoolInput, setSchoolInput] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const handleSelect = (selectedSchool: string) => {
    onChange?.(selectedSchool)
    setSchoolInput(selectedSchool)
    setIsOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && schoolInput) {
      e.preventDefault()
      handleSelect(schoolInput)
    }
  }

  const filteredSchools = schools.filter((school) =>
    school.toLowerCase().includes(schoolInput.toLowerCase())
  )

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={isOpen}
          disabled={disabled}
          className={cn('w-full justify-between', className)}
        >
          {value || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="학교 검색 또는 입력..."
            value={schoolInput}
            onValueChange={setSchoolInput}
            onKeyDown={handleKeyDown}
          />
          <CommandList>
            <CommandEmpty>
              {schoolInput ? (
                <div
                  className="p-2 text-center text-sm cursor-pointer hover:bg-accent rounded-md transition-colors"
                  onClick={() => handleSelect(schoolInput)}
                >
                  &quot;{schoolInput}&quot; 사용하기
                </div>
              ) : (
                <div className="p-2 text-center text-sm text-muted-foreground">
                  학교명을 입력하거나 목록에서 선택하세요
                </div>
              )}
            </CommandEmpty>
            {filteredSchools.length > 0 && (
              <CommandGroup>
                {filteredSchools.map((school) => (
                  <CommandItem
                    key={school}
                    value={school}
                    onSelect={() => handleSelect(school)}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === school ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    {school}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
