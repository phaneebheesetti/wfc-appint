import { Calendar } from "lucide-react"

import { Modal } from "@/components/ui/modal"
import { api } from "@/trpc/react"

import { EventsForm } from "./events-form"

interface EventsCreateProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  campaignId: string
  organizationId: string
}

export function EventsCreate({ open, onOpenChange, campaignId, organizationId }: EventsCreateProps) {
  const utils = api.useUtils()

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Create Event"
      description="Schedule a new event for fundraiser participants"
      icon={Calendar}
      iconClassName="text-yellow-500"
    >
      <EventsForm
        campaignId={campaignId}
        organizationId={organizationId}
        onCreate={() => {
          onOpenChange(false)
          void utils.events.listByCampaignId.invalidate()
        }}
      />
    </Modal>
  )
}
