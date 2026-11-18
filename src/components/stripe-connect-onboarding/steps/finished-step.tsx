import { CheckCircle, House, SkipForward } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { type Organization } from "@/server/db/schema"

interface FinishedStepProps {
  organization: Organization
}

export function FinishedStep({ organization }: FinishedStepProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-6">
      {organization?.stripeConnectedAccountId ? (
        <div className="flex flex-col items-center justify-center gap-2">
          <CheckCircle className="w-16 h-16 text-green-500" />
          <h2 className="text-2xl font-semibold">Congratulations!</h2>
          <p className="text-muted-foreground">Your Stripe account is connected.</p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-2">
          <SkipForward className="w-16 h-16 text-gray-500" />
          <h2 className="text-2xl font-semibold">Skipping!</h2>
          <p className="text-muted-foreground">You can setup your Stripe account later.</p>
        </div>
      )}

      <Link href="/dashboard">
        <Button>
          <House />
          Go to Dashboard
        </Button>
      </Link>
    </div>
  )
}
