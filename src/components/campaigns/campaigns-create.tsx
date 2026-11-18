import { Megaphone } from "lucide-react"

import { Modal } from "@/components/ui/modal"

import { CampaignsForm } from "./campaigns-form"

interface CampaignsCreateProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationId: string
}

export function CampaignsCreate({ open, onOpenChange, organizationId }: CampaignsCreateProps) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Create Fundraiser"
      description="Start a new fundraiser for the organization"
      icon={Megaphone}
      iconClassName="text-green-500"
    >
      <CampaignsForm organizationId={organizationId} onCreate={() => onOpenChange(false)} />
    </Modal>
  )
}
