import type { Metadata } from "next"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { Providers } from "./providers"

export const metadata: Metadata = {
  title: {
    default: "Acadesk - 학원 관리 시스템",
    template: "%s | Acadesk"
  },
  description: "효율적인 학원 운영을 위한 올인원 관리 플랫폼. 학생 관리, 출석 체크, 성적 관리, 리포트 자동화를 한 곳에서.",
  keywords: ["학원 관리", "학원 시스템", "학생 관리", "출석 관리", "성적 관리", "리포트 자동화", "Acadesk"],
  authors: [{ name: "Acadesk" }],
  creator: "Acadesk",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  openGraph: {
    title: "Acadesk - 학원 관리 시스템",
    description: "효율적인 학원 운영을 위한 올인원 관리 플랫폼",
    type: "website",
    locale: "ko_KR",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="antialiased">
        <Providers>
          {children}
        </Providers>
        <Toaster />
      </body>
    </html>
  )
}
