import type { Metadata, Viewport } from "next"
import localFont from "next/font/local"
import "./globals.css"
import { Toaster } from "@ui/toaster"
import { Providers } from "./providers"

// Inter Tight (영문) - Variable Font
const interTight = localFont({
  src: "../../public/fonts/Inter_Tight/InterTight-VariableFont_wght.ttf",
  variable: "--font-inter",
  display: "swap",
  weight: "100 900",
})

// Noto Sans KR (한글) - Variable Font
const notoSansKR = localFont({
  src: "../../public/fonts/Noto_Sans_KR/NotoSansKR-VariableFont_wght.ttf",
  variable: "--font-noto-sans-kr",
  display: "swap",
  weight: "100 900",
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
