import { Suspense } from "react"

import { SignOutContent } from "@/components/sign-out-content"

export default function SignOutPage({
  searchParams,
}: {
  searchParams: {
    reason?: string
  }
}) {
  return (
    <Suspense fallback={<div>Signing out...</div>}>
      <SignOutContent reason={searchParams.reason} />
    </Suspense>
  )
}
