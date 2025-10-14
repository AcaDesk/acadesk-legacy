import { LoginForm } from "@/components/auth/LoginForm"
import { Card, CardContent } from "@/components/ui/card"

export default function LoginPage() {
  return (
    <Card>
      <CardContent className="pt-6">
        <LoginForm />
      </CardContent>
    </Card>
  )
}
