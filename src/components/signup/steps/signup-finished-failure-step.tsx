import { type LucideIcon, XCircle } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { cn } from "@/utils/cn"

interface SignupFinishedFailureStepProps {
  title?: string
  description?: React.ReactNode
  icon?: LucideIcon
  iconClassname?: string
  ctaHref?: string
  ctaText?: string
  ctaIcon?: LucideIcon
}

export function SignupFinishedFailureStep({
  title = "We're sorry!",
  description = (
    <>
      Something went wrong with your sign up.
      <br />
      Please contact support if the problem persists.
    </>
  ),
  icon: Icon = XCircle,
  iconClassname = "text-red-500",
  ctaHref,
  ctaText,
  ctaIcon: CtaIcon,
}: SignupFinishedFailureStepProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-6">
      <div className="flex flex-col items-center justify-center gap-2 text-center">
        <Icon className={cn("w-16 h-16", iconClassname)} />
        <h2 className="text-2xl font-semibold">{title}</h2>
        <div className="text-muted-foreground md:max-w-lg">{description}</div>
      </div>

      {ctaHref && (
        <Link href={ctaHref}>
          <Button>
            {CtaIcon && <CtaIcon />}
            {ctaText}
          </Button>
        </Link>
      )}
    </div>
  )
}
