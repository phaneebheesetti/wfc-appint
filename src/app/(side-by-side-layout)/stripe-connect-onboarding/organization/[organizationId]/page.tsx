"use client"

import { useParams } from "next/navigation"

import { NotFound } from "@/components/not-found"
import { StripeConnectOnboarding } from "@/components/stripe-connect-onboarding"

export default function StripeConnectOnboardingPage() {
  const { organizationId } = useParams<{ organizationId: string }>()

  if (!organizationId) {
    return <NotFound />
  }

  return <StripeConnectOnboarding organizationId={organizationId} />
}
