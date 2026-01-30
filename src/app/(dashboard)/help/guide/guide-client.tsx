'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@ui/accordion'
import { Search, LucideIcon } from 'lucide-react'
import { Input } from '@ui/input'

interface GuideItem {
  question: string
  answer: string
}

interface GuideCategory {
  icon: string
  title: string
  color: string
  items: GuideItem[]
}

interface GuideClientProps {
  categories: GuideCategory[]
  iconMap: Record<string, LucideIcon>
}

export function GuideClient({ categories, iconMap }: GuideClientProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredCategories = useMemo(() => {
    return categories
      .map((category) => ({
        ...category,
        items: category.items.filter(
          (item) =>
            searchQuery === '' ||
            item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.answer.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      }))
      .filter((category) => category.items.length > 0)
  }, [categories, searchQuery])

  return (
    <div className="space-y-6">
      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="가이드 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Guide Categories */}
      {filteredCategories.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            검색 결과가 없습니다.
          </CardContent>
        </Card>
      ) : (
        filteredCategories.map((category, index) => {
          const Icon = iconMap[category.icon]
          return (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  {Icon && <Icon className={`h-6 w-6 ${category.color}`} />}
                  {category.title}
                </CardTitle>
                <CardDescription>{category.title} 기능 사용 방법</CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {category.items.map((item, itemIndex) => (
                    <AccordionItem key={itemIndex} value={`item-${index}-${itemIndex}`}>
                      <AccordionTrigger className="text-left">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="text-sm text-muted-foreground whitespace-pre-line">
                          {item.answer}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          )
        })
      )}

      {/* Additional Help */}
      <Card>
        <CardHeader>
          <CardTitle>추가 도움이 필요하신가요?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            가이드에서 찾지 못한 내용이나 추가 문의사항이 있으시면 언제든지 문의해주세요.
          </p>
          <div className="flex gap-3">
            <a href="/help/faq" className="text-sm text-primary hover:underline">
              자주 묻는 질문 보기
            </a>
            <span className="text-muted-foreground">|</span>
            <a href="/help/inquiries" className="text-sm text-primary hover:underline">
              1:1 문의하기
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
