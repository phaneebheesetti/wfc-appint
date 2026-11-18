"use client"

import { ArrowRight, CheckCircle2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { ROLES_DETAILS, RolesEnum } from "@/constants/roles"
import { useLoggedInUser } from "@/hooks/use-logged-in-user"
import { api } from "@/trpc/react"

import { SponsorSelectField } from "./sections/sponsor-select-field"

type Step5InviteOrgAdminProps = {
  organizationId: string
  campaignId: string
  // Current campaign sponsor — the invited org admin once Step 5 is done, or the FC placeholder before that.
  sponsorId?: string | null
  alreadyInvited: boolean
  onSavedAndContinue: () => Promise<void> | void
  onSkip: () => void
}

export function Step5InviteOrgAdmin({
  organizationId,
  campaignId,
  sponsorId,
  alreadyInvited,
  onSavedAndContinue,
  onSkip,
}: Step5InviteOrgAdminProps) {
  const { loggedInUserId } = useLoggedInUser()

  // Optimistic flag covers the window between mutation success and the parent's re-fetch landing.
  const [optimisticSent, setOptimisticSent] = useState(false)
  const [saving, setSaving] = useState(false)
  // Re-opens the selection UI for an already-saved sponsor so it can be changed (mirrors sibling steps).
  const [editing, setEditing] = useState(false)
  // Currently chosen member id — committed only when the user clicks Save & Continue.
  const [selectedValue, setSelectedValue] = useState("")
  const isInvited = alreadyInvited || optimisticSent

  const { mutateAsync: updateCampaign } = api.campaigns.update.useMutation()
  const { mutateAsync: setOnboardingStep } = api.users.setOnboardingStep.useMutation()

  // Existing org admins/staff who can be made sponsor without a fresh invite (mirrors the campaign form).
  const { data: members } = api.organizationsUsers.getAllMembers.useQuery({
    organizationId,
    roles: [RolesEnum.ORGANIZATION_ADMIN, RolesEnum.ORGANIZATION_STAFF],
  })

  // The sponsor to summarize: the just-saved selection during the optimistic window (before the parent's
  // refetch updates sponsorId), otherwise the committed sponsorId.
  const effectiveSponsorId = (optimisticSent ? selectedValue : "") || sponsorId

  // Resolve the summary details from the members list that already drives the dropdown — no extra
  // round-trip, so the summary shows instantly instead of waiting on refetch + a separate fetch.
  const sponsorFromMembers = members?.find(({ user }) => user?.id === effectiveSponsorId)?.user

  // Fallback fetch only when the sponsor isn't among the loaded members (e.g. members still loading).
  const { data: fetchedSponsor } = api.users.getById.useQuery(
    { id: effectiveSponsorId ?? "" },
    { enabled: !!effectiveSponsorId && isInvited && !sponsorFromMembers }
  )

  const sponsor = sponsorFromMembers ?? fetchedSponsor

  // Point the campaign at the chosen sponsor and record the onboarding step, then let the parent advance.
  const handleSave = async () => {
    if (!selectedValue) return
    setSaving(true)
    try {
      await updateCampaign({ id: campaignId, sponsorId: selectedValue })
      if (loggedInUserId) {
        await setOnboardingStep({
          userId: loggedInUserId,
          campaignId,
          step: "sponsorInviteSavedAt",
          savedAt: new Date().toISOString(),
        })
      }
      setOptimisticSent(true)
      toast.success("Administrator saved")
      setEditing(false)
      await onSavedAndContinue()
    } finally {
      setSaving(false)
    }
  }

  // Prefill the dropdown with the current sponsor so editing starts from the saved value.
  const handleEdit = () => {
    setSelectedValue(sponsorId ?? "")
    setEditing(true)
  }

  const handleCancelEdit = () => {
    setSelectedValue("")
    setEditing(false)
  }

  // Saved summary with Edit — shown once a sponsor is set and we're not actively editing.
  if (isInvited && !editing) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-card border border-green-200 bg-green-50 px-4 py-3 text-sm">
        <div className="flex min-w-0 items-center gap-3">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
          <div className="min-w-0 space-y-0.5 text-green-900">
            {sponsor?.email && (
              <div className="break-all">
                <span className="font-semibold">Email</span> - {sponsor.email}
              </div>
            )}
            {sponsor?.role && (
              <div>
                <span className="font-semibold">Role</span> - {ROLES_DETAILS[sponsor.role as RolesEnum]?.label}
              </div>
            )}
          </div>
        </div>
        <Button size="sm" variant="outline" className="shrink-0" onClick={handleEdit}>
          Edit
        </Button>
      </div>
    )
  }

  return (
    <div>
      <p className="mb-4 text-sm text-muted-foreground">Assign fundraiser management to an admin.</p>

      <SponsorSelectField organizationId={organizationId} value={selectedValue} onChange={setSelectedValue} />

      <div className="mt-5 flex items-center gap-3">
        <Button type="button" onClick={handleSave} disabled={!selectedValue || saving}>
          {saving ? "Saving..." : editing ? "Save Changes" : "Save & Continue"} <ArrowRight />
        </Button>
        {editing ? (
          <Button type="button" variant="ghost" onClick={handleCancelEdit} disabled={saving}>
            Cancel
          </Button>
        ) : (
          <Button type="button" variant="ghost" onClick={onSkip} disabled={saving}>
            Skip for now <ArrowRight />
          </Button>
        )}
      </div>
    </div>
  )
}
