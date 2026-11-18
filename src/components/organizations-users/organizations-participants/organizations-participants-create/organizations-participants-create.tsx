"use client"

import { ArrowLeft, Users } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { OrganizationUsersForm } from "@/components/organizations-users"
import { Modal } from "@/components/ui/modal"
import { WithTooltip } from "@/components/ui/tooltip"
import { api } from "@/trpc/react"

import { ParticipantsCreateOptions } from "./organizations-participants-create-options"
import { OrganizationsParticipantsQrCode } from "./organizations-participants-qr-code"
import { OrganizationsParticipantsSelect } from "./organizations-participants-select"
import { OrganizationsParticipantsUploadCSV } from "./organizations-participants-upload-csv"
import { OrganizationsParticipantsUploadImage } from "./organizations-participants-upload-image"

export type ModalState = "options" | "existing" | "individual" | "upload-csv" | "upload-image" | "qr-code"

interface OrganizationsParticipantsCreateProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationId: string
  campaignId?: string
}

export function OrganizationsParticipantsCreate({
  open,
  onOpenChange,
  organizationId,
  campaignId,
}: OrganizationsParticipantsCreateProps) {
  const utils = api.useUtils()
  const [modalState, setModalState] = useState<ModalState>("options")

  const handleSubmit = async () => {
    toast.success("Participant added successfully")

    void utils.campaigns.getHeaderMetrics.invalidate()
    void utils.campaigns.getAnalyticsTotalCampaignProfit.invalidate()
    void utils.campaigns.getSmallCardsMetrics.invalidate()
    void utils.organizationsUsers.getAllParticipants.invalidate()
    void utils.campaignsUsers.listPaginatedByCampaignId.invalidate()
    void utils.campaignsUsers.listUserIdsByCampaignId.invalidate()

    onOpenChange(false)
  }

  const modalTitleByState: Record<ModalState, string> = {
    options: "Add participant(s)",
    existing: "Add existing participant",
    individual: "Add individual participant",
    "upload-csv": "Upload CSV",
    "upload-image": "Upload Image(s)",
    "qr-code": "Share QR Code",
  }

  const modalDescriptionByState: Record<ModalState, string> = {
    options: "Add participant(s) to the fundraiser using one of the options below",
    existing: "",
    individual: "",
    "upload-csv": "",
    "upload-image": "",
    "qr-code": "",
  }

  const modalContentByState: Record<ModalState, React.ReactNode> = {
    options: <ParticipantsCreateOptions setModalState={setModalState} campaignId={campaignId} />,
    existing: campaignId ? (
      <OrganizationsParticipantsSelect
        organizationId={organizationId}
        campaignId={campaignId}
        onSubmit={handleSubmit}
      />
    ) : null,
    individual: (
      <OrganizationUsersForm organizationId={organizationId} campaignId={campaignId} onCreate={handleSubmit} />
    ),
    "upload-csv": <OrganizationsParticipantsUploadCSV organizationId={organizationId} campaignId={campaignId} />,
    "upload-image": <OrganizationsParticipantsUploadImage organizationId={organizationId} campaignId={campaignId} />,
    "qr-code": <OrganizationsParticipantsQrCode organizationId={organizationId} campaignId={campaignId} />,
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={
        <div className="flex items-center gap-2">
          {modalState !== "options" && (
            <WithTooltip
              content="Back to options"
              side="top"
              trigger={<ArrowLeft className="w-4 h-4 cursor-pointer" onClick={() => setModalState("options")} />}
            />
          )}
          {modalTitleByState[modalState]}
        </div>
      }
      description={modalDescriptionByState[modalState]}
      icon={Users}
      iconClassName="text-green-500"
    >
      {modalContentByState[modalState]}
    </Modal>
  )
}
