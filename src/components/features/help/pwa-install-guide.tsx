'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Smartphone, Share, MoreVertical, Plus } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ui/tabs'

/**
 * 스크린샷 placeholder 또는 실제 이미지
 *
 * 이미지 파일이 public/images/guide/ 에 존재하면 표시하고,
 * 없으면 설명이 담긴 점선 박스를 표시합니다.
 *
 * 이미지 추가 시: public/images/guide/ 폴더에 파일을 넣고
 * src 경로만 업데이트하면 됩니다.
 */
function Screenshot({ src, alt }: { src?: string; alt: string }) {
  const [error, setError] = useState(false)

  if (!src || error) {
    return (
      <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/30 px-4 py-8">
        <p className="text-center text-sm text-muted-foreground">{alt}</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <Image
        src={src}
        alt={alt}
        width={320}
        height={568}
        className="mx-auto"
        onError={() => setError(true)}
      />
    </div>
  )
}

function Step({
  number,
  children,
  screenshot,
}: {
  number: number
  children: React.ReactNode
  screenshot?: { src?: string; alt: string }
}) {
  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
          {number}
        </div>
        <div className="pt-0.5 text-sm leading-relaxed">{children}</div>
      </div>
      {screenshot && <div className="ml-10"><Screenshot {...screenshot} /></div>}
    </div>
  )
}

export function PwaInstallGuide({ embedded = false }: { embedded?: boolean }) {
  const content = (
    <>
        <Tabs defaultValue="iphone">
          <TabsList className="w-full">
            <TabsTrigger value="iphone" className="flex-1 gap-1.5">
              iPhone / iPad
            </TabsTrigger>
            <TabsTrigger value="android" className="flex-1 gap-1.5">
              Android
            </TabsTrigger>
          </TabsList>

          {/* ── iPhone / iPad ── */}
          <TabsContent value="iphone" className="space-y-5 pt-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
              반드시 <strong>Safari</strong>에서 열어주세요. Chrome이나 다른 브라우저에서는 설치할 수 없습니다.
            </div>

            <div className="space-y-5">
              <Step
                number={1}
                screenshot={{
                  src: '/images/guide/pwa-ios-step1.png',
                  alt: '[스크린샷] Safari에서 Acadesk 홈 페이지를 열어놓은 화면',
                }}
              >
                <span><strong>Safari</strong>로 Acadesk 사이트에 접속해 주세요.</span>
              </Step>

              <Step
                number={2}
                screenshot={{
                  src: '/images/guide/pwa-ios-step2.png',
                  alt: '[스크린샷] Safari 하단 공유 버튼(□↑)을 가리키는 화면',
                }}
              >
                <span>
                  하단의 <strong>공유 버튼</strong>
                  <Share className="mx-1 inline h-4 w-4 align-text-bottom" />
                  을 탭하세요.
                </span>
              </Step>

              <Step
                number={3}
                screenshot={{
                  src: '/images/guide/pwa-ios-step3.png',
                  alt: '[스크린샷] 공유 메뉴에서 "홈 화면에 추가" 항목을 가리키는 화면',
                }}
              >
                <span>
                  아래로 스크롤하여 <strong>&quot;홈 화면에 추가&quot;</strong>
                  <Plus className="mx-1 inline h-4 w-4 align-text-bottom" />
                  를 선택하세요.
                </span>
              </Step>

              <Step
                number={4}
                screenshot={{
                  src: '/images/guide/pwa-ios-step4.png',
                  alt: '[스크린샷] "추가" 버튼을 누르는 확인 화면',
                }}
              >
                <span>
                  우측 상단의 <strong>&quot;추가&quot;</strong>를 탭하면 완료!
                </span>
              </Step>
            </div>
          </TabsContent>

          {/* ── Android ── */}
          <TabsContent value="android" className="space-y-5 pt-4">
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200">
              <strong>Chrome</strong> 브라우저를 사용해 주세요.
            </div>

            <div className="space-y-5">
              <Step
                number={1}
                screenshot={{
                  src: '/images/guide/pwa-android-step1.png',
                  alt: '[스크린샷] Chrome에서 Acadesk 홈 페이지를 열어놓은 화면',
                }}
              >
                <span><strong>Chrome</strong>으로 Acadesk 사이트에 접속해 주세요.</span>
              </Step>

              <Step
                number={2}
                screenshot={{
                  src: '/images/guide/pwa-android-step2.png',
                  alt: '[스크린샷] 상단에 "앱 설치" 배너가 표시된 화면 (나타나는 경우)',
                }}
              >
                <span>
                  상단에 설치 배너가 나타나면 <strong>&quot;설치&quot;</strong>를 탭하세요.
                </span>
              </Step>

              <Step
                number={3}
                screenshot={{
                  src: '/images/guide/pwa-android-step3.png',
                  alt: '[스크린샷] Chrome 우측 상단 메뉴(⋮)에서 "앱 설치" 항목을 가리키는 화면',
                }}
              >
                <span>
                  배너가 없다면, 우측 상단 메뉴
                  <MoreVertical className="mx-1 inline h-4 w-4 align-text-bottom" />
                  를 탭한 뒤 <strong>&quot;앱 설치&quot;</strong> 또는 <strong>&quot;홈 화면에 추가&quot;</strong>를 선택하세요.
                </span>
              </Step>

              <Step
                number={4}
                screenshot={{
                  src: '/images/guide/pwa-android-step4.png',
                  alt: '[스크린샷] "설치" 확인 다이얼로그 화면',
                }}
              >
                <span>
                  <strong>&quot;설치&quot;</strong>를 탭하면 완료!
                </span>
              </Step>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-6 flex items-start gap-2 rounded-lg bg-muted px-3 py-2.5 text-xs text-muted-foreground">
          설치 후 홈 화면의 <strong className="mx-1">Acadesk</strong> 아이콘을 탭하면 앱처럼 실행됩니다.
          출석 체크 중 학생에게 태블릿을 넘겨 TODO를 확인하게 할 수도 있습니다.
        </div>
    </>
  )

  if (embedded) return content

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <Smartphone className="h-6 w-6 text-primary" />
          앱 설치 (PWA)
        </CardTitle>
        <CardDescription>
          홈 화면에 추가하면 앱처럼 빠르게 접속할 수 있습니다. 출석 태블릿에 설치하면 편리합니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  )
}
