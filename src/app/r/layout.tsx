import type { Metadata } from "next"
import { ReportShareWrapper } from "@/components/layout/report-share-wrapper"

export const metadata: Metadata = {
  title: "학생 학습 리포트",
}

export default function ReportShareLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ReportShareWrapper>
      {children}
    </ReportShareWrapper>
  )
}
