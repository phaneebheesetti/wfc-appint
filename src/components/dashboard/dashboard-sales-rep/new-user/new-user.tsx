"use client"

import { Building2, Check, Copy, Gift, HelpCircle, Megaphone, Package, Rocket, Sparkles, UserPlus } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useLoggedInUser } from "@/hooks"
import { api } from "@/trpc/react"

import { OnboardingProgressBanner } from "./onboarding-progress-banner"
import { OnboardingStep, type StepState } from "./onboarding-step"
import { Step1CreateOrganization } from "./steps/step-1-create-organization"
import { Step2CreateFundraiser } from "./steps/step-2-create-fundraiser"
import { Step3Inventory } from "./steps/step-3-inventory"
import { Step4PrizePayment } from "./steps/step-4-prize-payment"
import { Step5InviteOrgAdmin } from "./steps/step-5-invite-org-admin"
import { Step6LaunchReady } from "./steps/step-6-launch-ready"

const SUPPORT_EMAIL = "digitalappsupport@wfchocolate.com"

export function SalesRepNewUser() {
  const { loggedInUserId, user } = useLoggedInUser()

  const {
    data: state,
    isLoading,
    refetch,
  } = api.organizations.fcOnboardingState.useQuery({ userId: loggedInUserId ?? "" }, { enabled: !!loggedInUserId })

  // `null` means "follow the active step"; a number pins a specific step open; -1 means all collapsed.
  const [openStep, setOpenStep] = useState<number | null>(null)
  // Steps the FC chose to skip — still incomplete, but they shouldn't keep "Up Next" stuck on them.
  const [skippedSteps, setSkippedSteps] = useState<number[]>([])
  // `copied` briefly swaps the copy icon for a check after copying the support email.
  const [copied, setCopied] = useState(false)

  const handleCopyEmail = async () => {
    await navigator.clipboard.writeText(SUPPORT_EMAIL)
    setCopied(true)
    toast.success("Email copied to clipboard")
    setTimeout(() => setCopied(false), 2000)
  }

  if (isLoading || !state) return null

  const { draftOrganization, draftCampaign, stepStates } = state

  const organizationId = draftOrganization?.id
  const campaignId = draftCampaign?.id

  // Step 6 (launch) is never "done" while still onboarding — finishing it graduates the FC out.
  const stepDone = [
    stepStates.organization === "done",
    stepStates.fundraiser === "done",
    stepStates.inventory === "done",
    stepStates.prizePayment === "done",
    stepStates.sponsorInvite === "done",
    false,
  ]

  const doneCount = stepDone.filter(Boolean).length

  // A step is "passed" once it's done OR the FC skipped it — both move "Up Next" along.
  const isPassed = (index: number) => Boolean(stepDone[index]) || skippedSteps.includes(index + 1)
  // First not-passed step (1-based). Defaults to the last step if everything is passed.
  const firstUnpassedIndex = stepDone.findIndex((_, index) => !isPassed(index))
  const activeStep = firstUnpassedIndex === -1 ? stepDone.length : firstUnpassedIndex + 1

  const effectiveOpenStep = openStep ?? activeStep

  // Advance to the next step after a successful save and re-pull onboarding state.
  const handleComplete = async () => {
    await refetch()
    setOpenStep(null)
  }

  // Skip marks the step as passed and lets the accordion fall back to the new active step.
  const handleSkip = (step: number) => {
    setSkippedSteps(prev => (prev.includes(step) ? prev : [...prev, step]))
    setOpenStep(null)
  }

  const stepStateFor = (index: number): StepState => {
    if (stepDone[index]) return "done"
    return index + 1 === activeStep ? "active" : "pending"
  }

  const lockedNote = <p className="text-sm text-muted-foreground">Complete the previous steps to unlock this one.</p>

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <span aria-hidden>👋</span>
          Welcome{user?.firstName ? `, ${user.firstName}` : ""}
        </h1>
        <p className="text-sm text-muted-foreground">Let&apos;s launch your first fundraiser.</p>
      </div>

      <OnboardingProgressBanner doneCount={doneCount} />

      <div className="flex flex-col gap-3">
        <OnboardingStep
          stepNumber={1}
          title="Create Organization"
          icon={Building2}
          state={stepStateFor(0)}
          isOpen={effectiveOpenStep === 1}
          onOpenChange={open => setOpenStep(open ? 1 : -1)}
          videoUrl="/fc-onboarding-videos/create-organization.mp4"
        >
          <Step1CreateOrganization organization={draftOrganization} onCreated={handleComplete} />
        </OnboardingStep>

        <OnboardingStep
          stepNumber={2}
          title="Create Fundraiser"
          icon={Megaphone}
          state={stepStateFor(1)}
          isOpen={effectiveOpenStep === 2}
          onOpenChange={open => setOpenStep(open ? 2 : -1)}
          videoUrl="/fc-onboarding-videos/create-fundraiser.mp4"
        >
          {organizationId ? (
            <Step2CreateFundraiser
              organizationId={organizationId}
              campaign={draftCampaign}
              onCreated={handleComplete}
            />
          ) : (
            lockedNote
          )}
        </OnboardingStep>

        <OnboardingStep
          stepNumber={3}
          title="Product Selection"
          icon={Package}
          state={stepStateFor(2)}
          isOpen={effectiveOpenStep === 3}
          onOpenChange={open => setOpenStep(open ? 3 : -1)}
          videoUrl="/fc-onboarding-videos/product-selection.mp4"
        >
          {campaignId && organizationId ? (
            <Step3Inventory
              campaignId={campaignId}
              organizationId={organizationId}
              isSaved={stepStates.inventory === "done"}
              onSavedAndContinue={handleComplete}
              onSkip={() => handleSkip(3)}
            />
          ) : (
            lockedNote
          )}
        </OnboardingStep>

        <OnboardingStep
          stepNumber={4}
          title="Feature Selection"
          icon={Gift}
          state={stepStateFor(3)}
          isOpen={effectiveOpenStep === 4}
          onOpenChange={open => setOpenStep(open ? 4 : -1)}
          videoUrl="/fc-onboarding-videos/feature-selection.mp4"
        >
          {campaignId && organizationId ? (
            <Step4PrizePayment
              campaignId={campaignId}
              initialPrizeTemplateSlug={draftCampaign?.prizeTemplateSlug ?? null}
              initialDigitalPayment={draftCampaign?.digitalPayment ?? false}
              isSaved={stepStates.prizePayment === "done"}
              onSavedAndContinue={handleComplete}
              onSkip={() => handleSkip(4)}
            />
          ) : (
            lockedNote
          )}
        </OnboardingStep>

        <OnboardingStep
          stepNumber={5}
          title="Invite an Administrator"
          icon={UserPlus}
          state={stepStateFor(4)}
          isOpen={effectiveOpenStep === 5}
          onOpenChange={open => setOpenStep(open ? 5 : -1)}
          videoUrl="/fc-onboarding-videos/invite-an-admin.mp4"
        >
          {campaignId && organizationId ? (
            <Step5InviteOrgAdmin
              organizationId={organizationId}
              campaignId={campaignId}
              sponsorId={draftCampaign?.sponsorId}
              alreadyInvited={stepStates.sponsorInvite === "done"}
              onSavedAndContinue={handleComplete}
              onSkip={() => handleSkip(5)}
            />
          ) : (
            lockedNote
          )}
        </OnboardingStep>

        <OnboardingStep
          stepNumber={6}
          title="Launch Ready"
          icon={Rocket}
          state={stepStateFor(5)}
          isOpen={effectiveOpenStep === 6}
          onOpenChange={open => setOpenStep(open ? 6 : -1)}
          videoUrl="/fc-onboarding-videos/launch-fundraiser.mp4"
        >
          <Step6LaunchReady
            isReadyForHandoff={stepDone.slice(0, 5).every(Boolean)}
            outstandingStepCount={stepDone.slice(0, 5).filter(done => !done).length}
            organizationDone={Boolean(stepDone[0])}
            fundraiserDone={Boolean(stepDone[1])}
            inventoryDone={Boolean(stepDone[2])}
            prizePaymentDone={Boolean(stepDone[3])}
            sponsorInviteDone={Boolean(stepDone[4])}
          />
        </OnboardingStep>
      </div>

      <div className="flex flex-col gap-3 rounded-card border bg-rose-50/40 px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 shrink-0 text-amber-500" />
          <span>
            <span className="text-foreground">You can pause and return anytime.</span>
          </span>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className="flex shrink-0 items-center gap-1.5 hover:text-foreground">
              <HelpCircle className="h-4 w-4" /> Need help?
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" align="end" className="w-auto">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-foreground">{SUPPORT_EMAIL}</span>
              <button
                type="button"
                onClick={() => void handleCopyEmail()}
                aria-label="Copy support email"
                className="shrink-0 text-muted-foreground hover:text-foreground"
              >
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
