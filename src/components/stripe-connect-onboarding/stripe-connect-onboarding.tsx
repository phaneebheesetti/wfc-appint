"use client"

import { useState } from "react"

import { NotFound } from "@/components/not-found"
import { RolesEnum } from "@/constants/roles"
import { useLoggedInUser } from "@/hooks"
import { api } from "@/trpc/react"

import { FinishedStep, LoadingStep, NotAuthorizedStep, OnboardingStep, SetupStep } from "./steps"

export type StripeConnectOnboardingStep = "setup" | "onboarding" | "finished"

interface StripeConnectOnboardingProps {
  organizationId: string
}

export function StripeConnectOnboarding({ organizationId }: StripeConnectOnboardingProps) {
  const { loggedInUserId, loggedInRole, isLoading: isUserLoading } = useLoggedInUser()
  const [step, setStep] = useState<StripeConnectOnboardingStep>("setup")

  const { data: organization, isLoading } = api.organizations.getByIdWithUsers.useQuery({ id: organizationId })

  if (isLoading || isUserLoading) {
    return <LoadingStep />
  }

  if (!organization) {
    return <NotFound />
  }

  const userBelongsToOrganization = organization?.organizationsUsers.some(orgUser => orgUser.userId === loggedInUserId)
  const userIsOrganizationAdmin = loggedInRole && [RolesEnum.ORGANIZATION_ADMIN, RolesEnum.ADMIN].includes(loggedInRole)
  const canOnboard = userBelongsToOrganization && userIsOrganizationAdmin

  if (!canOnboard) {
    return <NotAuthorizedStep />
  }

  const contentByStep: Record<StripeConnectOnboardingStep, React.ReactNode> = {
    setup: <SetupStep onStepChange={setStep} organization={organization} />,
    onboarding: <OnboardingStep onStepChange={setStep} organization={organization} />,
    finished: <FinishedStep organization={organization} />,
  }

  return contentByStep[step]
}
