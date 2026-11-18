import { Trophy } from "lucide-react"

import { Modal } from "@/components/ui/modal"

import { PrizesForm } from "./prizes-form"

interface PrizesCreateProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  campaignId: string
  organizationId: string
}

export function PrizesCreate({ open, onOpenChange, campaignId, organizationId }: PrizesCreateProps) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Create Prize"
      description="Add a new prize that participants can unlock by reaching specific goals"
      icon={Trophy}
      iconClassName="text-yellow-500"
    >
      <PrizesForm campaignId={campaignId} organizationId={organizationId} onCreate={() => onOpenChange(false)} />
    </Modal>
  )
}
