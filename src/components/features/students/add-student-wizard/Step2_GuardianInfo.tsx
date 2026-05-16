import { useReducer, useEffect, useRef, useCallback, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { Search, UserPlus, Check, Loader2, X, Users } from 'lucide-react'
import { useCurrentUser } from '@/hooks/use-current-user'
import { GUARDIAN_MODES } from '@/lib/constants'
import { Input } from '@ui/input'
import { PhoneInput } from '@ui/phone-input'
import { Label } from '@ui/label'
import { Button } from '@ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select'
import { Badge } from '@ui/badge'
import { Alert, AlertDescription } from '@ui/alert'
import { cn, formatPhoneNumber } from '@/lib/utils'
import { GUARDIAN_RELATIONSHIPS } from '@/lib/constants'
import { getGuardianDisplayLabel, getGuardianSecondaryLabel } from '@/lib/guardian-display'
import type { StudentWizardFormValues, Guardian } from './types'
import {
  searchGuardians as searchGuardiansAction,
  findGuardiansByPhone,
} from '@/app/actions/guardians'

type PhoneMatch = {
  id: string
  name: string
  phone: string | null
  relationship: string | null
  students: string[]
}

// ============================================================================
// Guardian State Management with useReducer
// ============================================================================

type GuardianState = {
  query: string
  results: Guardian[]
  isSearching: boolean
  selectedId: string | null
  showNewForm: boolean
}

type GuardianAction =
  | { type: 'SET_QUERY'; payload: string }
  | { type: 'SET_RESULTS'; payload: Guardian[] }
  | { type: 'SET_SEARCHING'; payload: boolean }
  | { type: 'SELECT_GUARDIAN'; payload: string }
  | { type: 'SHOW_NEW_FORM' }
  | { type: 'HIDE_NEW_FORM' }
  | { type: 'RESET' }

const initialState: GuardianState = {
  query: '',
  results: [],
  isSearching: false,
  selectedId: null,
  showNewForm: true,
}

function guardianReducer(state: GuardianState, action: GuardianAction): GuardianState {
  switch (action.type) {
    case 'SET_QUERY':
      return {
        ...state,
        query: action.payload,
      }
    case 'SET_RESULTS':
      return { ...state, results: action.payload, isSearching: false }
    case 'SET_SEARCHING':
      return { ...state, isSearching: action.payload }
    case 'SELECT_GUARDIAN':
      return {
        ...state,
        selectedId: action.payload,
        showNewForm: false,
      }
    case 'SHOW_NEW_FORM':
      return {
        ...state,
        showNewForm: true,
        selectedId: null,
      }
    case 'HIDE_NEW_FORM':
      return { ...state, showNewForm: false }
    case 'RESET':
      return initialState
    default:
      return state
  }
}

// ============================================================================
// Component
// ============================================================================

export function Step2_GuardianInfo() {
  const { register, setValue, watch, formState: { errors } } = useFormContext<StudentWizardFormValues>()
  const [state, dispatch] = useReducer(guardianReducer, initialState)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [phoneMatches, setPhoneMatches] = useState<PhoneMatch[]>([])
  const [phoneMatchDismissed, setPhoneMatchDismissed] = useState(false)

  const { user: currentUser } = useCurrentUser()
  const guardianPhone = watch('guardian.phone')

  // 신규 폼에서 전화번호 입력 시 같은 번호의 기존 보호자를 사전 안내
  useEffect(() => {
    if (!state.showNewForm) {
      setPhoneMatches([])
      return
    }
    const normalized = (guardianPhone || '').replace(/\D/g, '')
    if (normalized.length < 9) {
      setPhoneMatches([])
      setPhoneMatchDismissed(false)
      return
    }

    let cancelled = false
    const timer = setTimeout(async () => {
      const res = await findGuardiansByPhone(guardianPhone || '')
      if (cancelled) return
      if (res.success && res.data && res.data.length > 0) {
        setPhoneMatches(res.data as PhoneMatch[])
      } else {
        setPhoneMatches([])
      }
    }, 400)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [guardianPhone, state.showNewForm])

  function handleUseMatchedGuardian(match: PhoneMatch) {
    dispatch({ type: 'SELECT_GUARDIAN', payload: match.id })
    setValue('guardianMode', GUARDIAN_MODES.EXISTING)
    setValue('existingGuardianId', match.id)
    setPhoneMatches([])
  }

  // 포커스 관리: 컴포넌트가 마운트될 때 검색 필드에 포커스
  useEffect(() => {
    searchInputRef.current?.focus()
  }, [])

  const searchGuardians = useCallback(async (query: string) => {
    if (!currentUser || !currentUser.tenantId) return

    dispatch({ type: 'SET_SEARCHING', payload: true })
    try {
      const result = await searchGuardiansAction(query, 10)

      if (!result.success || !result.data) {
        throw new Error(result.error || '보호자 검색 실패')
      }

      // guardians 단일 출처 — 이름/연락처는 guardians 테이블에서 직접
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const guardians = result.data.map((g: any) => {
        const linkedStudents: string[] = (g.student_guardians || [])
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((sg: any) => sg.students?.name)
          .filter(Boolean)

        return {
          id: g.id,
          name: g.name || '이름 없음',
          phone: g.phone || '',
          email: g.email || null,
          relationship: g.relationship || '',
          linkedStudents,
        }
      })

      dispatch({ type: 'SET_RESULTS', payload: guardians })
    } catch (error) {
      console.error('Error searching guardians:', error)
      dispatch({ type: 'SET_RESULTS', payload: [] })
    }
  }, [currentUser])

  // 검색 디바운스
  useEffect(() => {
    if (!state.query || state.query.length < 2) {
      dispatch({ type: 'SET_RESULTS', payload: [] })
      return
    }

    const timer = setTimeout(() => {
      searchGuardians(state.query)
    }, 300)

    return () => clearTimeout(timer)
  }, [state.query, searchGuardians])

  function handleSelectGuardian(guardian: Guardian) {
    dispatch({ type: 'SELECT_GUARDIAN', payload: guardian.id })
    setValue('guardianMode', GUARDIAN_MODES.EXISTING)
    setValue('existingGuardianId', guardian.id)
  }

  function handleShowNewForm() {
    dispatch({ type: 'SHOW_NEW_FORM' })
    setValue('guardianMode', GUARDIAN_MODES.NEW)
    setValue('existingGuardianId', '')
  }


  const showSearchResults = state.query.length >= 2
  const selectedGuardian = state.results.find((g) => g.id === state.selectedId)

  return (
    <div className="space-y-4">
      {/* 검색창 - 항상 최상단에 표시 */}
      <div className="space-y-2">
        <Label>학부모 검색</Label>
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            placeholder="학부모 이름 또는 연락처로 검색..."
            value={state.query}
            onChange={(e) => dispatch({ type: 'SET_QUERY', payload: e.target.value })}
            className="pl-9"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          기존 학부모를 검색하거나, 아래 폼에서 새로 등록할 수 있습니다.
        </p>
      </div>

      {/* 검색 결과 - 검색어가 2자 이상일 때만 표시 */}
      {showSearchResults && (
        <div className="border rounded-lg p-4 space-y-2 bg-muted/30">
          {state.isSearching ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : state.results.length > 0 ? (
            <>
              <p className="text-sm font-medium mb-2">검색 결과 ({state.results.length})</p>
              <div className="space-y-2">
                {state.results.map((guardian) => (
                  <button
                    key={guardian.id}
                    type="button"
                    onClick={() => handleSelectGuardian(guardian)}
                    className={cn(
                      'w-full text-left p-3 rounded-md border transition-colors',
                      state.selectedId === guardian.id
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                        : 'hover:bg-background'
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">
                            {getGuardianDisplayLabel(guardian.name, guardian.linkedStudents || [])}
                          </p>
                          {guardian.relationship && (
                            <Badge variant="outline" className="text-xs">
                              {guardian.relationship}
                            </Badge>
                          )}
                        </div>
                        {getGuardianSecondaryLabel(guardian.name, guardian.linkedStudents || []) && (
                          <p className="text-xs text-muted-foreground">
                            본명: {getGuardianSecondaryLabel(guardian.name, guardian.linkedStudents || [])}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground">{formatPhoneNumber(guardian.phone)}</p>
                        {guardian.email && (
                          <p className="text-xs text-muted-foreground">{guardian.email}</p>
                        )}
                        {guardian.linkedStudents && guardian.linkedStudents.length > 0 && (
                          <p className="text-xs text-primary mt-1">
                            형제로 자동 연결됩니다
                          </p>
                        )}
                      </div>
                      {state.selectedId === guardian.id && (
                        <Check className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-2">
                &apos;{state.query}&apos;에 대한 검색 결과가 없습니다.
              </p>
              <p className="text-xs text-muted-foreground">
                아래 폼에서 신규 학부모를 등록해주세요.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 선택된 기존 학부모 표시 */}
      {selectedGuardian && !state.showNewForm && (
        <Alert>
          <Check className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              <strong>
                {getGuardianDisplayLabel(selectedGuardian.name, selectedGuardian.linkedStudents || [])}
              </strong>{' '}
              학부모를 선택했습니다.
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleShowNewForm}
            >
              다른 학부모 등록
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* 신규 학부모 등록 폼 - 기본적으로 펼쳐져 있음 */}
      {state.showNewForm && (
        <div className="border rounded-lg p-4 space-y-4 bg-background">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              신규 학부모 등록
            </p>
            {showSearchResults && state.results.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => dispatch({ type: 'HIDE_NEW_FORM' })}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* 같은 전화번호 보호자 자동 매칭 안내 */}
          {phoneMatches.length > 0 && !phoneMatchDismissed && (
            <div className="rounded-md border border-primary/40 bg-primary/5 p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                  <Users className="h-4 w-4" />
                  이 번호로 등록된 학부모가 있습니다
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-muted-foreground"
                  onClick={() => setPhoneMatchDismissed(true)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                기존 학부모에 연결하면 자녀가 자동으로 형제로 묶입니다.
              </p>
              <div className="space-y-1.5">
                {phoneMatches.map((match) => (
                  <div
                    key={match.id}
                    className="flex items-center justify-between gap-2 rounded bg-background border p-2"
                  >
                    <div className="text-sm">
                      <span className="font-medium">
                        {getGuardianDisplayLabel(match.name, match.students)}
                      </span>
                      {match.relationship && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          {match.relationship}
                        </Badge>
                      )}
                      {getGuardianSecondaryLabel(match.name, match.students) && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          본명: {getGuardianSecondaryLabel(match.name, match.students)}
                        </div>
                      )}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleUseMatchedGuardian(match)}
                    >
                      이 학부모 사용
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="guardian.name">이름</Label>
              <Input
                id="guardian.name"
                placeholder="김학부"
                {...register('guardian.name')}
              />
              {errors.guardian?.name && (
                <p className="text-sm text-destructive">{errors.guardian.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="guardian.relationship">관계</Label>
              <Select onValueChange={(value) => setValue('guardian.relationship', value)}>
                <SelectTrigger id="guardian.relationship">
                  <SelectValue placeholder="관계 선택" />
                </SelectTrigger>
                <SelectContent>
                  {GUARDIAN_RELATIONSHIPS.map((rel) => (
                    <SelectItem key={rel.value} value={rel.value}>
                      {rel.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.guardian?.relationship && (
                <p className="text-sm text-destructive">{errors.guardian.relationship.message}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="guardian.phone">연락처</Label>
              <PhoneInput
                id="guardian.phone"
                value={guardianPhone || ''}
                onChange={(value) => setValue('guardian.phone', value, { shouldValidate: true })}
              />
              {errors.guardian?.phone && (
                <p className="text-sm text-destructive">{errors.guardian.phone.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="guardian.email">이메일</Label>
              <Input
                id="guardian.email"
                type="email"
                placeholder="example@email.com"
                {...register('guardian.email')}
              />
              {errors.guardian?.email && (
                <p className="text-sm text-destructive">{errors.guardian.email.message}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="guardian.occupation">직업</Label>
              <Input
                id="guardian.occupation"
                placeholder="직업"
                {...register('guardian.occupation')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="guardian.address">주소</Label>
              <Input
                id="guardian.address"
                placeholder="주소"
                {...register('guardian.address')}
              />
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
