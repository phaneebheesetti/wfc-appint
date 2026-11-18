"use client"

import { type inferRouterOutputs } from "@trpc/server"
import { format } from "date-fns"
import { Archive, Box, Calendar, CircleDollarSign, CreditCard, Megaphone } from "lucide-react"
import Image from "next/image"
import { useState } from "react"

import { NotFound } from "@/components/not-found"
import { Button } from "@/components/ui/button"
import { MetricCardSmall } from "@/components/ui/card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Modal } from "@/components/ui/modal"
import { Separator } from "@/components/ui/separator"
import { CampaignsStatusEnum } from "@/constants/campaigns"
import { ColorEnum } from "@/constants/colors"
import { type AppRouter } from "@/server/api/root"
import { type Campaign, type Organization } from "@/server/db/schema"
import { api } from "@/trpc/react"
import { cn } from "@/utils/cn"
import { formatCurrency } from "@/utils/money"

import { CampaignsSummaryDownload } from "./campaigns-summary-download"

type RouterOutput = inferRouterOutputs<AppRouter>
type CampaignHeaderMetrics = RouterOutput["campaigns"]["getHeaderMetrics"]

export type CloseCampaignStep = "summary" | "confirmation"

interface CloseCampaignHeaderProps {
  campaign: Campaign
  organization: Organization
  step?: CloseCampaignStep
}

export function CloseCampaignHeader({ campaign, organization, step = "summary" }: CloseCampaignHeaderProps) {
  return (
    <>
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold">
          {campaign?.name} {step === "confirmation" && " was closed!"}
        </h2>
        <div>
          {organization?.name} • {organization?.city}, {organization?.state}
        </div>
      </div>
      <Separator className="my-4" />

      <div className="flex flex-row gap-2 text-sm w-full justify-between mb-6">
        <div className="flex-1">
          <div className="font-medium">Fundraiser start and end date</div>
          <div className="text-muted-foreground flex items-center gap-2 h-10">
            <Calendar className="w-4 h-4" />
            <div>
              {format(campaign.startDate, "MM/dd/yy")} - {format(campaign.endDate, "MM/dd/yy")}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

interface CampaignCloseProps {
  campaign: Campaign
  organization: Organization
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CampaignClose({ campaign, organization, open, onOpenChange }: CampaignCloseProps) {
  const { data: metrics } = api.campaigns.getHeaderMetrics.useQuery({ campaignId: campaign.id })
  const [step, setStep] = useState<CloseCampaignStep>("summary")

  if (!campaign || !organization) {
    return <NotFound />
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Close Fundraiser"
      description="End this fundraiser and view final results before payout"
      icon={Megaphone}
      iconClassName="text-red-500"
      className="lg:max-w-3xl"
    >
      <CloseCampaignHeader campaign={campaign} organization={organization} step={step} />
      {step === "summary" && (
        <CampaingCloseSummary metrics={metrics} campaign={campaign} onClose={() => setStep("confirmation")} />
      )}
      {step === "confirmation" && <CampaingClosedSuccessfully onClose={() => onOpenChange(false)} />}
    </Modal>
  )
}

interface CampaignSummaryProps {
  metrics: CampaignHeaderMetrics | undefined
  campaign: Campaign
}

export function CampaignSummary({ metrics, campaign }: CampaignSummaryProps) {
  const casesCheckedOutProgress =
    metrics?.totalCasesCheckedOut && metrics?.totalCasesDelivered
      ? Math.round((metrics?.totalCasesCheckedOut / metrics?.totalCasesDelivered) * 100 * 100) / 100
      : 0

  const paymentCollectedProgress =
    metrics?.totalPaymentCollected && metrics?.totalPaymentOwed
      ? Math.round((metrics?.totalPaymentCollected / metrics?.totalPaymentOwed) * 100 * 100) / 100
      : 0

  const { data: totalsByWeekday } = api.paymentLogs.getTotalByPaymentMethodAndWeekday.useQuery({
    campaignId: campaign.id,
  })

  const paymentSummary = totalsByWeekday?.paymentSummary

  const casesCheckedOutDescription = `Cases Checked Out X Delivered: ${metrics?.totalCasesCheckedOut ?? 0} / ${metrics?.totalCasesDelivered ?? 0}`
  const paymentCollectedDescription = `Payment Collected X Total: ${formatCurrency(metrics?.totalPaymentCollected ?? 0)} / ${formatCurrency(metrics?.totalPaymentOwed ?? 0)}`

  return (
    <div className="flex flex-row gap-6 flex-wrap">
      <Card className="flex-1">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 h-20">
          <CardTitle className="flex flex-row items-center gap-2">
            <span className="text-muted-foreground text-sm leading-5">Cash Payments Total</span>
          </CardTitle>

          <CircleDollarSign className={cn("w-4 h-4 text-green-500")} />
        </CardHeader>

        <CardContent className="flex flex-col h-10">
          <div className="flex flex-col gap-2">
            <p className="text-3xl font-medium">{formatCurrency(Number(paymentSummary?.cash?.amount ?? 0))}</p>
          </div>
        </CardContent>

        {campaign.digitalPayment && (
          <>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 h-20">
              <CardTitle className="flex flex-row items-center gap-2">
                <span className="text-muted-foreground text-sm leading-5">Digital Payments Total</span>
              </CardTitle>

              <CreditCard className={cn("w-4 h-4 text-green-500")} />
            </CardHeader>
            <CardContent className="flex flex-col  h-12">
              <div className="flex flex-col gap-2">
                <p className="text-3xl font-medium">{formatCurrency(Number(paymentSummary?.digital?.amount ?? 0))}</p>
              </div>
            </CardContent>
          </>
        )}
      </Card>

      <MetricCardSmall
        title="Cases Checked Out"
        icon={Box}
        value={`${casesCheckedOutProgress}%`}
        description={casesCheckedOutDescription}
        color={ColorEnum.ORANGE}
        progress={casesCheckedOutProgress}
        progressColor={ColorEnum.ORANGE}
      />
      <MetricCardSmall
        title="Payment Collected"
        icon={CircleDollarSign}
        value={`${paymentCollectedProgress}%`}
        description={paymentCollectedDescription}
        color={ColorEnum.GREEN}
        progress={paymentCollectedProgress}
        progressColor={ColorEnum.GREEN}
      />
    </div>
  )
}

interface CampaignCloseSummaryProps {
  metrics: CampaignHeaderMetrics | undefined
  campaign: Campaign
  onClose: () => void
}

function CampaingCloseSummary({ metrics, campaign, onClose }: CampaignCloseSummaryProps) {
  const [isClosing, setIsClosing] = useState(false)

  const utils = api.useUtils()

  const { mutateAsync: updateCampaign } = api.campaigns.update.useMutation()

  const closeCampaign = async () => {
    setIsClosing(true)

    await updateCampaign({
      id: campaign.id,
      status: CampaignsStatusEnum.ENDED,
    })
    void utils.campaigns.getById.invalidate()

    setIsClosing(false)
    onClose()
  }

  return (
    <div>
      <div className="font-semibold mb-4">Fundraiser Summary:</div>
      <CampaignSummary metrics={metrics} campaign={campaign} />
      <div className="bg-gray-100 p-4 rounded-card mt-6">
        <div className="font-semibold">Important. This action is permanent and will prevent the fundraiser from:</div>

        <ul className="list-disc list-inside mt-2">
          <li>Adding new participants</li>
          <li>Adding new delivered cases</li>
          <li>Checking out new cases to participants</li>
          <li>Accepting digital payments</li>
        </ul>
      </div>
      <div className="flex flex-row gap-4 mt-6 w-full flex-wrap justify-end">
        <CampaignsSummaryDownload campaign={campaign} />

        <Button onClick={closeCampaign} disabled={isClosing}>
          <Archive />
          {isClosing ? "Closing..." : "Close Fundraiser"}
        </Button>
      </div>
    </div>
  )
}

function CampaingClosedSuccessfully({ onClose }: { onClose: () => void }) {
  return (
    <>
      <div className="flex flex-col items-center justify-center py-6">
        <Image
          src="/campaign-closed.png"
          alt="Fundraiser Close Confirmation"
          width={712}
          height={300}
          className="rounded-lg"
        />
      </div>
      <Button onClick={onClose}>Close</Button>
    </>
  )
}
