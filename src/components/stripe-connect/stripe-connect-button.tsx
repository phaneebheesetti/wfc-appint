import { Plug } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { RolesEnum } from "@/constants/roles"
import { useLoggedInUser } from "@/hooks"
import { cn } from "@/utils/cn"

interface StripeConnectButtonProps {
  organizationId: string
  className?: string
}

export function StripeConnectButton({ organizationId, className }: StripeConnectButtonProps) {
  const { loggedInRole: role } = useLoggedInUser()

  if (!role) {
    return null
  }

  const canSeeStripeConnectButton = role === RolesEnum.ADMIN || role === RolesEnum.ORGANIZATION_ADMIN

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <Link
        href={`/stripe-connect-onboarding/organization/${organizationId}`}
        className={!canSeeStripeConnectButton ? "cursor-not-allowed" : ""}
      >
        <Button variant="outline" size="sm" className="w-fit" disabled={!canSeeStripeConnectButton}>
          <Plug />
          Connect Stripe Account
        </Button>
      </Link>
      {!canSeeStripeConnectButton && (
        <div className="text-muted-foreground text-[10px]">Only admins can connect a Stripe account</div>
      )}
    </div>
  )
}
