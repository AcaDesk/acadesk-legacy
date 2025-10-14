import SignupForm from "@/components/auth/SignupForm"
import { Card, CardContent } from "@/components/ui/card"

export default function SignupPage() {
  return (
    <Card>
      <CardContent className="pt-6">
        <SignupForm />
      </CardContent>
    </Card>
  )
}
