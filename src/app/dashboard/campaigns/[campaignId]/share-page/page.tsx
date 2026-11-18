"use client"

import { ChevronLeft, Copy, Facebook, Mail, QrCode, Smartphone } from "lucide-react"
import Link from "next/link"
import { useParams, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"

import { NotFound } from "@/components/not-found"
import { ShareQrDialog } from "@/components/share-qr-dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { WithTooltip } from "@/components/ui/tooltip"
import { RolesEnum } from "@/constants/roles"
import { useIsMobile, useLoggedInUser } from "@/hooks"
import { api } from "@/trpc/react"

const IN_PERSON_DELIVERY_FOOTER = "Available for in-person delivery in my local area."

const TEXT_SHARE_TOOLTIP = "Text feature is available when sharing from a mobile device"

// Shared by the message and the footer together.
const MAX_MESSAGE_LENGTH = 280

type ShareButtonProps = {
  icon: React.ReactNode
  label: string
  onClick: () => void
  circleClassName: string
  labelClassName?: string
  tooltip?: string
}

function ShareButton({ icon, label, onClick, circleClassName, labelClassName, tooltip }: ShareButtonProps) {
  const button = (
    <button type="button" onClick={onClick} className="inline-flex flex-col items-center justify-self-center gap-2">
      <div className={`flex h-14 w-14 items-center justify-center rounded-full ${circleClassName}`}>{icon}</div>

      <span className={`text-xs font-medium ${labelClassName ?? "text-foreground"}`}>{label}</span>
    </button>
  )

  if (!tooltip) {
    return button
  }

  return <WithTooltip content={tooltip} side="top" tooltipTriggerClassnames="justify-self-center" trigger={button} />
}

export default function SharePage() {
  const { campaignId } = useParams<{ campaignId: string }>()
  const searchParams = useSearchParams()
  const userId = searchParams.get("userId")

  const { loggedInUserId, loggedInRole, isLoading: isLoggedInUserLoading } = useLoggedInUser()
  const isMobile = useIsMobile()

  const userIdToUse = loggedInRole === RolesEnum.PARENT ? userId : loggedInUserId

  const { data: campaign, isLoading: isCampaignLoading } = api.campaigns.getById.useQuery({
    id: campaignId,
  })

  const { data: user, isLoading: isUserLoading } = api.users.getById.useQuery(
    {
      id: userIdToUse!,
    },
    {
      enabled: !!userIdToUse,
    }
  )

  const { data: salesInfo, isLoading: isSalesLoading } =
    api.digitalSalesInformation.getByParticipantAndFundraiser.useQuery(
      {
        participantId: userIdToUse!,
        fundraiserId: campaignId,
      },
      {
        enabled: !!userIdToUse,
      }
    )

  const firstName = user?.firstName ?? ""

  const fundraiserBackHref = `/dashboard/campaigns/${campaignId}${userId ? `?userId=${userId}` : ""}`

  const defaultMessage = useMemo(
    () => `Support ${firstName}'s fundraiser! Purchase World's Finest Chocolate and help reach the fundraising goal.`,
    [firstName]
  )

  const [message, setMessage] = useState("")
  const [footer, setFooter] = useState(IN_PERSON_DELIVERY_FOOTER)

  const initialized = useRef(false)

  useEffect(() => {
    if (!initialized.current && firstName) {
      setMessage(defaultMessage)
      initialized.current = true
    }
  }, [firstName, defaultMessage])

  const [copyLabel, setCopyLabel] = useState("Copy link")
  const [qrOpen, setQrOpen] = useState(false)

  const characterCount = useMemo(() => message.length + footer.length, [message, footer])

  if (isCampaignLoading || isUserLoading || isLoggedInUserLoading || isSalesLoading) {
    return (
      <div className="flex flex-col gap-4 pb-12">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (!campaign || !user) return <NotFound />

  const shareSlug = salesInfo?.digitalSalesDetails?.enable_sales_page?.url ?? ""

  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/shop/${shareSlug}`

  const onCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)

      setCopyLabel("Copied!")

      setTimeout(() => {
        setCopyLabel("Copy link")
      }, 2000)
    } catch (error) {
      console.error(error)
    }
  }

  const onQrCode = () => {
    setQrOpen(true)
  }

  // Message, then the footer (if it has not been cleared), then the link.
  const buildShareText = () => [message.trim(), footer.trim(), shareUrl].filter(part => part.length > 0).join("\n\n")

  const onText = () => {
    const smsMessage = buildShareText()

    window.location.href = `sms:?body=${encodeURIComponent(smsMessage)}`
  }

  const onEmail = () => {
    const subject = `Support ${firstName}'s fundraiser`

    const body = buildShareText()

    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  const onFacebook = () => {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      "_blank",
      "noopener,noreferrer"
    )
  }

  const onX = () => {
    const text = buildShareText()

    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer")
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-2">
        <Link href={fundraiserBackHref} className="mt-1" aria-label="Back">
          <ChevronLeft />
        </Link>

        <div>
          <h2 className="text-2xl font-bold">Share {firstName}&apos;s Page</h2>

          <p className="text-sm text-muted-foreground">{shareUrl}</p>
        </div>
      </div>

      <div className="mx-auto flex w-full flex-col gap-6">
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Message</span>

              <span className="text-xs text-muted-foreground">
                {characterCount} / {MAX_MESSAGE_LENGTH}
              </span>
            </div>

            {/* One box made of two editable fields, so the footer stays at the bottom at any width. */}
            <div className="flex min-h-[11rem] flex-col rounded-control border border-input bg-background focus-within:border-[1.5px]">
              <Textarea
                aria-label="Message"
                value={message}
                onChange={e => setMessage(e.target.value)}
                maxLength={MAX_MESSAGE_LENGTH - footer.length}
                className="min-h-[7rem] flex-1 resize-none rounded-none border-0 focus-visible:border-0"
              />

              <Textarea
                aria-label="Footer"
                value={footer}
                onChange={e => setFooter(e.target.value)}
                rows={2}
                maxLength={MAX_MESSAGE_LENGTH - message.length}
                className="min-h-0 resize-none rounded-none border-0 pt-0 focus-visible:border-0"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Edit the message before sharing. The link is always included.</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Share Via</p>

              <div className="grid grid-cols-4 gap-y-6 sm:grid-cols-5 lg:grid-cols-6">
                <ShareButton
                  label={copyLabel}
                  labelClassName={copyLabel === "Copied!" ? "text-green-600" : "text-foreground"}
                  onClick={onCopyLink}
                  circleClassName="bg-[#FBF6EB]"
                  icon={<Copy className="h-6 w-6 text-muted-foreground" />}
                />

                <ShareButton
                  label="QR code"
                  onClick={onQrCode}
                  circleClassName="bg-[#F1EEE8]"
                  icon={<QrCode className="h-6 w-6" />}
                />

                <ShareButton
                  label="Text"
                  onClick={onText}
                  tooltip={isMobile ? undefined : TEXT_SHARE_TOOLTIP}
                  circleClassName="bg-green-50"
                  icon={<Smartphone className="h-6 w-6 text-green-600" />}
                />

                <ShareButton
                  label="Email"
                  onClick={onEmail}
                  circleClassName="bg-red-50"
                  icon={<Mail className="h-6 w-6 text-black-500" />}
                />

                <ShareButton
                  label="Facebook"
                  onClick={onFacebook}
                  circleClassName="bg-[#F1EEE8]"
                  icon={<Facebook className="h-6 w-6 text-blue-600" />}
                />

                <ShareButton
                  label="X"
                  onClick={onX}
                  circleClassName="bg-[#F1EEE8]"
                  icon={<span className="text-xl leading-none text-black">𝕏</span>}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <ShareQrDialog open={qrOpen} onOpenChange={setQrOpen} url={shareUrl} firstName={firstName} />
    </div>
  )
}
