"use client"

import {
  ArrowRight,
  Check,
  CheckCircle2,
  CreditCard,
  FileText,
  Gift,
  Mail,
  Package,
  Pencil,
  Plug,
  Rocket,
  Users,
} from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"

import { DocumentsCreate } from "@/components/documents/documents-create"
import { EventsCreate } from "@/components/events/events-create"
import { OrganizationsParticipantsCreate } from "@/components/organizations-users/organizations-participants"
import { PrizesCreate } from "@/components/prizes/prizes-create"
import { StripeConnectButton } from "@/components/stripe-connect"
import { Button } from "@/components/ui/button"
import { useLoggedInUser } from "@/hooks"
import { api } from "@/trpc/react"

import { OaAddProduct } from "./dashboard-add-product-step"
import { SetupHubProgressBanner } from "./setup-hub-progress-banner"
import { SetupHubStep, type StepState } from "./setup-hub-step"

export function DashboardOrgAdminSetupHubExp() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { loggedInUserId } = useLoggedInUser()
  const campaignId = searchParams.get("campaignId") ?? ""

  const { data: campaign, refetch: refetchCampaign } = api.campaigns.getById.useQuery({
    id: campaignId,
  })

  const { data: campaignProgress, refetch: refetchCampaignProgress } = api.campaignsProgress.getByCampaignId.useQuery(
    {
      campaignId,
    },
    {
      enabled: !!campaignId,
    }
  )

  const organizationId = campaign?.organizationId ?? ""

  const setupProgress = campaignProgress?.setupProgress

  const { data: organization } = api.organizations.getById.useQuery(
    {
      id: organizationId,
    },
    {
      enabled: !!organizationId,
    }
  )

  const { data: participants = [], refetch: refetchParticipants } = api.campaignsUsers.listByCampaignId.useQuery({
    campaignId,
  })

  const { data: prizes = [], refetch: refetchPrizes } = api.prizes.listByCampaignId.useQuery({
    campaignId,
  })

  const { data: events = [], refetch: refetchEvents } = api.events.listByCampaignId.useQuery({
    campaignId,
  })

  const { data: documents = [], refetch: refetchDocuments } = api.documents.listByCampaignId.useQuery({
    campaignId,
  })

  const { data: casesTransactions = [], refetch: refetchCases } = api.casesTransactions.getByCampaignId.useQuery({
    campaignId,
  })

  const inventoryCreatedByCurrentUser = casesTransactions.some(
    transaction => transaction.createdByUserId === loggedInUserId
  )

  const [participantsOpen, setParticipantsOpen] = useState(false)

  const [prizesOpen, setPrizesOpen] = useState(false)

  const [eventsOpen, setEventsOpen] = useState(false)

  const [documentsOpen, setDocumentsOpen] = useState(false)

  const [manageMode, setManageMode] = useState({
    participants: false,
    cases: false,
    prizes: false,
    permissionSlip: false,
  })

  const [isLaunching, setIsLaunching] = useState(false)
  const [openStep, setOpenStep] = useState<number | null>(null)

  const [skippedSteps, setSkippedSteps] = useState<number[]>([])

  const stripeEnabled = campaign?.digitalPayment ?? false

  const stripeConnected = Boolean(organization?.stripeConnectedAccountId)

  const participantsComplete = participants.length > 0

  const casesComplete = casesTransactions.length > 0

  const stripeComplete = stripeConnected || setupProgress?.stripeSaved === true

  const prizesAndEventsComplete = prizes.length > 0 || events.length > 0 || setupProgress?.prizesAndEventsSaved === true

  const permissionSlipComplete = documents.length > 0 || setupProgress?.permissionSlipSaved === true

  const stepDone = [
    stripeComplete,
    participantsComplete,
    casesComplete,
    prizesAndEventsComplete,
    permissionSlipComplete,
  ]

  const flowStepDone = [
    stripeEnabled ? stripeComplete : true,
    participantsComplete,
    casesComplete,
    prizesAndEventsComplete,
    permissionSlipComplete,
  ]

  const firstUnpassedIndex = flowStepDone.findIndex(
    (_, index) => !flowStepDone[index] && !skippedSteps.includes(index + 1)
  )

  const finalReviewComplete = setupProgress?.finalReviewCompleted === true

  const doneCount =
    stepDone.filter((_, index) => index !== 0 || stripeEnabled).filter(Boolean).length + (finalReviewComplete ? 1 : 0)

  const totalSteps = stripeEnabled ? 6 : 5

  const activeStep = firstUnpassedIndex === -1 ? 6 : firstUnpassedIndex + 1

  const effectiveOpenStep = openStep ?? activeStep

  const handleSkip = (step: number) => {
    setSkippedSteps(prev => (prev.includes(step) ? prev : [...prev, step]))

    setOpenStep(null)
  }

  const setSetupProgressMutation = api.campaignsProgress.setSetupProgress.useMutation()

  const handleSaveAndContinue = async (
    key: "stripeSaved" | "prizesAndEventsSaved" | "permissionSlipSaved" | "finalReviewCompleted"
  ) => {
    await setSetupProgressMutation.mutateAsync({
      campaignId,
      key,
    })

    await Promise.all([refetchCampaign(), refetchCampaignProgress()])

    if (key === "prizesAndEventsSaved") {
      setManageMode(prev => ({
        ...prev,
        prizes: false,
      }))
    }

    if (key === "permissionSlipSaved") {
      setManageMode(prev => ({
        ...prev,
        permissionSlip: false,
      }))
    }

    setOpenStep(null)
  }

  const handleComplete = async () => {
    await Promise.all([
      refetchCampaign(),
      refetchCampaignProgress(),
      refetchParticipants(),
      refetchCases(),
      refetchPrizes(),
      refetchEvents(),
      refetchDocuments(),
    ])

    setOpenStep(null)
  }

  const stepStateFor = (index: number): StepState => {
    if (stepDone[index]) {
      return "done"
    }

    return index + 1 === activeStep ? "active" : "pending"
  }

  const { data: stripeStatus } = api.organizations.getStripeAccountStatus.useQuery(
    {
      stripeAccountId: organization?.stripeConnectedAccountId ?? "",
    },
    {
      enabled: !!organization?.stripeConnectedAccountId,
    }
  )

  const stripeRestricted = stripeStatus?.chargesEnabled === false

  const canLaunch = stripeEnabled
    ? stepDone.every(Boolean)
    : [participantsComplete, casesComplete, prizesAndEventsComplete, permissionSlipComplete].every(Boolean)

  const handleLaunchFundraiser = async () => {
    try {
      setIsLaunching(true)

      await setSetupProgressMutation.mutateAsync({
        campaignId,
        key: "finalReviewCompleted",
      })

      await refetchCampaignProgress()

      router.push(`/dashboard/organizations/${organization?.id}/campaigns/${campaign?.id}`)
    } finally {
      setIsLaunching(false)
    }
  }

  const goToFundraiser = () => {
    void router.push(`/dashboard/organizations/${organization?.id}/campaigns/${campaign?.id}`)
  }

  if (!campaign) {
    return null
  }
  const assigner = campaign.createdByUser
  const assignerEmail = assigner.email!
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <SetupHubProgressBanner fundraiserName={campaign.name} doneCount={doneCount} totalSteps={totalSteps} />

      <div className="flex flex-col gap-3">
        {
          <SetupHubStep
            stepNumber={stripeEnabled ? 1 : undefined}
            title="Enable Digital Payments"
            icon={CreditCard}
            attentionRequired={stripeRestricted && stripeEnabled}
            state={!stripeEnabled ? "disabled" : stepStateFor(0)}
            isOpen={effectiveOpenStep === 1}
            onOpenChange={open => setOpenStep(open ? 1 : -1)}
            videoUrl="/oa-onboarding-videos/enable-digital-payments.mp4"
            assignerEmail={assignerEmail}
          >
            {stripeEnabled && stripeComplete ? (
              stripeRestricted ? (
                <div className="rounded-card border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-900">
                  Your Stripe account is connected but it is not active. Please visit{" "}
                  <a
                    href="https://dashboard.stripe.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium underline"
                  >
                    Stripe Dashboard
                  </a>{" "}
                  for more information.
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-card border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
                  Stripe account connection step completed.
                </div>
              )
            ) : !stripeEnabled ? (
              <>
                <p className="mb-4 text-sm text-muted-foreground">
                  Connect a bank account to allow supporters to securely pay online.
                </p>

                <div className="rounded-card border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                  Digital payment is not enabled for this fundraiser.
                </div>

                <Button variant="outline" disabled className="mt-4">
                  <Plug />
                  Connect Stripe Account
                </Button>
              </>
            ) : (
              <>
                <p className="mb-4 text-sm text-muted-foreground">
                  Connect a bank account to allow supporters to securely pay online.
                </p>
                <div className="flex flex-col items-start gap-3">
                  <StripeConnectButton organizationId={organizationId} />

                  <div className="flex items-center gap-2">
                    <Button type="button" onClick={() => void handleSaveAndContinue("stripeSaved")}>
                      Save & Continue
                      <ArrowRight />
                    </Button>

                    <Button type="button" variant="ghost" onClick={() => handleSkip(1)}>
                      Skip for now
                      <ArrowRight />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </SetupHubStep>
        }

        <SetupHubStep
          stepNumber={stripeEnabled ? 2 : 1}
          title="Add Participants"
          icon={Users}
          state={stepStateFor(1)}
          isOpen={effectiveOpenStep === 2}
          onOpenChange={open => {
            setOpenStep(open ? 2 : -1)

            if (!open && participantsComplete) {
              setManageMode(prev => ({
                ...prev,
                participants: false,
              }))
            }
          }}
          videoUrl="/oa-onboarding-videos/add-participants.mp4"
          assignerEmail={assignerEmail}
        >
          {participantsComplete && !manageMode.participants && (
            <div className="mb-4 flex items-center justify-between rounded-card border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
                <span>Participant addition step completed.</span>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-black"
                onClick={() =>
                  setManageMode(prev => ({
                    ...prev,
                    participants: true,
                  }))
                }
              >
                <Pencil />
                Add
              </Button>
            </div>
          )}

          {(!participantsComplete || manageMode.participants) && (
            <>
              <p className="mb-4 text-sm text-muted-foreground">Add participants who&apos;ll be fundraising.</p>
              <div className="mb-4 flex items-start gap-2 rounded-card border border-brown-200 bg-[#fdf8ee] px-4 py-3 text-sm text-brown-900">
                <Mail className="h-4 w-4 mt-[1px] shrink-0 text-brown-200" />
                <span>
                  Parents/guardians will receive a welcome email with login instructions as soon as a participant is
                  added or uploaded.
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Button type="button" onClick={() => setParticipantsOpen(true)}>
                  Add Participants
                </Button>

                {participantsComplete ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() =>
                      setManageMode(prev => ({
                        ...prev,
                        participants: false,
                      }))
                    }
                  >
                    Cancel
                  </Button>
                ) : (
                  <Button type="button" variant="ghost" onClick={() => handleSkip(2)}>
                    Skip for now
                    <ArrowRight />
                  </Button>
                )}
              </div>
            </>
          )}
        </SetupHubStep>

        <SetupHubStep
          stepNumber={stripeEnabled ? 3 : 2}
          title="Product Selection"
          icon={Package}
          state={stepStateFor(2)}
          isOpen={effectiveOpenStep === 3}
          onOpenChange={open => setOpenStep(open ? 3 : -1)}
          videoUrl="/oa-onboarding-videos/product-selection.mp4"
          assignerEmail={assignerEmail}
        >
          <OaAddProduct
            campaignId={campaignId}
            organizationId={organizationId}
            isSaved={casesComplete}
            inventoryCreatedByCurrentUser={inventoryCreatedByCurrentUser}
            onSavedAndContinue={handleComplete}
            onSkip={() => handleSkip(3)}
          />
        </SetupHubStep>

        <SetupHubStep
          stepNumber={stripeEnabled ? 4 : 3}
          title="Configure Prize Program & Event"
          icon={Gift}
          state={stepStateFor(3)}
          isOpen={effectiveOpenStep === 4}
          onOpenChange={open => {
            setOpenStep(open ? 4 : -1)

            if (!open && prizesAndEventsComplete) {
              setManageMode(prev => ({
                ...prev,
                prizes: false,
              }))
            }
          }}
          videoUrl="/oa-onboarding-videos/prize-program.mp4"
          assignerEmail={assignerEmail}
        >
          {prizesAndEventsComplete && !manageMode.prizes && (
            <div className="mb-4 flex items-center justify-between rounded-card border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
                <span>Prize program & Event configuration step completed.</span>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-black"
                onClick={() =>
                  setManageMode(prev => ({
                    ...prev,
                    prizes: true,
                  }))
                }
              >
                <Pencil />
                Add
              </Button>
            </div>
          )}

          {(!prizesAndEventsComplete || manageMode.prizes) && (
            <>
              <p className="mb-4 text-sm text-muted-foreground">
                Reward participants with prizes that fuel engagement.
              </p>
              <div className="flex flex-col items-start gap-3">
                <Button type="button" onClick={() => setPrizesOpen(true)}>
                  Create Prize
                </Button>
                <Button type="button" onClick={() => setEventsOpen(true)}>
                  Create Event
                </Button>

                <div className="flex items-center gap-2">
                  <Button type="button" onClick={() => void handleSaveAndContinue("prizesAndEventsSaved")}>
                    Save & Continue
                    <ArrowRight />
                  </Button>

                  {prizesAndEventsComplete ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() =>
                        setManageMode(prev => ({
                          ...prev,
                          prizes: false,
                        }))
                      }
                    >
                      Cancel
                    </Button>
                  ) : (
                    <Button type="button" variant="ghost" onClick={() => handleSkip(4)}>
                      Skip for now
                      <ArrowRight />
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </SetupHubStep>

        <SetupHubStep
          stepNumber={stripeEnabled ? 5 : 4}
          title="Create Permission Slip"
          icon={FileText}
          state={stepStateFor(4)}
          isOpen={effectiveOpenStep === 5}
          onOpenChange={open => {
            setOpenStep(open ? 5 : -1)

            if (!open && permissionSlipComplete) {
              setManageMode(prev => ({
                ...prev,
                permissionSlip: false,
              }))
            }
          }}
          videoUrl="/oa-onboarding-videos/permission-slips.mp4"
          assignerEmail={assignerEmail}
        >
          {permissionSlipComplete && !manageMode.permissionSlip && (
            <div className="mb-4 flex items-center justify-between rounded-card border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
                <span>Permission slip creation step completed.</span>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-black"
                onClick={() =>
                  setManageMode(prev => ({
                    ...prev,
                    permissionSlip: true,
                  }))
                }
              >
                <Pencil />
                Add
              </Button>
            </div>
          )}

          {(!permissionSlipComplete || manageMode.permissionSlip) && (
            <>
              <p className="mb-4 text-sm text-muted-foreground">
                Decide if participants will need permission from an adult to participate.
              </p>
              <div className="flex flex-col items-start gap-3">
                <Button type="button" onClick={() => setDocumentsOpen(true)}>
                  Create Permission Slip
                </Button>

                <div className="flex items-center gap-2">
                  <Button type="button" onClick={() => void handleSaveAndContinue("permissionSlipSaved")}>
                    Save & Continue
                    <ArrowRight />
                  </Button>

                  {permissionSlipComplete ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() =>
                        setManageMode(prev => ({
                          ...prev,
                          permissionSlip: false,
                        }))
                      }
                    >
                      Cancel
                    </Button>
                  ) : (
                    <Button type="button" variant="ghost" onClick={() => handleSkip(5)}>
                      Skip for now
                      <ArrowRight />
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </SetupHubStep>

        <SetupHubStep
          stepNumber={stripeEnabled ? 6 : 5}
          title="Final Review"
          icon={Rocket}
          state={finalReviewComplete ? "done" : firstUnpassedIndex === -1 ? "active" : "pending"}
          isOpen={effectiveOpenStep === 6}
          onOpenChange={open => setOpenStep(open ? 6 : -1)}
          videoUrl="/oa-onboarding-videos/final-review.mp4"
          assignerEmail={assignerEmail}
        >
          <p className="mb-4 text-sm text-muted-foreground">
            Complete a final check to ensure your fundraiser is ready for launch.
          </p>

          <div className="rounded-card border border-green-200 bg-green-50 p-4">
            <div className="space-y-3 text-sm">
              <ReviewItem complete={stripeComplete} disabled={!stripeEnabled} label="Payments connected" />

              <ReviewItem complete={participantsComplete} label="Participants added" />

              <ReviewItem complete={casesComplete} label="Products selected" />

              <ReviewItem complete={prizesAndEventsComplete} label="Prize program & Event set" />

              <ReviewItem complete={permissionSlipComplete} label="Permission slip configured" />
            </div>
          </div>

          <div className="mt-6">
            <Button
              disabled={!canLaunch || isLaunching}
              onClick={finalReviewComplete ? goToFundraiser : () => void handleLaunchFundraiser()}
            >
              {isLaunching ? "Launching..." : finalReviewComplete ? "Go to Fundraiser" : "Launch Fundraiser"}
            </Button>
          </div>
        </SetupHubStep>
      </div>

      <OrganizationsParticipantsCreate
        open={participantsOpen}
        onOpenChange={open => {
          setParticipantsOpen(open)

          if (!open) {
            void handleComplete()
          }
        }}
        campaignId={campaignId}
        organizationId={organizationId}
      />

      <PrizesCreate
        open={prizesOpen}
        onOpenChange={open => {
          setPrizesOpen(open)

          if (!open) {
            void handleComplete()
          }
        }}
        campaignId={campaignId}
        organizationId={organizationId}
      />

      <EventsCreate
        open={eventsOpen}
        onOpenChange={open => {
          setEventsOpen(open)

          if (!open) {
            void handleComplete()
          }
        }}
        campaignId={campaignId}
        organizationId={organizationId}
      />

      <DocumentsCreate
        open={documentsOpen}
        onOpenChange={open => {
          setDocumentsOpen(open)

          if (!open) {
            void handleComplete()
          }
        }}
        campaignId={campaignId}
        organizationId={organizationId}
      />
    </div>
  )
}

function ReviewItem({ complete, label, disabled = false }: { complete: boolean; label: string; disabled?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      {disabled ? (
        <div className="h-4 w-4 rounded-full bg-gray-400" />
      ) : complete ? (
        <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
      ) : (
        <div className="h-4 w-4 rounded-full border-2 border-yellow-500 bg-transparent" />
      )}

      <span className={disabled ? "text-muted-foreground" : undefined}>{label}</span>
    </div>
  )
}
