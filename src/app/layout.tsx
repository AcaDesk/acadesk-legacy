import type { Metadata, Viewport } from "next"
import { Inter_Tight, Noto_Sans_KR } from "next/font/google"
import "./globals.css"
import { Toaster } from "@ui/toaster"
import { Providers } from "./providers"

// 폰트는 빌드 시 Google Fonts에서 다운로드해 셀프 호스팅된다 (런타임 외부 요청 없음).
// Inter Tight (영문) - Variable Font, woff2
const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

// Noto Sans KR (한글) - unicode-range로 슬라이스된 woff2 조각을 사용해
// 페이지에 실제 등장하는 글자 범위만 다운로드된다 (기존 9.9MB 단일 TTF 대체)
const notoSansKR = Noto_Sans_KR({
  subsets: ["latin"],
  variable: "--font-noto-sans-kr",
  display: "swap",
})

export const viewport: Viewport = {
  themeColor: '#0f172a',
  maximumScale: 1,
  userScalable: false,
}

export const metadata: Metadata = {
  title: {
    default: "Acadesk - 학원 관리 시스템",
    template: "%s | Acadesk"
  },
  description: "효율적인 학원 운영을 위한 올인원 관리 플랫폼. 학생 관리, 출석 체크, 성적 관리, 리포트 자동화를 한 곳에서.",
  keywords: ["학원 관리", "학원 시스템", "학생 관리", "출석 관리", "성적 관리", "리포트 자동화", "Acadesk"],
  authors: [{ name: "Acadesk" }],
  creator: "Acadesk",
  applicationName: "Acadesk",
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Acadesk',
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  openGraph: {
    title: "Acadesk - 학원 관리 시스템",
    description: "효율적인 학원 운영을 위한 올인원 관리 플랫폼",
    type: "website",
    locale: "ko_KR",
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={`${interTight.variable} ${notoSansKR.variable} font-sans antialiased`}>
        <Providers>
          {children}
        </Providers>
        <Toaster />
      </body>
    </html>
  )
}
