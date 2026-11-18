import { CircleAlert } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { type Stripe } from "stripe"

import { Button } from "@/components/ui/button"
import { type Organization } from "@/server/db/schema"
import { api } from "@/trpc/react"

import { type StripeConnectOnboardingStep } from "../stripe-connect-onboarding"

interface SetupStepProps {
  organization: Organization
  onStepChange: (step: StripeConnectOnboardingStep) => void
}

export function SetupStep({ organization, onStepChange }: SetupStepProps) {
  const [loading, setLoading] = useState(false)
  const utils = api.useUtils()

  const { mutateAsync: updateOrganization } = api.organizations.update.useMutation()

  const handleSubmit = async () => {
    try {
      setLoading(true)

      const body = JSON.stringify({
        businessProfile: {
          name: organization.name,
          support_address: {
            line1: organization.street ?? "",
            city: organization.city ?? "",
            state: organization.state ?? "",
            postal_code: organization.postalCode ?? "",
            country: organization.country ?? "",
          },
        },
      })

      const response = await fetch("/api/stripe/account", {
        method: "POST",
        body,
      })

      const data = (await response.json()) as { data?: Stripe.Account; error?: string }

      if (!response.ok) {
        throw new Error(data.error)
      }

      await updateOrganization({
        id: organization.id,
        stripeConnectedAccountId: data.data!.id,
      })
      await utils.organizations.getByIdWithUsers.refetch({ id: organization.id })

      onStepChange("onboarding")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to connect organization Stripe account")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-md">
      <div className="flex flex-col gap-3 text-center md:text-left">
        <h2 className="text-2xl font-semibold">Connect your Stripe Account</h2>
        <p className="text-sm text-muted-foreground">
          Enable secure payments and digital payouts by linking a Stripe account. This takes about 5 minutes.
        </p>
      </div>

      <div className="gap-5 py-5 px-5 rounded-card bg-muted bg-[#e8f0ff] border text-blue-700">
        <p className="flex items-center gap-2">
          <CircleAlert className="w-5 h-5 " /> Before you start - what you&apos;ll need
        </p>
        <ol className="list-disc pl-6 py-5">
          <li>
            Your organization&apos;s <b>Employer Identification Number (EIN)</b>
          </li>
          <li>
            The authorized representative&apos;s <b> legal name and date of birth</b>
          </li>
          <li>
            The authorized representative&apos;s <b>last 4 digits of their SSN </b>(full SSN may be required if identity
            cannot be confirmed)
          </li>
        </ol>
        <hr className="border-0 border-t border-blue-500" />
        <p className="pt-5">Required by US federal regulations for payment account verification.</p>
      </div>

      <div className="gap-5 py-5 px-5 rounded-card bg-[#f5f0e6] border">
        <p>WHO SHOULD COMPLETE THIS?</p>
        <p>
          <b>Your organizations&apos;s authorized financial representative</b>
        </p>
        <p>
          This should be the person officially responsible for your organization&apos;s finances - such as a{" "}
          <b>Treasurer, CFO, Business Manager</b>, or equivalent. They must have signing authority on behalf of the
          organization.
        </p>
      </div>
      <Button onClick={handleSubmit} disabled={loading}>
        {loading ? "Connecting..." : "Continue to Stripe"}
      </Button>

      <Button variant="secondary" onClick={() => onStepChange("finished")}>
        Skip for now
      </Button>
    </div>
  )
}
