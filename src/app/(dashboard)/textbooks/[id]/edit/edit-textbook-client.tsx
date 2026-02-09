'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Trash2, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { showSuccessToast, showErrorToast, showValidationToast } from '@/lib/toast-helpers'
import {
  updateTextbook,
  createTextbookUnit,
  updateTextbookUnit,
  deleteTextbookUnit,
} from '@/app/actions/textbooks'

type TextbookUnit = {
  id?: string
  tempId: string
  unitOrder: number
  unitCode: string
  unitTitle: string
  totalPages: string
  isDeleted?: boolean
}

interface EditTextbookClientProps {
  textbookId: string
  initialData: {
    title: string
    publisher: string
    isbn: string
    price: string
    isActive: boolean
    units: TextbookUnit[]
  }
}

export function EditTextbookClient({ textbookId, initialData }: EditTextbookClientProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  // Textbook fields
  const [title, setTitle] = useState(initialData.title)
  const [publisher, setPublisher] = useState(initialData.publisher)
  const [isbn, setIsbn] = useState(initialData.isbn)
  const [price, setPrice] = useState(initialData.price)
  const [isActive, setIsActive] = useState(initialData.isActive)

  // Units
  const [units, setUnits] = useState<TextbookUnit[]>(initialData.units)

  const addUnit = () => {
    const newOrder = units.filter((u) => !u.isDeleted).length + 1
    setUnits([
      ...units,
      {
        tempId: `temp-${Date.now()}`,
        unitOrder: newOrder,
        unitCode: `U${newOrder}`,
        unitTitle: '',
        totalPages: '',
      },
    ])
  }

  const removeUnit = (tempId: string) => {
    setUnits(
      units.map((u) =>
        u.tempId === tempId ? { ...u, isDeleted: true } : u
      )
    )
  }

  const updateUnit = (
    tempId: string,
    field: keyof TextbookUnit,
    value: string | number
  ) => {
    setUnits(
      units.map((u) => (u.tempId === tempId ? { ...u, [field]: value } : u))
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!textbookId) {
      showValidationToast('교재 ID가 없습니다.')
      return
    }

    setSaving(true)

    try {
      // Update textbook basic info
      const textbookResult = await updateTextbook({
        id: textbookId,
        title: title.trim(),
        publisher: publisher.trim() || undefined,
        isbn: isbn.trim() || undefined,
        price: price ? parseInt(price) : undefined,
        isActive,
      })

      if (!textbookResult.success) {
        throw new Error(textbookResult.error || '교재 수정 실패')
      }

      // Handle units
      for (const unit of units) {
        if (unit.isDeleted && unit.id) {
          // Delete existing unit
          const deleteResult = await deleteTextbookUnit(unit.id)
          if (!deleteResult.success) {
            console.error('단원 삭제 실패:', deleteResult.error)
          }
        } else if (!unit.isDeleted) {
          if (unit.id) {
            // Update existing unit
            const updateResult = await updateTextbookUnit({
              id: unit.id,
              unitOrder: unit.unitOrder,
              unitCode: unit.unitCode.trim() || undefined,
              unitTitle: unit.unitTitle.trim(),
              totalPages: unit.totalPages ? parseInt(unit.totalPages) : undefined,
            })

            if (!updateResult.success) {
              console.error('단원 수정 실패:', updateResult.error)
            }
          } else {
            // Create new unit
            const createResult = await createTextbookUnit({
              textbookId,
              unitOrder: unit.unitOrder,
              unitCode: unit.unitCode.trim() || undefined,
              unitTitle: unit.unitTitle.trim(),
              totalPages: unit.totalPages ? parseInt(unit.totalPages) : undefined,
            })

            if (!createResult.success) {
              console.error('단원 등록 실패:', createResult.error)
            }
          }
        }
      }

      showSuccessToast('교재 수정 완료', `${title} 교재가 수정되었습니다.`)
      router.push(`/textbooks/${textbookId}`)
    } catch (error) {
      showErrorToast('교재 수정 실패', error, 'EditTextbookClient.handleSubmit')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/textbooks/${textbookId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">교재 수정</h1>
          <p className="mt-2 text-muted-foreground">
            교재 정보와 단원을 수정하세요
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
            <CardDescription>교재의 기본 정보를 수정하세요</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">
                교재명 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 수학의 정석 기본편"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="publisher">출판사</Label>
                <Input
                  id="publisher"
                  value={publisher}
                  onChange={(e) => setPublisher(e.target.value)}
                  placeholder="예: 성지출판"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="isbn">ISBN</Label>
                <Input
                  id="isbn"
                  value={isbn}
                  onChange={(e) => setIsbn(e.target.value)}
                  placeholder="예: 978-89-12345-67-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">가격 (원)</Label>
              <Input
                id="price"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="예: 25000"
                min="0"
                step="1000"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isActive"
                checked={isActive}
                onCheckedChange={(checked) => setIsActive(checked as boolean)}
              />
              <Label htmlFor="isActive" className="font-normal">
                활성 상태
              </Label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>단원 정보</CardTitle>
                <CardDescription>
                  단원을 추가, 수정, 삭제할 수 있습니다
                </CardDescription>
              </div>
              <Button type="button" variant="outline" onClick={addUnit}>
                <Plus className="mr-2 h-4 w-4" />
                단원 추가
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {units.filter((u) => !u.isDeleted).length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                단원을 추가하려면 &quot;단원 추가&quot; 버튼을 클릭하세요
              </p>
            ) : (
              <div className="space-y-4">
                {units
                  .filter((u) => !u.isDeleted)
                  .map((unit) => (
                    <Card key={unit.tempId}>
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-4">
                          <div className="flex-1 space-y-4">
                            <div className="grid grid-cols-3 gap-4">
                              <div className="space-y-2">
                                <Label>순서</Label>
                                <Input
                                  type="number"
                                  value={unit.unitOrder}
                                  onChange={(e) =>
                                    updateUnit(
                                      unit.tempId,
                                      'unitOrder',
                                      parseInt(e.target.value)
                                    )
                                  }
                                  min="1"
                                  required
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>단원 코드</Label>
                                <Input
                                  value={unit.unitCode}
                                  onChange={(e) =>
                                    updateUnit(
                                      unit.tempId,
                                      'unitCode',
                                      e.target.value
                                    )
                                  }
                                  placeholder="예: U1"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>페이지 수</Label>
                                <Input
                                  type="number"
                                  value={unit.totalPages}
                                  onChange={(e) =>
                                    updateUnit(
                                      unit.tempId,
                                      'totalPages',
                                      e.target.value
                                    )
                                  }
                                  placeholder="예: 50"
                                  min="1"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label>
                                단원명 <span className="text-destructive">*</span>
                              </Label>
                              <Input
                                value={unit.unitTitle}
                                onChange={(e) =>
                                  updateUnit(
                                    unit.tempId,
                                    'unitTitle',
                                    e.target.value
                                  )
                                }
                                placeholder="예: 분수의 덧셈과 뺄셈"
                                required
                              />
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeUnit(unit.tempId)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={saving}
          >
            취소
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                저장 중...
              </>
            ) : (
              '저장'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
