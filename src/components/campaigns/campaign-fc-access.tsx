"use client"

import { CircleCheck, Clock, EyeIcon, EyeOffIcon, Info, LockKeyhole, ShieldCheck } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Modal } from "@/components/ui/modal"
import { Separator } from "@/components/ui/separator"
import { CampaignsStatusEnum } from "@/constants/campaigns"
import { RolesEnum } from "@/constants/roles"
import { type Campaign } from "@/server/db/schema"
import { api } from "@/trpc/react"
import { formatDate } from "@/utils/date"

const MAX_APPROVALS = 3

interface CampaignFcAccessProps {
  campaign: Campaign
}

export function CampaignFcAccess({ campaign }: CampaignFcAccessProps) {
  const [grantModalOpen, setGrantModalOpen] = useState(false)
  const [revokeModalOpen, setRevokeModalOpen] = useState(false)
  const [authorized, setAuthorized] = useState(false)

  const isClosed = campaign.status === CampaignsStatusEnum.ENDED || campaign.status === CampaignsStatusEnum.CANCELLED

  const utils = api.useUtils()

  const { data, isLoading } = api.participantNamesAccess.getStatus.useQuery(
    { campaignId: campaign.id },
    { enabled: !isClosed }
  )

  const grant = api.participantNamesAccess.grant.useMutation({
    onSuccess: async () => {
      toast.success("Participant name access granted")
      setGrantModalOpen(false)
      setAuthorized(false)
      await utils.participantNamesAccess.getStatus.invalidate({ campaignId: campaign.id })
    },
    onError: err => {
      toast.error(err.message)
    },
  })

  const revoke = api.participantNamesAccess.revoke.useMutation({
    onSuccess: async result => {
      // The service returns null when there was no live access to revoke (nothing changed).
      if (result) {
        toast.success("Participant name access revoked")
      } else {
        toast.info("There was no active access to revoke")
      }
      setRevokeModalOpen(false)
      await utils.participantNamesAccess.getStatus.invalidate({ campaignId: campaign.id })
    },
    onError: err => {
      toast.error(err.message)
    },
  })

  const usedSlots = data?.usedSlots ?? 0
  const isActive = data?.isGranted ?? false
  const currentSlotKey = usedSlots > 0 ? (String(usedSlots) as "1" | "2" | "3") : null
  const currentSlot = currentSlotKey ? data?.record?.accessDetails[currentSlotKey] : null

  // A WFC reset is only complete when the cycle has been closed (is_active=false) AND reset_details
  // are recorded. reset_details alone (while the cycle is still active) does not count as a reset.
  const hasBeenReset = !!data?.record?.resetDetails && data?.isActiveCycle === false
  const allSlotsUsed = usedSlots >= MAX_APPROVALS

  // After a reset the old row still has usedSlots=3; treat it as 0 for display until the first new grant.
  const isPostReset = hasBeenReset && allSlotsUsed && !isActive
  const displayedUsedSlots = isPostReset ? 0 : usedSlots
  const displayedSlotsRemaining = MAX_APPROVALS - displayedUsedSlots

  const nextSlot = displayedUsedSlots + 1
  // 4 weeks only for slot 1 when no row exists yet (first ever grant); post-reset cycles always use 2 weeks.
  const isFirstEverGrant = !data?.record
  const durationWeeks = isFirstEverGrant ? 4 : 2
  const expiryDate = new Date()
  expiryDate.setDate(expiryDate.getDate() + durationWeeks * 7)

  const hasFcAssigned =
    !!campaign.organization?.fundraisingConsultantUserId ||
    campaign.organization?.createdByUser?.role === RolesEnum.SALES_REPRESENTATIVE
  const canEnable = !isClosed && !isActive && !isLoading && hasFcAssigned && (!allSlotsUsed || hasBeenReset)

  // Dialog subtitle: "Org Name • Campaign Name" (falls back to just the campaign name if the org isn't loaded).
  const orgName = campaign.organization?.name
  const dialogSubtitle = orgName ? `${orgName} • ${campaign.name}` : campaign.name

  // All grants consumed and awaiting a WFC reset — we show the reset message instead of the generic
  // "No active access window" line so the two don't appear together.
  const allGrantsUsedNeedsReset = !isClosed && hasFcAssigned && allSlotsUsed && !hasBeenReset && !isActive

  return (
    <>
      <Separator />

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-violet-600" />
          <span className="font-medium text-sm">FC access to participant names</span>
        </div>

        <p className="text-sm text-muted-foreground">
          Participant names are hidden from WFC personnel by default. You may temporarily allow your assigned
          Fundraising Consultant to view names for troubleshooting and fundraiser support.
        </p>

        <div className="rounded-lg border bg-card p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Current status</span>
            {isClosed ? (
              <Badge variant="secondary">Fundraiser Closed</Badge>
            ) : isActive ? (
              <Badge variant="success">Active</Badge>
            ) : (
              <Badge variant="secondary">Disabled</Badge>
            )}
          </div>

          {isClosed ? (
            <p className="text-xs text-muted-foreground">
              This fundraiser is closed. Participant information is hidden from WFC personnel and temporary access can
              no longer be enabled.
            </p>
          ) : isActive && currentSlot?.expiry_date ? (
            <p className="text-xs text-muted-foreground">
              Expires {formatDate(new Date(currentSlot.expiry_date), { day: "numeric", month: "short" })}. Approvals
              used: {displayedUsedSlots} of {MAX_APPROVALS}.
            </p>
          ) : allGrantsUsedNeedsReset || !hasFcAssigned ? null : (
            <p className="text-xs text-muted-foreground">
              No active access window. Approvals used: {displayedUsedSlots} of {MAX_APPROVALS}.
            </p>
          )}

          {!isClosed && !hasFcAssigned && (
            <p className="text-xs text-muted-foreground">
              No Fundraising Consultant is assigned to this fundraiser. Access cannot be enabled until one is assigned.
            </p>
          )}

          {allGrantsUsedNeedsReset && (
            <p className="text-xs text-muted-foreground">
              All 3 access grants used. Contact your WFC representative for assistance.
            </p>
          )}

          {!isClosed && allGrantsUsedNeedsReset && (
            <Button variant="outline" size="sm" className="w-full mt-1" disabled>
              <LockKeyhole className="h-4 w-4" />
              No Grants Remaining
            </Button>
          )}

          {!isClosed && !allGrantsUsedNeedsReset && (hasFcAssigned || isActive) && (
            <Button
              variant={isActive ? "outline" : "outline"}
              size="sm"
              className="w-full mt-1"
              disabled={!canEnable && !isActive}
              onClick={() => (isActive ? setRevokeModalOpen(true) : setGrantModalOpen(true))}
            >
              {isActive ? (
                <>
                  <EyeOffIcon className="h-4 w-4" />
                  Revoke Access
                </>
              ) : (
                <>
                  <EyeIcon className="h-4 w-4" />
                  Enable Access
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Grant modal */}
      <Modal
        open={grantModalOpen}
        onOpenChange={open => {
          setGrantModalOpen(open)
          if (!open) setAuthorized(false)
        }}
        title="Confirm temporary access to participant names"
        description={dialogSubtitle}
        headerClassName="text-left"
        icon={ShieldCheck}
        iconClassName="text-violet-600"
        iconContainerClassName="h-10 w-10 rounded-xl bg-violet-100"
      >
        <div className="flex flex-col gap-4 pt-4">
          <div className="rounded-lg border bg-muted/30 p-4 flex flex-col gap-2">
            <p className="text-sm font-medium">How participant information will be used</p>
            <p className="text-sm text-muted-foreground">
              When enabled, your assigned Fundraising Consultant will be able to view participant names for this
              fundraiser. This access is granted solely to help resolve individual questions, issues, or discrepancies
              related to this specific fundraiser campaign.
            </p>
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">This information will never be used for</strong> sales outreach,
              marketing communications, prospecting, or any purpose unrelated to this fundraiser.
            </p>
            <p className="text-sm text-muted-foreground">
              Participant data is protected under our data handling agreement and will not be retained, shared, or
              transferred by the Fundraising Consultant beyond the scope of this fundraiser.
            </p>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-orange-200 bg-orange-50/20 p-4">
            <Clock className="h-4 w-4 text-orange-700 mt-0.5 shrink-0" />
            <p className="text-sm text-orange-800">
              <strong>Automatic expiry:</strong> Access will automatically terminate after {durationWeeks} weeks. You
              may disable access at any time.{" "}
              {displayedSlotsRemaining > 1 && `Extensions of 2 weeks are available if needed.`} A confirmation email
              will be sent when access is granted or revoked.
            </p>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-blue-100 bg-blue-50 p-3">
            <Info className="h-4 w-4 text-blue-700 mt-0.5 shrink-0" />
            <p className="text-sm text-blue-800">
              This will be approval {nextSlot} of {MAX_APPROVALS} for this fundraiser.
            </p>
          </div>

          <label className="flex items-start gap-3 rounded-lg border p-4 cursor-pointer">
            <Checkbox checked={authorized} onCheckedChange={v => setAuthorized(v === true)} className="mt-0.5" />
            <span className="text-sm">
              I authorize temporary access to Participant Information for the purpose of supporting this fundraiser. I
              represent that I have the authority of my Organization to grant this access and have obtained all
              necessary consents under applicable laws.
            </span>
          </label>

          <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-3">
            <CircleCheck className="h-4 w-4 text-green-700 mt-0.5 shrink-0" />
            <p className="text-sm text-green-800">
              Access window: {durationWeeks} weeks — will expire{" "}
              <strong>{formatDate(expiryDate, { day: "numeric", month: "short" })}</strong>.
            </p>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setGrantModalOpen(false)
                setAuthorized(false)
              }}
            >
              Cancel
            </Button>
            <Button disabled={!authorized || grant.isPending} onClick={() => grant.mutate({ campaignId: campaign.id })}>
              Allow Temporary Access
            </Button>
          </div>
        </div>
      </Modal>

      {/* Revoke modal */}
      <Modal
        open={revokeModalOpen}
        onOpenChange={setRevokeModalOpen}
        title="Turn off Fundraising Consultant access?"
        description={dialogSubtitle}
        headerClassName="text-left"
        icon={ShieldCheck}
        iconClassName="text-violet-600"
        iconContainerClassName="h-10 w-10 rounded-xl bg-violet-100"
      >
        <div className="flex flex-col gap-4 pt-4">
          <p className="text-sm text-muted-foreground">
            Access to participant names by your Fundraising Consultant will be revoked immediately. This may limit their
            ability to help troubleshoot participant-specific questions unless you grant access again.
          </p>

          {displayedSlotsRemaining === 0 ? (
            <p className="text-sm font-medium">
              You have no remaining access grants. Revoking now will require contacting your WFC representative to
              re-enable.
            </p>
          ) : (
            <p className="text-sm font-medium">
              You have {displayedSlotsRemaining} access {displayedSlotsRemaining === 1 ? "grant" : "grants"} remaining
              for this fundraiser.
            </p>
          )}

          <Separator />

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setRevokeModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={revoke.isPending}
              onClick={() => revoke.mutate({ campaignId: campaign.id })}
            >
              Revoke Access
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
