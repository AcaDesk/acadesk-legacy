import { useState, useEffect, useRef } from 'react'
import { useFormContext } from 'react-hook-form'
import { format } from 'date-fns'
import { Calendar as CalendarIcon, Check, ChevronsUpDown } from 'lucide-react'
import { Input } from '@ui/input'
import { Label } from '@ui/label'
import { Button } from '@ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select'
import { Calendar } from '@ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@ui/command'
import { cn } from '@/lib/utils'
import { GRADES } from '@/lib/constants'
import type { StudentWizardFormValues } from './types'

interface Step1Props {
  schools: string[]
}

export function Step1_StudentInfo({ schools }: Step1Props) {
  const { register, setValue, watch, formState: { errors } } = useFormContext<StudentWizardFormValues>()
  const [schoolInput, setSchoolInput] = useState('')
  const [isSchoolPopoverOpen, setSchoolPopoverOpen] = useState(false)

  const selectedGrade = watch('grade')
  const selectedSchool = watch('school')
  const birthDate = watch('birthDate')
  const currentYear = new Date().getFullYear()

  // register에서 ref를 추출하여 포커스 관리
  const nameRegister = register('name')

  // 포커스 관리: 컴포넌트가 마운트될 때 첫 번째 입력 필드에 포커스
  useEffect(() => {
    if (nameRegister.ref && 'current' in nameRegister.ref) {
      const inputElement = nameRegister.ref.current as HTMLInputElement | null
      inputElement?.focus()
    }
  }, [nameRegister.ref])

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">이름 *</Label>
          <Input
            id="name"
            placeholder="홍길동"
            {...nameRegister}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>생년월일 *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !birthDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {birthDate ? format(birthDate, 'yyyy년 MM월 dd일') : '날짜 선택'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={birthDate}
                onSelect={(date) => setValue('birthDate', date as Date, { shouldValidate: true })}
                disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                initialFocus
                captionLayout="dropdown"
                fromYear={currentYear - 30}
                toYear={currentYear}
              />
            </PopoverContent>
          </Popover>
          {errors.birthDate && (
            <p className="text-sm text-destructive">{errors.birthDate.message}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="grade">학년 *</Label>
          <Select onValueChange={(value) => setValue('grade', value)} value={selectedGrade}>
            <SelectTrigger id="grade">
              <SelectValue placeholder="학년 선택" />
            </SelectTrigger>
            <SelectContent>
              {GRADES.map((grade) => (
                <SelectItem key={grade.value} value={grade.value}>
                  {grade.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.grade && (
            <p className="text-sm text-destructive">{errors.grade.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="school">학교 *</Label>
          <Popover open={isSchoolPopoverOpen} onOpenChange={setSchoolPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={isSchoolPopoverOpen}
                className="w-full justify-between"
              >
                {selectedSchool || '학교 선택 또는 입력...'}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
              <Command>
                <CommandInput
                  placeholder="학교 검색 또는 입력..."
                  value={schoolInput}
                  onValueChange={setSchoolInput}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && schoolInput) {
                      e.preventDefault()
                      setValue('school', schoolInput, { shouldValidate: true })
                      setSchoolPopoverOpen(false)
                    }
                  }}
                />
                <CommandList>
                  <CommandEmpty>
                    {schoolInput && (
                      <div
                        className="p-2 text-center text-sm cursor-pointer hover:bg-accent rounded-md transition-colors"
                        onClick={() => {
                          setValue('school', schoolInput, { shouldValidate: true })
                          setSchoolPopoverOpen(false)
                        }}
                      >
                        &quot;{schoolInput}&quot; 사용하기
                      </div>
                    )}
                    {!schoolInput && (
                      <div className="p-2 text-center text-sm text-muted-foreground">
                        학교명을 입력하거나 목록에서 선택하세요
                      </div>
                    )}
                  </CommandEmpty>
                  <CommandGroup>
                    {schools
                      .filter((school) =>
                        school.toLowerCase().includes(schoolInput.toLowerCase())
                      )
                      .map((school) => (
                        <CommandItem
                          key={school}
                          value={school}
                          onSelect={(currentValue) => {
                            setValue('school', currentValue, { shouldValidate: true })
                            setSchoolInput(currentValue)
                            setSchoolPopoverOpen(false)
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              selectedSchool === school ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                          {school}
                        </CommandItem>
                      ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          {errors.school && (
            <p className="text-sm text-destructive">{errors.school.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="gender">성별</Label>
        <Select onValueChange={(value: 'male' | 'female' | 'other') => setValue('gender', value)}>
          <SelectTrigger id="gender">
            <SelectValue placeholder="성별 선택 (선택사항)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="male">남성</SelectItem>
            <SelectItem value="female">여성</SelectItem>
            <SelectItem value="other">기타</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
