import { ChevronRight, User } from "lucide-react"
import { stripHtml } from "string-strip-html"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { type Channel } from "@/server/db/schema/channels"
import { api } from "@/trpc/react"

export interface ChannelListItemProps {
  onSelect: (channel: Channel) => void
  channel: Channel
}
export interface ExtendedChannelListItemProps extends ChannelListItemProps {
  unreadCount: number
  hasUnreadMessages: boolean
}

export const ChannelListItem = ({
  onSelect,
  channel,
  unreadCount,
  hasUnreadMessages,
}: ExtendedChannelListItemProps) => {
  const { data: lastMessage, isLoading } = api.channelMessages.getLastMessage.useQuery({ channelId: channel.id })

  return (
    <div className="relative border rounded-control flex items-center w-full px-4 py-3">
      <div className="flex items-center gap-2 flex-1 min-w-0 text-left">
        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
          <User className="w-6 h-6 text-gray-500" />
        </div>

        <div className="flex flex-col">
          <div className="font-medium text-base text-gray-900 truncate">{channel.name}</div>

          {isLoading ? (
            <Skeleton className="h-5 w-32" />
          ) : (
            <div
              className={`text-sm text-gray-500 max-w-[150px] md:max-w-[300px] truncate ${hasUnreadMessages ? "font-medium" : ""}`}
            >
              {stripHtml(lastMessage?.content ?? "").result}
            </div>
          )}
        </div>
      </div>

      {unreadCount > 0 && (
        <Badge
          variant="error"
          className="absolute -right-2 -top-2 text-white bg-red-500 h-5 w-5 flex items-center justify-center"
        >
          {unreadCount}
        </Badge>
      )}

      <Button variant="secondary" onClick={() => onSelect(channel)}>
        {hasUnreadMessages ? "Reply" : "View"}
        <ChevronRight />
      </Button>

      {hasUnreadMessages && (
        //this is abosulte and no content on purpose to trigger a new render
        <div className="absolute w-2 h-2 " />
      )}
    </div>
  )
}
