"use client"

import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/trpc/react"

const MESSAGE_MAX_LENGTH = 280

const buildDefaultMessage = (firstName: string, fundraiserName: string, organizationName: string) => {
  const intro = firstName ? `I'm ${firstName} and I'm` : `I'm`
  return `Hi!\n\n${intro} raising money for ${fundraiserName} Fundraiser for ${organizationName}.`.slice(
    0,
    MESSAGE_MAX_LENGTH
  )
}

interface SalesPageMessageEditorProps {
  fundraiserId: string
  participantId: string
  participantFirstName: string
  fundraiserName: string
  initialMessage: string
  organizationName: string
  onBack: () => void
}

export function SalesPageMessageEditor({
  fundraiserId,
  participantId,
  participantFirstName,
  fundraiserName,
  initialMessage,
  organizationName,
  onBack,
}: SalesPageMessageEditorProps) {
  // Pre-fill a default message (with dynamic name + fundraiser) when none saved yet.
  const [message, setMessage] = useState(
    initialMessage || buildDefaultMessage(participantFirstName, fundraiserName, organizationName)
  )
  const utils = api.useUtils()

  const upsertMessage = api.digitalSalesInformation.upsertMessage.useMutation({
    onSuccess: async () => {
      await utils.digitalSalesInformation.getByParticipantAndFundraiser.invalidate({ participantId, fundraiserId })
      toast.success("Message Saved")
      onBack()
    },
    onError: () => toast.error("Something went wrong. Please try again."),
  })

  const trimmed = message.trim()
  const unchanged = trimmed === initialMessage.trim()
  const canSave = trimmed.length > 0 && trimmed.length <= MESSAGE_MAX_LENGTH && !unchanged && !upsertMessage.isPending

  const name = participantFirstName || "your participant"

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-card border bg-card p-4 shadow-elev-1">
        <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Message from {name}</div>
        <p className="mt-1 text-sm text-muted-foreground">
          Tell supporters what the fundraiser is for — keep it personal!
        </p>
        <Textarea
          className="mt-3 min-h-[120px]"
          maxLength={MESSAGE_MAX_LENGTH}
          value={message}
          onChange={event => setMessage(event.target.value)}
        />
        <div className="mt-1 text-right text-xs text-muted-foreground">
          {message.length} / {MESSAGE_MAX_LENGTH}
        </div>
      </div>

      <div className="rounded-card border bg-card p-4 shadow-elev-1">
        <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Preview</div>
        <div className="mt-2 flex items-start gap-3 rounded-control border-l-4 border-primary bg-creamy-50 p-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#ffa004] text-sm">
            🐱
          </span>
          <p className="whitespace-pre-wrap text-sm italic text-primary">
            {trimmed || "Your message preview will appear here."}
          </p>
        </div>
      </div>

      <div className="flex justify-center">
        <Button
          className="w-full sm:w-auto sm:px-10"
          disabled={!canSave}
          onClick={() => upsertMessage.mutate({ participantId, fundraiserId, message: trimmed })}
        >
          Save Message
        </Button>
      </div>
    </div>
  )
}
