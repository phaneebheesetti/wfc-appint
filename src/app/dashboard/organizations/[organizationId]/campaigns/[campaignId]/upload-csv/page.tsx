"use client"

import { useParams } from "next/navigation"

import { CampaignsHeader } from "@/components/campaigns"
import { UsersUpload } from "@/components/users/users-upload"

export default function UploadCSVPage() {
  const { campaignId, organizationId } = useParams<{
    campaignId: string
    organizationId: string
  }>()

  return (
    <div className="flex flex-col gap-4">
      <CampaignsHeader
        campaignId={campaignId}
        organizationId={organizationId}
        goBackHref={`/dashboard/organizations/${organizationId}/campaigns/${campaignId}`}
      />
      <UsersUpload title="Upload CSV" organizationId={organizationId} campaignId={campaignId} />
    </div>
  )
}
