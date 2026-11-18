"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { keepPreviousData } from "@tanstack/react-query"
import { ArrowRight, CheckCircle2, Gift, Megaphone, Package, Pencil, Rocket, UserPlus } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { OnboardingProgressBanner } from "@/components/dashboard/dashboard-sales-rep/new-user/onboarding-progress-banner"
import { OnboardingStep, type StepState } from "@/components/dashboard/dashboard-sales-rep/new-user/onboarding-step"
import {
  FundraiserDetailsFields,
  type FundraiserDetailsValues,
  fundraiserDetailsSchema,
} from "@/components/dashboard/dashboard-sales-rep/new-user/steps/sections/fundraiser-details-fields"
import {
  LaunchReadyContent,
  type MissingStep,
} from "@/components/dashboard/dashboard-sales-rep/new-user/steps/sections/launch-ready-content"
import { Step3Inventory } from "@/components/dashboard/dashboard-sales-rep/new-user/steps/step-3-inventory"
import { Step4PrizePayment } from "@/components/dashboard/dashboard-sales-rep/new-user/steps/step-4-prize-payment"
import { Step5InviteOrgAdmin } from "@/components/dashboard/dashboard-sales-rep/new-user/steps/step-5-invite-org-admin"
import { Button } from "@/components/ui/button"
import { Form } from "@/components/ui/form"
import { Modal } from "@/components/ui/modal"
import { CampaignsStatusEnum, CampaignsVisibilityEnum } from "@/constants/campaigns"
import { useLoggedInUser } from "@/hooks"
import { type Campaign } from "@/server/db/schema"
import { api } from "@/trpc/react"
import { formatDate } from "@/utils/date"
import { firstLetterUpperCase } from "@/utils/string"

const TOTAL_STEPS = 5

type CampaignsCreateWizardProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationId: string
  isEdit: boolean
  campaign?: Campaign
}

export function CampaignsCreateWizard({
  open,
  onOpenChange,
  organizationId,
  isEdit,
  campaign,
}: CampaignsCreateWizardProps) {
  const router = useRouter()
  const utils = api.useUtils()

  const { loggedInUserId } = useLoggedInUser()

  const campdata = !!campaign ? { name: campaign.name, startDate: campaign.startDate, endDate: campaign.endDate } : null

  const [campaignDetail, setCampaignDetail] = useState<Campaign | null>(campaign ?? null)
  const [fundraiserData, setFundraiserData] = useState<FundraiserDetailsValues | null>(campdata)

  const [skippedSteps, setSkippedSteps] = useState<number[]>([])
  const [openStep, setOpenStep] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [missingSteps, setMissingSteps] = useState<MissingStep[]>([])

  const { mutateAsync: createCampaign } = api.campaigns.create.useMutation()
  const { mutateAsync: updateCampaign } = api.campaigns.update.useMutation()
  const { mutateAsync: launch } = api.campaigns.launchFromOrganizations.useMutation()
  const { mutateAsync: setOnboardingStep } = api.users.setOnboardingStep.useMutation()

  const {
    data: state,
    isLoading,
    refetch,
  } = api.campaigns.getCampaignsCreationState.useQuery(
    { userId: loggedInUserId ?? "", campaignId: campaignDetail?.id ?? null },
    { enabled: !!loggedInUserId, placeholderData: keepPreviousData }
  )

  if (isLoading || !state) {
    return null
  }

  const stepStates = state?.stepStates
  const stepDone = [
    stepStates.fundraiser === "done",
    stepStates.inventory === "done",
    stepStates.prizePayment === "done",
    stepStates.sponsorInvite === "done",
    false,
  ]

  const doneCount = stepDone.slice(0, 4).filter(Boolean).length

  const isPassed = (index: number) => Boolean(stepDone[index]) || skippedSteps.includes(index + 1)
  const firstUnpassedIndex = stepDone.findIndex((_, index) => !isPassed(index))
  const activeStep = firstUnpassedIndex === -1 ? stepDone.length : firstUnpassedIndex + 1

  const effectiveOpenStep = openStep ?? activeStep

  const advance = () => setOpenStep(null)
  const handleSkip = (step: number) => {
    setSkippedSteps(prev => (prev.includes(step) ? prev : [...prev, step]))
    setOpenStep(null)
  }

  const stepStateFor = (index: number): StepState => {
    if (stepDone[index]) return "done"
    return index + 1 === activeStep ? "active" : "pending"
  }

  // Launch Fundraiser
  const handleLaunch = async () => {
    setSubmitting(true)
    try {
      if (!campaignDetail || !loggedInUserId) return
      const result = await launch({ userId: loggedInUserId, campaignId: campaignDetail?.id })
      if (!result.ok) {
        setMissingSteps(result.missingSteps)
        return
      }
      setMissingSteps([])
      toast.success("Fundraiser launched!")
      void utils.campaigns.invalidate()
      onOpenChange(false)
      router.push(`/dashboard/organizations/${organizationId}/campaigns/${result.campaignId}`)
    } finally {
      setSubmitting(false)
    }
  }

  // Step 1 - Create Fundraiser
  const onCreateFundraiser = async (data: FundraiserDetailsValues) => {
    setFundraiserData(data)
    if (!loggedInUserId) {
      toast.error("User not found")
      return
    }
    if (!data) {
      toast.error("Campaign data not found")
      return
    }
    // Edit Draft Campaign
    if (campaignDetail) {
      const updatedCampaign = await updateCampaign({
        id: campaignDetail.id,
        name: firstLetterUpperCase(data.name),
        startDate: data.startDate,
        endDate: data.endDate,
      })
      setCampaignDetail(!!updatedCampaign ? updatedCampaign : campaignDetail)
      toast.success("Fundraiser updated")
    } else {
      // Create New Campaign
      const createdCampaign = await createCampaign({
        name: firstLetterUpperCase(data.name),
        startDate: data.startDate,
        endDate: data.endDate,
        organizationId,
        createdByUserId: loggedInUserId,
        sponsorId: loggedInUserId,
        profitSharePercentage: 0,
        status: CampaignsStatusEnum.INACTIVE,
        visibility: CampaignsVisibilityEnum.DRAFT,
      })
      // Set flag isCreatedFromOrganization to true
      if (!!createdCampaign) {
        await setOnboardingStep({
          userId: loggedInUserId,
          campaignId: createdCampaign.id,
          step: "isCreatedFromOrganizations",
          savedAt: null,
          isCreatedFromOrganization: true,
        })
      }
      setCampaignDetail(!!createdCampaign ? createdCampaign : null)
      toast.success("Fundraiser saved as draft")
    }

    advance()
    refetch()
  }

  const lockedNote = <p className="text-sm text-muted-foreground">Complete the previous steps to unlock this one.</p>

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={!!isEdit ? "Edit Fundraiser" : "Create Fundraiser"}
      description="Start a new fundraiser for the organization"
      icon={Megaphone}
      iconClassName="text-green-500"
      className="md:max-w-2xl lg:max-w-3xl"
    >
      <div className="flex flex-col gap-4">
        <OnboardingProgressBanner
          doneCount={doneCount}
          totalSteps={TOTAL_STEPS}
          title="Launch Your Fundraiser"
          description="Five quick steps."
        />

        <div className="flex flex-col gap-3">
          <OnboardingStep
            stepNumber={1}
            title="Create Fundraiser"
            icon={Megaphone}
            state={stepStateFor(0)}
            isOpen={effectiveOpenStep === 1}
            onOpenChange={open => setOpenStep(open ? 1 : -1)}
            videoUrl="/fc-onboarding-videos/create-fundraiser.mp4"
          >
            <FundraiserStep initial={fundraiserData} onSave={onCreateFundraiser} />
          </OnboardingStep>

          <OnboardingStep
            stepNumber={2}
            title="Product Selection"
            icon={Package}
            state={stepStateFor(1)}
            isOpen={effectiveOpenStep === 2}
            onOpenChange={open => setOpenStep(open ? 2 : -1)}
            videoUrl="/fc-onboarding-videos/product-selection.mp4"
          >
            {campaignDetail?.id && organizationId ? (
              <Step3Inventory
                campaignId={campaignDetail?.id}
                organizationId={organizationId}
                isSaved={state?.stepStates.inventory === "done"}
                onSavedAndContinue={() => {
                  advance()
                  refetch()
                }}
                onSkip={() => handleSkip(2)}
              />
            ) : (
              lockedNote
            )}
          </OnboardingStep>

          <OnboardingStep
            stepNumber={3}
            title="Feature Selection"
            icon={Gift}
            state={stepStateFor(2)}
            isOpen={effectiveOpenStep === 3}
            onOpenChange={open => setOpenStep(open ? 3 : -1)}
            videoUrl="/fc-onboarding-videos/feature-selection.mp4"
          >
            {campaignDetail?.id && organizationId ? (
              <Step4PrizePayment
                campaignId={campaignDetail?.id}
                initialPrizeTemplateSlug={campaignDetail?.prizeTemplateSlug ?? null}
                initialDigitalPayment={campaignDetail?.digitalPayment ?? false}
                isSaved={stepStates.prizePayment === "done"}
                onSavedAndContinue={async () => {
                  if (campaignDetail?.id) {
                    const updatedCampaign = await utils.campaigns.getById.fetch(
                      { id: campaignDetail.id },
                      { staleTime: 0 }
                    )
                    setCampaignDetail(!!updatedCampaign ? updatedCampaign : campaignDetail)
                  }
                  advance()
                  refetch()
                }}
                onSkip={() => handleSkip(3)}
              />
            ) : (
              lockedNote
            )}
          </OnboardingStep>

          <OnboardingStep
            stepNumber={4}
            title="Invite an Administrator"
            icon={UserPlus}
            state={stepStateFor(3)}
            isOpen={effectiveOpenStep === 4}
            onOpenChange={open => setOpenStep(open ? 4 : -1)}
            videoUrl="/fc-onboarding-videos/invite-an-admin.mp4"
          >
            {campaignDetail?.id && organizationId ? (
              <Step5InviteOrgAdmin
                organizationId={organizationId}
                campaignId={campaignDetail?.id}
                sponsorId={campaignDetail?.sponsorId}
                alreadyInvited={stepStates.sponsorInvite === "done"}
                onSavedAndContinue={() => {
                  advance()
                  refetch()
                }}
                onSkip={() => handleSkip(4)}
              />
            ) : (
              lockedNote
            )}
          </OnboardingStep>

          <OnboardingStep
            stepNumber={5}
            title="Launch Ready"
            icon={Rocket}
            state={stepStateFor(4)}
            isOpen={effectiveOpenStep === 5}
            onOpenChange={open => setOpenStep(open ? 5 : -1)}
            videoUrl="/fc-onboarding-videos/launch-fundraiser.mp4"
          >
            <LaunchStep
              fundraiserDone={Boolean(stepDone[0])}
              inventoryDone={Boolean(stepDone[1])}
              prizePaymentDone={Boolean(stepDone[2])}
              sponsorDone={Boolean(stepDone[3])}
              submitting={submitting}
              missingStep={missingSteps}
              onCommit={() => void handleLaunch()}
            />
          </OnboardingStep>
        </div>
      </div>
    </Modal>
  )
}

function FundraiserStep({
  initial,
  onSave,
}: {
  initial: FundraiserDetailsValues | null
  onSave: (data: FundraiserDetailsValues) => void
}) {
  const [editing, setEditing] = useState(false)
  const form = useForm<FundraiserDetailsValues>({
    resolver: zodResolver(fundraiserDetailsSchema),
    mode: "onChange",
    defaultValues: initial ?? undefined,
  })

  if (initial && !editing) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-card border border-green-200 bg-green-50 px-4 py-3 text-sm">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
          <div className="space-y-0.5 text-green-900">
            <div>
              <span className="font-semibold">Fundraiser Name</span> - {initial.name}
            </div>
            <div>
              <span className="font-semibold">Start Date</span> - {formatDate(initial.startDate)}
            </div>
            <div>
              <span className="font-semibold">End Date</span> - {formatDate(initial.endDate)}
            </div>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            form.reset(initial)
            setEditing(true)
          }}
        >
          <Pencil /> Edit
        </Button>
      </div>
    )
  }

  const onSubmit = (data: FundraiserDetailsValues) => {
    onSave(data)
    setEditing(false)
  }

  return (
    <Form {...form}>
      <p className="mb-4 text-sm text-muted-foreground">Name your fundraiser and set the dates.</p>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FundraiserDetailsFields control={form.control} />
        <div className="flex justify-start sm:col-span-2">
          <Button type="submit">
            {form.formState.isSubmitting ? "Saving" : editing ? "Save Changes" : "Save & Continue"} <ArrowRight />
          </Button>
        </div>
      </form>
    </Form>
  )
}

function LaunchStep({
  fundraiserDone,
  inventoryDone,
  prizePaymentDone,
  sponsorDone,
  submitting,
  missingStep,
  onCommit,
}: {
  fundraiserDone: boolean
  inventoryDone: boolean
  prizePaymentDone: boolean
  sponsorDone: boolean
  submitting: boolean
  missingStep: MissingStep[]
  onCommit: () => void
}) {
  const [missingSteps, setMissingSteps] = useState<MissingStep[]>(missingStep)

  const steps = [
    { done: fundraiserDone, step: 1, name: "Create Fundraiser" },
    { done: inventoryDone, step: 2, name: "Product Selection" },
    { done: prizePaymentDone, step: 3, name: "Feature Selection" },
    { done: sponsorDone, step: 4, name: "Invite an Administrator" },
  ]
  const outstandingStepCount = steps.filter(item => !item.done).length
  const isReadyForHandoff = outstandingStepCount === 0

  const handleClick = () => {
    const missing = steps.filter(item => !item.done).map(({ step, name }) => ({ step, name }))
    if (missing.length > 0) {
      setMissingSteps(missing)
      return
    }

    setMissingSteps([])
    onCommit()
  }

  return (
    <div>
      <LaunchReadyContent
        isReadyForHandoff={isReadyForHandoff}
        outstandingStepCount={outstandingStepCount}
        missingSteps={missingSteps}
      />

      <Button type="button" onClick={handleClick} disabled={submitting}>
        <Rocket /> Save and Go To Fundraiser
      </Button>
    </div>
  )
}
