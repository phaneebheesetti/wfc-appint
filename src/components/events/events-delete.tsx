import { toast } from "sonner"

import { AlertDialogConfirm } from "@/components/ui/alert-dialog"
import { type Event } from "@/server/db/schema"
import { api } from "@/trpc/react"

interface EventsDeleteProps {
  event: Event
  open: boolean
  onOpenChange: (open: boolean) => void
  onDelete?: () => void
}

export function EventsDelete({ event, open, onOpenChange, onDelete }: EventsDeleteProps) {
  const utils = api.useUtils()

  const { mutate: deleteEvent, isPending } = api.events.delete.useMutation({
    onSuccess: () => {
      onOpenChange(false)
      toast.success("Event deleted successfully")
      void utils.events.listByCampaignId.invalidate()
      onDelete?.()
    },
  })

  return (
    <AlertDialogConfirm
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={e => {
        e.preventDefault()
        deleteEvent({ id: event.id })
      }}
      title="Delete event"
      confirmText={isPending ? "Deleting..." : "Delete"}
      isPending={isPending}
    />
  )
}
