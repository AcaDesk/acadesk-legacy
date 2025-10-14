import { createClient } from "@/lib/supabase/server"
import { LandingHeader } from "@/components/landing/LandingHeader"
import { HeroSection } from "@/components/landing/HeroSection"
import { PreRegistrationSection } from "@/components/landing/PreRegistrationSection"
import { FeaturesSection } from "@/components/landing/FeaturesSection"

export default async function HomePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

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
