import { type ChannelMessage } from "@/server/db/schema/channel-messages"
import { cn } from "@/utils/cn"
import { formatDate, formatTime } from "@/utils/date"

interface ChatBubblesProps {
  message: ChannelMessage
  currentUserId?: string
  relativeUserIds?: string[]
}

export const ChatBubbles = ({ message, currentUserId, relativeUserIds }: ChatBubblesProps) => {
  const isCurrentUser = message.userId === currentUserId
  const isRelativeUser = relativeUserIds?.includes(message.userId)

  let messageDateTime = formatTime(message.createdAt)
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (message.createdAt <= yesterday) {
    messageDateTime = formatDate(message.createdAt) + " at " + formatTime(message.createdAt)
  }

  return (
    <div className={cn("flex flex-col", isCurrentUser ? "items-end" : "items-start")}>
      <div
        className={cn(
          "flex gap-2 min-w-32 max-w-[80%] rounded-md px-3 py-2 bg-gray-200",
          isCurrentUser && "bg-gray-700",
          isRelativeUser && "bg-blue-100"
        )}
      >
        <div
          dangerouslySetInnerHTML={{ __html: message.content ?? "" }}
          className={cn("prose", isCurrentUser && "prose-invert")}
        />
        <div className={cn("self-end text-[10px] text-gray-500 pb-1", isCurrentUser && "text-gray-300")}>
          {messageDateTime}
        </div>
      </div>

      <i className={cn("self-start text-[10px] text-gray-500 pt-1", isCurrentUser && "self-end")}>
        {message.user?.fullName}
      </i>
    </div>
  )
}
