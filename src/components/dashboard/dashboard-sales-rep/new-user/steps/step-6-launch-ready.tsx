"use client"

import { Rocket } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { useLoggedInUser } from "@/hooks/use-logged-in-user"
import { api } from "@/trpc/react"

import { LaunchReadyContent, type MissingStep } from "./sections/launch-ready-content"

type Step6LaunchReadyProps = {
  // True only when every prior step is complete — gates the "handoff" panel so it never
  // shows "Nice work" if the FC jumped to Step 6 with steps still outstanding.
  isReadyForHandoff: boolean
  // How many of the prior steps are still incomplete — drives the "N steps still outstanding" message.
  outstandingStepCount: number
  // Steps 1 & 2 are the launch minimum. The server throws (rather than returning a missing-step list) when
  // either is absent, so we pre-validate client-side. When they're missing we also list any untouched later
  // steps (3–5) ourselves, since the server can't run to report them.
  organizationDone: boolean
  fundraiserDone: boolean
  inventoryDone: boolean
  prizePaymentDone: boolean
  sponsorInviteDone: boolean
}

export function Step6LaunchReady({
  isReadyForHandoff,
  outstandingStepCount,
  organizationDone,
  fundraiserDone,
  inventoryDone,
  prizePaymentDone,
  sponsorInviteDone,
}: Step6LaunchReadyProps) {
  const router = useRouter()
  const utils = api.useUtils()
  const { loggedInUserId } = useLoggedInUser()
  const [missingSteps, setMissingSteps] = useState<MissingStep[]>([])
  const [submitting, setSubmitting] = useState(false)

  const { mutateAsync: launch } = api.campaigns.launchFromOnboarding.useMutation()

  const onLaunch = async () => {
    if (!loggedInUserId) return

    // The launch minimum (steps 1 & 2) makes the server throw if missing, so validate it here first and
    // show the same missing-step panel rather than firing a request that can't succeed. When 1 or 2 are
    // missing we also append any untouched later steps (3–5), since the server can't run to report them.
    const baseMissing: MissingStep[] = []
    if (!organizationDone) baseMissing.push({ step: 1, name: "Create Organization" })
    if (!fundraiserDone) baseMissing.push({ step: 2, name: "Create Fundraiser" })
    if (baseMissing.length > 0) {
      if (!inventoryDone) baseMissing.push({ step: 3, name: "Product Selection" })
      if (!prizePaymentDone) baseMissing.push({ step: 4, name: "Feature Selection" })
      if (!sponsorInviteDone) baseMissing.push({ step: 5, name: "Invite an Administrator" })
      setMissingSteps(baseMissing)
      return
    }

    setSubmitting(true)
    try {
      const result = await launch({ userId: loggedInUserId })
      if (!result.ok) {
        setMissingSteps(result.missingSteps)
        return
      }
      setMissingSteps([])
      toast.success("Fundraiser launched!")
      // The org/campaign just flipped from draft → published. Refresh the persistent left-nav fundraiser tree
      // (campaigns.getAllFromUserId) right away so the new campaign appears.
      void utils.campaigns.invalidate()
      // Mark the dashboard's onboarding→active switch (organizations.fcOnboardingState) stale WITHOUT
      // refetching it now: an active refetch would flip isNewUser and briefly render the active dashboard over
      // this still-mounted wizard before we navigate away (the flash). refetchType "none" defers the refresh
      // to the next time /dashboard mounts, so launching takes the FC straight to the fundraiser page.
      void utils.organizations.invalidate(undefined, { refetchType: "none" })
      router.push(`/dashboard/organizations/${result.organizationId}/campaigns/${result.campaignId}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <LaunchReadyContent
        isReadyForHandoff={isReadyForHandoff}
        outstandingStepCount={outstandingStepCount}
        missingSteps={missingSteps}
      />

      <Button type="button" onClick={onLaunch} disabled={submitting}>
        <Rocket /> Save and Go To Fundraiser
      </Button>
    </div>
  )
}
