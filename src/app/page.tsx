import { redirect } from 'next/navigation'
import { createClient } from "@/lib/supabase/server"
import { LandingHeader } from "@/components/landing/LandingHeader"
import { HeroSection } from "@/components/landing/HeroSection"
import { PreRegistrationSection } from "@/components/landing/PreRegistrationSection"
import { FeaturesSection } from "@/components/landing/FeaturesSection"

// Force dynamic rendering (uses cookies for user authentication check)
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 로그인한 사용자는 대시보드로 리다이렉트
  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen">
      <LandingHeader user={user} />
      <main>
        <HeroSection />
        <PreRegistrationSection />
        <FeaturesSection />
      </main>
    </div>
  )
}
