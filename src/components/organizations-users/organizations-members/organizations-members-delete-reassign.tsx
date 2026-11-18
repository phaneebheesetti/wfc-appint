"use client"

import { AlertTriangle, User as UserIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { AlertDialogConfirm } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Modal } from "@/components/ui/modal"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CampaignsPermissionsEnum } from "@/constants/permissions"
import { RolesEnum } from "@/constants/roles"
import { useLoggedInUser } from "@/hooks"
import { type OrganizationUser } from "@/server/db/schema"
import { usePermissionsStore } from "@/stores"
import { api } from "@/trpc/react"
import { getUserDisplayName } from "@/utils/users"

import { OrganizationsMembersInviteForm } from "./organizations-members-invite-form"

// Sentinel select value that opens the invite popup instead of picking an existing member.
const INVITE_NEW = "new"

interface OrganizationsMembersDeleteReassignProps {
  organizationUser: OrganizationUser
  open: boolean
  onOpenChange: (open: boolean) => void
  onDelete?: () => void
}

/**
 * Dropdown of existing org members (filtered to `roles`, excluding the member being removed) plus an
 * "Invite Sponsor" option that opens the shared invite form. A freshly invited member is pre-selected.
 */
function MemberReassignSelect({
  organizationId,
  roles,
  excludeUserId,
  value,
  onChange,
  placeholder,
  inviteLabel,
  inviteDescription,
}: {
  organizationId: string
  roles: RolesEnum[]
  excludeUserId: string
  value: string | undefined
  onChange: (userId: string) => void
  placeholder: string
  inviteLabel: string
  inviteDescription: string
}) {
  const utils = api.useUtils()
  const [inviteOpen, setInviteOpen] = useState(false)

  const { data: members } = api.organizationsUsers.getAllMembers.useQuery({ organizationId, roles, activeOnly: true })

  const options = (members ?? []).filter(member => member.user?.id && member.user.id !== excludeUserId)

  const handleSelect = (selected: string) => {
    // "Invite Sponsor" only opens the popup; the real selection happens once the invite succeeds.
    if (selected === INVITE_NEW) {
      setInviteOpen(true)
      return
    }
    onChange(selected)
  }

  return (
    <>
      <Select value={value ?? ""} onValueChange={handleSelect}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={INVITE_NEW}>{inviteLabel}</SelectItem>
          {options.map(({ user }) =>
            user?.id ? (
              <SelectItem key={user.id} value={user.id}>
                {getUserDisplayName(user)}
              </SelectItem>
            ) : null
          )}
        </SelectContent>
      </Select>

      <Modal
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        title={inviteLabel}
        description={inviteDescription}
        icon={UserIcon}
        iconClassName="text-green-500"
      >
        <OrganizationsMembersInviteForm
          organizationId={organizationId}
          inviteRoles={roles}
          onCreate={async invited => {
            // Surface the freshly invited member in the dropdown and pre-select them.
            await utils.organizationsUsers.getAllMembers.invalidate()
            onChange(invited.id)
            setInviteOpen(false)
          }}
        />
      </Modal>
    </>
  )
}

/**
 * Delete/remove flow for an org member that first reassigns the references a removal would otherwise
 * orphan:
 *   1. the org's primary admin (organizations.adminUserId), when the member holds it — required
 *   2. each campaign the member sponsors in this org (campaigns.sponsorId is NOT NULL) — all required
 * When neither applies it degrades to a plain "remove from organization" confirmation.
 */
export function OrganizationsMembersDeleteReassign({
  organizationUser,
  open,
  onOpenChange,
  onDelete,
}: OrganizationsMembersDeleteReassignProps) {
  const utils = api.useUtils()
  const router = useRouter()
  const { loggedInUserId, loggedInRole } = useLoggedInUser()
  const getResourcePermissions = usePermissionsStore(state => state.getResourcePermissions)

  const organizationId = organizationUser.organizationId
  const userId = organizationUser.userId
  const memberName = getUserDisplayName(organizationUser.user)

  // A member removing their own membership check
  const isSelfRemoval = !!loggedInUserId && userId === loggedInUserId

  const [newAdminUserId, setNewAdminUserId] = useState<string | undefined>(undefined)
  const [sponsorSelections, setSponsorSelections] = useState<Record<string, string>>({})
  const [confirmOpen, setConfirmOpen] = useState(false)

  // Reset picks each time the popup opens so a previous, cancelled attempt doesn't leak in.
  useEffect(() => {
    if (open) {
      setNewAdminUserId(undefined)
      setSponsorSelections({})
      setConfirmOpen(false)
    }
  }, [open])

  const { data: organization, isLoading: isOrganizationLoading } = api.organizations.getById.useQuery(
    { id: organizationId },
    { enabled: open }
  )

  const { data: sponsoredCampaigns, isLoading: areCampaignsLoading } =
    api.campaigns.getCampaignsByUserIdWithSponsor.useQuery({ userId, organizationId }, { enabled: open })

  const { mutate: deleteWithReassign, isPending } = api.organizationsUsers.deleteWithReassign.useMutation({
    onSuccess: async () => {
      onOpenChange(false)
      await Promise.all([
        utils.organizations.getById.invalidate({ id: organizationId }),
        utils.organizationsUsers.getAdmin.invalidate({ organizationId }),
        utils.campaigns.getCampaignsByUserIdWithSponsor.invalidate({ userId, organizationId }),
      ])
      onDelete?.()

      // When members remove themselves, they're no longer part of this org — refresh the sidebar's
      // and navigate them to the organizations page.
      if (isSelfRemoval) {
        await utils.campaigns.getAllFromUserId.invalidate()
        router.push("/dashboard/organizations")
      }
    },
    onError: error => toast.error(error.message || "Failed to remove member"),
  })

  const isLoading = isOrganizationLoading || areCampaignsLoading
  const campaigns = sponsoredCampaigns ?? []
  const isPrimaryAdmin = !!organization && organization.adminUserId === userId
  const needsReassign = isPrimaryAdmin || campaigns.length > 0

  // Validating login user permsision to reassign sponsors (Org Admin role logged in user cannot reassign)
  const canReassignSponsor = loggedInRole
    ? getResourcePermissions(loggedInRole, CampaignsPermissionsEnum).canUpdate
    : false
  const sponsorReassignBlocked = campaigns.length > 0 && !canReassignSponsor

  const canConfirm =
    !isLoading &&
    !sponsorReassignBlocked &&
    (!isPrimaryAdmin || !!newAdminUserId) &&
    campaigns.every(campaign => !!sponsorSelections[campaign.id])

  const handleConfirm = () => {
    deleteWithReassign({
      id: organizationUser.id,
      organizationId,
      userId,
      newAdminUserId: isPrimaryAdmin ? newAdminUserId : undefined,
      campaignSponsorReassignments: campaigns.map(campaign => ({
        campaignId: campaign.id,
        newSponsorId: sponsorSelections[campaign.id]!,
      })),
      updatedByUserId: loggedInUserId ?? undefined,
    })
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Remove from organization"
      description={
        needsReassign
          ? `Reassign ${memberName}'s responsibilities before removing them from this organization.`
          : undefined
      }
      headerClassName="pr-12 text-left"
    >
      <div className="space-y-6 text-[#9a7d6a]">
        {isLoading ? (
          <p className="text-sm text-[#9a7d6a]">Checking this member&apos;s assignments…</p>
        ) : sponsorReassignBlocked ? (
          <div className="text-sm text-[#9a7d6a]">
            {memberName} sponsors {campaigns.length} campaign{campaigns.length > 1 ? "s" : ""} in this organization.
            <ul className="list-disc list-inside">
              {campaigns.map(campaign => (
                <li key={campaign.id}>{campaign.name}</li>
              ))}
            </ul>
            <div className="mt-4">
              Reach out to your Fundraising Consultant to reassign the sponsor before removing this member.
            </div>
          </div>
        ) : !needsReassign ? (
          <p className="text-sm">This action cannot be undone.</p>
        ) : (
          <>
            {isPrimaryAdmin && (
              <div className="space-y-2">
                <Label className="font-semibold text-[#6e3332]">
                  Reassign Organization Admin <span className="text-destructive">*</span>
                </Label>
                <p className="text-sm text-[#9a7d6a]">
                  {memberName} is this organization&apos;s admin. Choose a new organization admin.
                </p>
                <MemberReassignSelect
                  organizationId={organizationId}
                  roles={[RolesEnum.ORGANIZATION_ADMIN]}
                  excludeUserId={userId}
                  value={newAdminUserId}
                  onChange={setNewAdminUserId}
                  placeholder="Select an Organization Admin"
                  inviteLabel="Invite Organization Admin"
                  inviteDescription="Invite a new organization admin"
                />
              </div>
            )}

            {campaigns.length > 0 && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="font-semibold text-[#6e3332]">
                    Reassign Fundraiser Sponsor{campaigns.length > 1 ? "s" : ""}{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <p className="text-sm text-[#9a7d6a]">
                    {memberName} sponsors {campaigns.length} campaign{campaigns.length > 1 ? "s" : ""}. Choose a new
                    sponsor.
                  </p>
                </div>

                <div className="space-y-4">
                  {campaigns.map(campaign => (
                    <div key={campaign.id} className="space-y-1.5">
                      <Label className="text-sm font-normal text-[#6e3332]">{campaign.name}</Label>
                      <MemberReassignSelect
                        organizationId={organizationId}
                        roles={[RolesEnum.ORGANIZATION_ADMIN, RolesEnum.ORGANIZATION_STAFF]}
                        excludeUserId={userId}
                        value={sponsorSelections[campaign.id]}
                        onChange={sponsorId =>
                          setSponsorSelections(previous => ({ ...previous, [campaign.id]: sponsorId }))
                        }
                        placeholder="Select Sponsor"
                        inviteLabel="Invite Sponsor"
                        inviteDescription="Invite a sponsor to support this fundraiser and join your organization"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            {sponsorReassignBlocked ? "Close" : "Cancel"}
          </Button>
          {!sponsorReassignBlocked && (
            <Button
              variant="destructive"
              // The plain (no-reassign) case is already a "are you sure" prompt; the reassignment case gets a
              // final confirmation step once the required fields are filled.
              onClick={() => (needsReassign ? setConfirmOpen(true) : handleConfirm())}
              disabled={isLoading || !canConfirm || isPending}
            >
              {needsReassign ? (
                isPending ? (
                  "Submitting..."
                ) : (
                  "Submit"
                )
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4" />
                  {isPending ? "Removing..." : "Remove"}
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      <AlertDialogConfirm
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Remove from organization"
        description={`Reassignments will be applied and ${memberName} will be removed from this organization. This action cannot be undone.`}
        confirmText={isPending ? "Removing…" : "Remove"}
        isPending={isPending}
        onConfirm={e => {
          e.preventDefault()
          handleConfirm()
        }}
      />
    </Modal>
  )
}
