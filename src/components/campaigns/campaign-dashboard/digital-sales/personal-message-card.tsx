import { useRouter } from "next/navigation"

import { type DigitalSalesDetails } from "@/server/db/schema"
import { cn } from "@/utils/cn"

interface PersonalMessageCardProps {
  fundraiserId: string
  participantId: string
  details: DigitalSalesDetails
}

export function PersonalMessageCard({ fundraiserId, participantId, details }: PersonalMessageCardProps) {
  const router = useRouter()
  return (
    <div className="rounded-card border bg-card p-4 shadow-elev-1">
      <div className="mb-3 flex items-center justify-between">
        <div className="font-bold">Personal Message</div>
        <button
          type="button"
          className="font-bold"
          onClick={() =>
            router.push(`/dashboard/campaigns/${fundraiserId}/sales-page/edit-message?userId=${participantId}`)
          }
        >
          Edit
        </button>
      </div>
      <MessagePreview text={details.personal_message?.message} />
    </div>
  )
}

function MessagePreview({ text }: { text?: string }) {
  const isEmpty = !text
  return (
    <div className="flex items-start gap-3 rounded-control border-l-4 border-primary bg-creamy-50 p-3">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#ffa004]">🐱</span>
      <p className={cn("text-sm italic", isEmpty ? "text-muted-foreground" : "text-primary")}>
        {isEmpty ? "Not added yet" : `"${text}"`}
      </p>
    </div>
  )
}
