import { Suspense } from "react"

import EmailUpdateConfirmation from "@/components/emails/email-change-confirmation"

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-full items-center justify-center">
          <p className="text-lg">Loading...</p>
        </div>
      }
    >
      <EmailUpdateConfirmation />
    </Suspense>
  )
}
