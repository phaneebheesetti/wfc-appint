import { useUser } from "@clerk/nextjs"
import { CheckCircle, House } from "lucide-react"
import { useEffect, useRef } from "react"

import { Button } from "@/components/ui/button"

export function SignupFinishedSuccessStep() {
  const { user } = useUser()
  const userRef = useRef(user)
  useEffect(() => {
    userRef.current = user
  })
  const userId = user?.id

  useEffect(() => {
    if (!userId) return
    void userRef.current?.reload()
  }, [userId])

  return (
    <div className="flex flex-col items-center justify-center gap-6">
      <div className="flex flex-col items-center justify-center gap-2 text-center">
        <CheckCircle className="w-16 h-16 text-green-500" />
        <h2 className="text-2xl font-semibold">Congratulations!</h2>
        <p className="text-muted-foreground">Your sign up is complete and your account has been created.</p>
      </div>

      <a href="/dashboard">
        <Button>
          <House />
          Go to Dashboard
        </Button>
      </a>
    </div>
  )
}
