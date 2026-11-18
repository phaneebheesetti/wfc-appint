import { Suspense } from "react"

import { Signup } from "@/components/signup"

export default function SignupPage() {
  return (
    <Suspense>
      <Signup />
    </Suspense>
  )
}
