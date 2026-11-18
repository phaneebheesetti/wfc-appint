import { ArrowLeft, Ban } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"

export function NotAuthorizedStep() {
  return (
    <div className="flex flex-col items-center justify-center gap-6">
      <div className="flex flex-col items-center justify-center gap-2 text-center">
        <Ban className="w-16 h-16 text-destructive" />
        <h2 className="text-2xl font-semibold">Not authorized!</h2>
        <p className="text-muted-foreground">
          Please contact the organization admin to onboard your organization to Stripe.
          <div className="flex gap-2 mt-2 m-auto justify-center">
            <Link href="/dashboard/organizations">
              <Button variant="outline">
                <ArrowLeft />
                Back
              </Button>
            </Link>
          </div>
        </p>
      </div>
    </div>
  )
}
