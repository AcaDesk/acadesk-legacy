'use client'

import { useState } from 'react'
import Link from 'next/link'
import { HelpCircle, BookOpen, MessageCircle, Bug, FileQuestion } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@ui/dropdown-menu'
import { Button } from '@ui/button'
import { InquiryDialog } from './inquiry-dialog'
import { BugReportDialog } from './bug-report-dialog'

export function HelpMenu() {
  const [inquiryOpen, setInquiryOpen] = useState(false)
  const [bugReportOpen, setBugReportOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            aria-label="도움말"
          >
            <HelpCircle className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>도움말 및 지원</DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuItem asChild>
            <Link href="/help/guide" className="cursor-pointer">
              <BookOpen className="mr-2 h-4 w-4" />
              <span>사용 가이드</span>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link href="/help/faq" className="cursor-pointer">
              <FileQuestion className="mr-2 h-4 w-4" />
              <span>자주 묻는 질문 (FAQ)</span>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onSelect={() => setInquiryOpen(true)}
            className="cursor-pointer"
          >
            <MessageCircle className="mr-2 h-4 w-4" />
            <span>1:1 문의하기</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={() => setBugReportOpen(true)}
            className="cursor-pointer"
          >
            <Bug className="mr-2 h-4 w-4" />
            <span>버그/오류 제보</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 문의하기 다이얼로그 */}
      <InquiryDialog open={inquiryOpen} onOpenChange={setInquiryOpen} />

      {/* 버그 제보 다이얼로그 */}
      <BugReportDialog open={bugReportOpen} onOpenChange={setBugReportOpen} />
    </>
  )
}
