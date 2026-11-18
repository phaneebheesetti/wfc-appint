import { Suspense } from "react"

import EmailUpdateReport from "@/components/emails/email-change-report"

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-full items-center justify-center">
          <p className="text-lg">Loading...</p>
        </div>
      }
    >
      <EmailUpdateReport />
    </Suspense>
  )
}
