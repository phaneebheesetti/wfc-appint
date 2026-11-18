import { ConnectAccountOnboarding } from "@stripe/react-connect-js"
import { CircleAlert, TriangleAlert } from "lucide-react"
import { useState } from "react"

import { StripeConnectProvider } from "@/providers"
import { type Organization } from "@/server/db/schema"

import { type StripeConnectOnboardingStep } from "../stripe-connect-onboarding"

interface OnboardingStepProps {
  organization: Organization
  onStepChange: (step: StripeConnectOnboardingStep) => void
}

export function OnboardingStep({ organization, onStepChange }: OnboardingStepProps) {
  const [currentStripeStep, setCurrentStripeStep] = useState<string | null>(null)

  if (!organization.stripeConnectedAccountId) {
    return <div>No Stripe connected account found</div>
  }
  const isPersonalDetailsStep = currentStripeStep === "representative_details"
  const islegalEntitySharingStep = currentStripeStep === "legal_entity_sharing"

  return (
    <div className="w-full max-w-md flex flex-col [&>div]:overflow-y-auto [&>div]:overflow-x-hidden [&>div]:p-4 [&>div]:max-h-[calc(100vh-5rem)]">
      {/* Show this on legal_entity_sharing step */}
      {islegalEntitySharingStep && (
        <div className="flex gap-3 py-5 px-5 rounded-card bg-[#f5f0e6] border">
          <CircleAlert className="w-5 h-5 shrink-0 mt-0.5" />
          <p>
            This account should be completed by the person with official financial authority over your organization -
            such as a<b> Treasurer, CFO, or Business Manager</b>. They will need your organization&apos;s EIN and their
            personal details to complete setup.
          </p>
        </div>
      )}

      {/* Show only on the personal details step */}
      {isPersonalDetailsStep && (
        <div className="mt-2 mb-1 rounded-card border bg-[#f5f0e6] px-4 py-3 text-sm">
          Enter details of your organization&apos;s <b>authorized representative</b> - the Treasurer, CFO, or Business
          Manager with officical signing authority. <br />
          SSN is required by US federal regulations to verify the identity of your organization&apos;s authorized
          representative. Your full SSN may be requested if the initial verification is inconclusive. <br />
          <div className="flex gap-3 mt-2">
            <TriangleAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              If your last 4 digits don&apos;t produce a confident identity match, you&apos;ll be prompted to provide
              your full SSN before the account can be verified.
            </p>
          </div>
          <p className="mt-2 text-blue-700">Provide a government-issued ID number instead.</p>
        </div>
      )}

      <StripeConnectProvider stripeAccountId={organization.stripeConnectedAccountId}>
        <ConnectAccountOnboarding
          onExit={() => onStepChange("finished")}
          onStepChange={stepChange => {
            setCurrentStripeStep(stepChange.step)
          }}
        />
      </StripeConnectProvider>
    </div>
  )
}
