'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
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
import { useToast } from '@/hooks/use-toast'

type TextbookUnit = {
  tempId: string
  unitOrder: number
  unitCode: string
  unitTitle: string
  totalPages: string
}

export default function NewTextbookPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [loading, setLoading] = useState(false)

  // Textbook fields
  const [title, setTitle] = useState('')
  const [publisher, setPublisher] = useState('')
  const [isbn, setIsbn] = useState('')
  const [price, setPrice] = useState('')
  const [isActive, setIsActive] = useState(true)

  // Units
  const [units, setUnits] = useState<TextbookUnit[]>([])

  const addUnit = () => {
    const newOrder = units.length + 1
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
    const filtered = units.filter((u) => u.tempId !== tempId)
    // Reorder
    const reordered = filtered.map((u, idx) => ({
      ...u,
      unitOrder: idx + 1,
    }))
    setUnits(reordered)
  }

  const updateUnit = (
    tempId: string,
    field: keyof TextbookUnit,
    value: string | number
  ) => {
    setUnits(
      units.map((u) =>
        u.tempId === tempId ? { ...u, [field]: value } : u
      )
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Import dynamically to avoid bundling on server
      const { createTextbook, createTextbookUnit } = await import(
        '@/app/actions/textbooks'
      )

      // Create textbook
      const textbookResult = await createTextbook({
        title: title.trim(),
        publisher: publisher.trim() || undefined,
        isbn: isbn.trim() || undefined,
        price: price ? parseInt(price) : undefined,
        isActive,
      })

      if (!textbookResult.success || !textbookResult.data) {
        throw new Error(textbookResult.error || '교재 등록 실패')
      }

      const textbookId = textbookResult.data.id

      // Create units if any
      if (units.length > 0) {
        for (const unit of units) {
          const unitResult = await createTextbookUnit({
            textbookId,
            unitOrder: unit.unitOrder,
            unitCode: unit.unitCode.trim() || undefined,
            unitTitle: unit.unitTitle.trim(),
            totalPages: unit.totalPages
              ? parseInt(unit.totalPages)
              : undefined,
          })

          if (!unitResult.success) {
            console.error('단원 등록 실패:', unitResult.error)
            // Continue with other units
          }
        }
      }

      toast({
        title: '교재 등록 완료',
        description: `${title} 교재가 등록되었습니다`,
      })

      router.push(`/textbooks/${textbookId}`)
    } catch (error) {
      console.error('[NewTextbook] Error:', error)
      toast({
        title: '교재 등록 실패',
        description:
          error instanceof Error ? error.message : '오류가 발생했습니다',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href="/textbooks">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">교재 등록</h1>
          <p className="mt-2 text-muted-foreground">
            새로운 교재와 단원 정보를 등록하세요
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
            <CardDescription>교재의 기본 정보를 입력하세요</CardDescription>
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
                onCheckedChange={(checked) =>
                  setIsActive(checked as boolean)
                }
              />
              <Label htmlFor="isActive" className="font-normal">
                활성 상태로 등록
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
                  교재의 단원(챕터)을 등록하세요 (선택)
                </CardDescription>
              </div>
              <Button type="button" variant="outline" onClick={addUnit}>
                <Plus className="mr-2 h-4 w-4" />
                단원 추가
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {units.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                단원을 추가하려면 &quot;단원 추가&quot; 버튼을 클릭하세요
              </p>
            ) : (
              <div className="space-y-4">
                {units.map((unit, index) => (
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
            disabled={loading}
          >
            취소
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? '등록 중...' : '교재 등록'}
          </Button>
        </div>
      </form>
    </div>
  )
}
