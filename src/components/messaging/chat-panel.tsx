import { ChevronLeft, Send, User } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { WithTooltip } from "@/components/ui/tooltip"
import { type ChannelMessage } from "@/server/db/schema/channel-messages"
import { type Channel } from "@/server/db/schema/channels"

import { ChatBubbles } from "./chat-bubbles"

export interface ChatPanelProps {
  messages: ChannelMessage[]
  onBack: () => void
  onSendMessage: (message: string, onSendMessageSuccess: () => void) => void
  disabled: boolean
  selectedChannel: Channel | null
  currentUserId: string | undefined
  relativeUserIds: string[]
}

export const ChatPanel = ({
  messages,
  onBack,
  onSendMessage,
  disabled,
  selectedChannel,
  currentUserId,
  relativeUserIds,
}: ChatPanelProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "auto" })
    }
  }, [messages])

  const onSendMessageSuccess = () => {
    setMessage("")
    inputRef.current?.focus()
  }

  const doSendMessage = async () => {
    if (message.length === 0) {
      toast.error("Message cannot be empty", {
        position: "bottom-right",
      })
      return
    }

    onSendMessage(message, onSendMessageSuccess)
  }

  return (
    <div className="flex flex-col flex-1 w-full h-full">
      {/* Chat Header */}
      <div className="flex gap-2 items-center pb-3 border-b border-gray-100">
        <WithTooltip
          content="Go back to your messages"
          side="top"
          trigger={
            <button onClick={onBack} className="focus:outline-none">
              <ChevronLeft className="w-6 h-6 text-gray-500" />
            </button>
          }
        />

        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
          <User className="w-6 h-6 text-gray-500" />
        </div>
        <span className="font-semibold text-lg text-gray-900">{selectedChannel?.name ?? "Unknown Channel"}</span>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-0 pt-4 space-y-4  mb-0 bg-gray-50/50">
        {messages.length === 0 && (
          <div className="text-sm text-center text-muted-foreground">
            <p>No messages yet</p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <ChatBubbles key={idx} message={msg} currentUserId={currentUserId} relativeUserIds={relativeUserIds} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <div className="pt-3 flex items-center bg-white border-t border-gray-100 rounded-b-lg">
        <input
          ref={inputRef}
          type="text"
          placeholder="Message..."
          className="h-10 flex-1 text-sm bg-gray-50 rounded-control px-4 py-2 border border-gray-200 focus:outline-none"
          value={message}
          onChange={e => setMessage(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              void doSendMessage()
            }
          }}
          disabled={disabled}
        />

        <Button
          className="ml-2 w-24 h-10 rounded-control flex items-center justify-center"
          onClick={doSendMessage}
          disabled={disabled || message.length === 0}
        >
          <Send className="w-4 h-4 text-white" />
          Send
        </Button>
      </div>
    </div>
  )
}
