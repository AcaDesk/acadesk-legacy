'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@ui/accordion'
import { Search, Tag } from 'lucide-react'
import { Input } from '@ui/input'
import { Badge } from '@ui/badge'
import { Button } from '@ui/button'

interface FAQ {
  category: string
  question: string
  answer: string
}

interface FAQCategory {
  id: string
  label: string
  color: string
}

interface FAQClientProps {
  faqs: FAQ[]
  categories: FAQCategory[]
}

export function FAQClient({ faqs, categories }: FAQClientProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const filteredFaqs = useMemo(() => {
    return faqs.filter((faq) => {
      const matchesCategory =
        selectedCategory === 'all' || faq.category === selectedCategory
      const matchesSearch =
        searchQuery === '' ||
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [faqs, selectedCategory, searchQuery])

  return (
    <div className="space-y-6">
      {/* Search */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="질문 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <Tag className="h-4 w-4 text-muted-foreground" />
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('all')}
            >
              전체
            </Button>
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category.id)}
              >
                {category.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* FAQ List */}
      <Card>
        <CardHeader>
          <CardTitle>
            {selectedCategory === 'all'
              ? '전체 질문'
              : categories.find((c) => c.id === selectedCategory)?.label + ' 질문'}
          </CardTitle>
          <CardDescription>총 {filteredFaqs.length}개의 질문</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredFaqs.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              검색 결과가 없습니다.
            </div>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {filteredFaqs.map((faq, index) => {
                const categoryInfo = categories.find((c) => c.id === faq.category)
                return (
                  <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger className="text-left">
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className={categoryInfo?.color}>
                          {categoryInfo?.label}
                        </Badge>
                        <span>{faq.question}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pl-20 text-sm text-muted-foreground">
                        {faq.answer}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* Additional Help */}
      <Card>
        <CardHeader>
          <CardTitle>원하는 답변을 찾지 못하셨나요?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            FAQ에서 답변을 찾지 못하셨다면 아래 방법으로 문의해주세요.
          </p>
          <div className="flex gap-3">
            <a href="/help/guide" className="text-sm text-primary hover:underline">
              사용 가이드 보기
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
