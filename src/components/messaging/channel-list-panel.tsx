import { Skeleton } from "@/components/ui/skeleton"
import { useMessaging } from "@/hooks"
import { type Channel } from "@/server/db/schema/channels"

import { ChannelListItem } from "./channel-list-item"

export interface ChannelListPanelProps {
  isLoading: boolean
  onSelectChannel: (channel: Channel) => void
  channels: Channel[]
}

export const ChannelListPanel = ({ isLoading, onSelectChannel, channels }: ChannelListPanelProps) => {
  const { hasUnreadMessages, getMessagingStateByChannelId } = useMessaging()

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 flex-1 w-full h-full">
        <Skeleton className="h-16 w-100" />
      </div>
    )
  }

  if (channels.length === 0) {
    return (
      <div className="flex flex-col gap-2 flex-1 w-full h-full text-sm text-muted-foreground">No messages found</div>
    )
  }

  return (
    <div className="flex-1 w-full flex flex-col gap-2">
      {channels.map((channel, idx) => {
        const messagingState = getMessagingStateByChannelId(channel.id)

        return (
          <ChannelListItem
            key={idx}
            onSelect={onSelectChannel}
            channel={channel}
            unreadCount={Number(messagingState?.lastTotalCount) - Number(messagingState?.lastReadCount)}
            hasUnreadMessages={hasUnreadMessages}
          />
        )
      })}
    </div>
  )
}
