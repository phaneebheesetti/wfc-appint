"use client"

import { Megaphone } from "lucide-react"
import { useMemo, useState } from "react"

import { DataTable } from "@/components/data-table"
import { CampaignsVisibilityEnum } from "@/constants/campaigns"
import { CampaignsPermissionsEnum } from "@/constants/permissions"
import { useLoggedInUser } from "@/hooks"
import type { Campaign } from "@/server/db/schema"
import { usePermissionsStore } from "@/stores/permissions-store"
import { api } from "@/trpc/react"
import { getUserDisplayName } from "@/utils/users"

import { CampaignsActions } from "./campaigns-actions"
import { CampaignsDelete } from "./campaigns-delete"
import { campaignsListColumns } from "./campaigns-list-columns"
import { CampaignsCreateWizard } from "./create-fundraiser-wizard/campaigns-create-wizard"

interface CampaignsListProps {
  organizationId: string
}

export function CampaignsList({ organizationId }: CampaignsListProps) {
  const utils = api.useUtils()
  const { loggedInRole: role, loggedInUserId: userId } = useLoggedInUser()
  const getResourcePermissions = usePermissionsStore(state => state.getResourcePermissions)

  const [createCampaign, setCreateCampaign] = useState<boolean>(false)
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [deleteCampaign, setDeleteCampaign] = useState<Campaign | null>(null)
  const [editDraftCampaign, setEditDraftCampaign] = useState<Campaign | null>(null)
  const { data: campaigns, isLoading } = api.campaigns.getByOrganizationId.useQuery(
    {
      organizationId,
      userId: userId ?? "",
    },
    { enabled: !!userId }
  )

  const sponsorOptions = useMemo(
    () =>
      (campaigns ?? [])
        .filter(campaign => campaign.sponsor?.fullName)
        .map(campaign => ({
          label: getUserDisplayName(campaign.sponsor),
          value: campaign.sponsor?.fullName ?? "",
        })),
    [campaigns]
  )

  const onEditDraftCampaign = (campaign: Campaign) => {
    setEditDraftCampaign(campaign) // Edit draft campaign
  }

  const onClickOfActions = (campaign: Campaign) => {
    if (campaign.visibility === CampaignsVisibilityEnum.DRAFT) {
      setDeleteCampaign(campaign) // Delete action for draft campaign
    } else {
      setSelectedCampaign(campaign)
    }
  }

  const columns = useMemo(
    () => campaignsListColumns({ onClick: onClickOfActions, sponsorOptions, onClickOfViewDraft: onEditDraftCampaign }),
    [setSelectedCampaign, sponsorOptions, setDeleteCampaign]
  )

  if (!role) return null

  const { canCreate } = getResourcePermissions(role, CampaignsPermissionsEnum)

  return (
    <>
      <DataTable
        data={campaigns ?? []}
        emptyState={{
          title: "Launch A Fundraiser",
          description:
            "Add a fundraiser to begin organizing the details your team needs to launch, manage, and track success with confidence.",
          icon: Megaphone,
          proTip:
            "Setting up your fundraiser will take about 20 minutes. You can invite an admin to help once you get started.",
          searchTitle: "No Fundraisers",
        }}
        newButton={
          canCreate
            ? {
                text: "Add Fundraiser",
                onClick: () => setCreateCampaign(true),
              }
            : undefined
        }
        loading={isLoading}
        columns={columns}
        multiColumnFilter={{
          columns: [{ accessorKey: "name", name: "Name" }],
        }}
      />

      {/* Create Campaign */}
      {createCampaign && (
        <CampaignsCreateWizard
          open={createCampaign}
          onOpenChange={(flag: boolean) => {
            setCreateCampaign(false)
            if (!flag) {
              void utils.campaigns.invalidate()
            }
          }}
          organizationId={organizationId}
          isEdit={false}
        />
      )}

      {/* Edit Draft Campaign */}
      {!!editDraftCampaign && (
        <CampaignsCreateWizard
          open={!!editDraftCampaign}
          onOpenChange={(flag: boolean) => {
            setEditDraftCampaign(null)
            if (!flag) {
              void utils.campaigns.invalidate()
            }
          }}
          organizationId={organizationId}
          isEdit={true}
          campaign={editDraftCampaign}
        />
      )}

      {selectedCampaign && (
        <CampaignsActions
          organizationId={organizationId}
          campaign={selectedCampaign}
          open={!!selectedCampaign}
          onOpenChange={() => setSelectedCampaign(null)}
        />
      )}

      {/* Delete draft campaigns */}
      {deleteCampaign && (
        <CampaignsDelete
          organizationId={organizationId}
          campaign={deleteCampaign}
          open={true}
          onOpenChange={() => {
            setSelectedCampaign(null)
            setDeleteCampaign(null)
            void utils.campaigns.invalidate()
          }}
        />
      )}
    </>
  )
}
