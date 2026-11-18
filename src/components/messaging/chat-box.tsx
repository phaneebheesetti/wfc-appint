import { useEffect, useState } from "react"

import { RolesEnum } from "@/constants/roles"
import { useLoggedInUser } from "@/hooks"
import { useMessaging } from "@/hooks/use-messaging"
import { type Channel } from "@/server/db/schema/channels"
import { api } from "@/trpc/react"

import { ChannelListPanel } from "./channel-list-panel"
import { ChatPanel } from "./chat-panel"

const ORGANIZATION_MEMBERS_ROLES = [
  RolesEnum.SALES_REPRESENTATIVE,
  RolesEnum.SALES_MANAGER,
  RolesEnum.ORGANIZATION_ADMIN,
  RolesEnum.ORGANIZATION_STAFF,
]

export const Chatbox = () => {
  const { loggedInUserId, loggedInRole } = useLoggedInUser()
  const {
    selectedChannel,
    isSendingMessage,
    subscribeToChannel,
    publishMessage,
    getMessagingStateByChannelId,
    updateMessagingStateByChannelId,
  } = useMessaging()

  const [panel, setPanel] = useState<"list" | "chat">("list")
  const [sendSuccessCallback, setSendSuccessCallback] = useState<(() => void) | null>(null)

  const { data: currentUser } = api.users.getById.useQuery({ id: loggedInUserId! }, { enabled: !!loggedInUserId })

  const { data: childrenUsers } = api.users.listByParentId.useQuery(
    { parentId: loggedInUserId! },
    { enabled: !!loggedInUserId && loggedInRole === RolesEnum.PARENT }
  )

  const childrenIds = childrenUsers?.map(user => user.id) ?? []
  const parentsIds = currentUser?.parentUserId ? [currentUser.parentUserId] : []
  const relativeUserIds = loggedInRole === RolesEnum.PARENT ? childrenIds : parentsIds

  const { data: orgChannels = [], isLoading: isLoadingOrgChannels } = api.channels.listFromMyOrgs.useQuery(
    { userId: loggedInUserId ?? "" },
    { enabled: !!loggedInUserId }
  )

  const { data: participantChannels = [], isLoading: isLoadingParticipantChannels } =
    api.channels.listByUserId.useQuery(
      { userId: loggedInUserId ?? "" },
      { enabled: !!loggedInUserId && loggedInRole === RolesEnum.PARTICIPANT }
    )

  const { data: parentChannels = [], isLoading: isLoadingParentChannels } = api.channels.listFromParent.useQuery(
    { userId: loggedInUserId ?? "", loggedInRole: loggedInRole! },
    { enabled: !!loggedInUserId && loggedInRole === RolesEnum.PARENT }
  )

  let userChannels = participantChannels ?? []

  if (loggedInRole === RolesEnum.PARENT) {
    userChannels = parentChannels ?? []
  } else if (loggedInRole === RolesEnum.PARTICIPANT) {
    userChannels = participantChannels ?? []
  }

  // loads the current channel messages, and will update when new messages are exchanged
  const { data: channelMessages } = api.channelMessages.getByChannelId.useQuery(
    { channelId: selectedChannel?.id ?? "" },
    {
      enabled: !!loggedInUserId && selectedChannel != null,
    }
  )

  useEffect(() => {
    // update the total count of the current channel when the user loads a channel and subscribes to it
    // this updates nearly realtime when they are currently chatting in the channel
    if (selectedChannel) {
      const lastTotalCount = channelMessages?.length ?? 0

      updateMessagingStateByChannelId(selectedChannel.id, {
        lastTotalCount,
        lastReadTimestamp: new Date().toISOString(),
      })

      if (panel == "chat") {
        updateMessagingStateByChannelId(selectedChannel.id, {
          lastReadCount: lastTotalCount,
          lastReadTimestamp: new Date().toISOString(),
        })
      }
    }
  }, [channelMessages, selectedChannel, panel])

  const isLoadingChannels = isLoadingOrgChannels || isLoadingParticipantChannels || isLoadingParentChannels
  const channels = ORGANIZATION_MEMBERS_ROLES.includes(loggedInRole!) ? orgChannels : userChannels

  const onSendMessage = async (message: string, onSendMessageSuccess: () => void) => {
    //@ts-expect-error selectedChannel is not null (validateCanSendMessage)
    await publishMessage(message, selectedChannel.id)
    setSendSuccessCallback(() => onSendMessageSuccess)

    return
  }

  useEffect(() => {
    if (sendSuccessCallback) {
      sendSuccessCallback()
      setSendSuccessCallback(null)
    }
  }, [sendSuccessCallback])

  const onSelectChannel = (channel: Channel) => {
    setPanel("chat")

    subscribeToChannel(channel)

    const messagingState = getMessagingStateByChannelId(channel.id)
    updateMessagingStateByChannelId(channel.id, {
      lastReadCount: messagingState?.lastTotalCount ?? 0,
      lastReadTimestamp: new Date().toISOString(),
    })
  }

  return (
    <div className="flex flex-col w-full h-full min-h-0 flex-1">
      {panel === "list" && (
        <ChannelListPanel isLoading={isLoadingChannels} onSelectChannel={onSelectChannel} channels={channels ?? []} />
      )}

      {panel === "chat" && (
        <ChatPanel
          messages={channelMessages ?? []}
          onBack={() => setPanel("list")}
          onSendMessage={onSendMessage}
          disabled={isSendingMessage}
          selectedChannel={selectedChannel}
          currentUserId={loggedInUserId}
          relativeUserIds={relativeUserIds ?? []}
        />
      )}
    </div>
  )
}
