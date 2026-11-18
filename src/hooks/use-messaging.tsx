import { type ConnectionState, ErrorInfo, type Message, type RealtimeChannel } from "ably"
import { useAbly } from "ably/react"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { useLocalStorage } from "usehooks-ts"

import { RolesEnum } from "@/constants/roles"
import { useLoggedInUser } from "@/hooks"
import { type Channel } from "@/server/db/schema/channels"
import { api } from "@/trpc/react"
import { type AblyMessagePayload } from "@/types/ably"

interface MessagingState {
  channelId: string
  lastReadCount: number
  lastTotalCount: number
  lastReadTimestamp: string
}

type MessagingStatesByChannelId = Record<string, MessagingState>

const INVALID_CONNECTION_STATES: ConnectionState[] = ["disconnected", "suspended", "closed", "failed"]

const USER_ROLES = [RolesEnum.PARTICIPANT, RolesEnum.PARENT]

const REFETCH_INTERVAL = 5 * 60 * 1000 // 5 minutes

export const useMessaging = () => {
  const client = useAbly()
  const utils = api.useUtils()
  const { isLoading, loggedInUserId, loggedInRole } = useLoggedInUser()

  const { mutateAsync: createChannelMessage } = api.channelMessages.create.useMutation()

  const isUserRole = USER_ROLES.includes(loggedInRole!)
  const { data: messagesCount } = isUserRole
    ? api.channelMessages.getCountFromUserId.useQuery(
        { userId: loggedInUserId ?? "", role: loggedInRole! },
        {
          enabled: !isLoading && !!loggedInUserId,
          refetchInterval: REFETCH_INTERVAL,
        }
      )
    : api.channelMessages.getCountFromMyOrgs.useQuery(
        { userId: loggedInUserId ?? "" },
        {
          enabled: !isLoading && !!loggedInUserId,
          refetchInterval: REFETCH_INTERVAL,
        }
      )

  const [messagingStatesByChannelId, setMessagingStatesByChannelId] = useLocalStorage<MessagingStatesByChannelId>(
    "messaging-states-by-channel-id",
    {}
  )
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false)
  const [isSendingMessage, setIsSendingMessage] = useState(false)

  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null)
  const [selectedChannelConnection, setSelectedChannelConnection] = useState<RealtimeChannel | null>(null)

  const checkUnreadMessages = () => {
    const unreadExists = Object.values(messagingStatesByChannelId).some(
      state => state.lastTotalCount > state.lastReadCount
    )
    setHasUnreadMessages(unreadExists)
  }

  const getMessagingStateByChannelId = (channelId: string) => {
    return messagingStatesByChannelId[channelId]
  }

  const updateMessagingStateByChannelId = (channelId: string, state: Partial<MessagingState>) => {
    setMessagingStatesByChannelId(prev => {
      const newState = { ...prev[channelId], ...state } as MessagingState
      return { ...prev, [channelId]: newState }
    })
  }

  const subscribeToChannel = (channel: Channel) => {
    if (!channel.id || checkInvalidConnection()) return
    if (selectedChannel?.id) unsubscribeFromChannel(selectedChannel)

    const channelConnection = client.channels.get(channel.id)
    channelConnection.unsubscribe("message")
    void channelConnection.subscribe("message", (message: Message) => {
      void onIncomingMessage(message)
    })

    setSelectedChannel(channel)
    setSelectedChannelConnection(channelConnection)

    void utils.channelMessages.getCountFromUserId.invalidate()
    void utils.channelMessages.getCountFromMyOrgs.invalidate()
  }

  const unsubscribeFromChannel = (channel: Channel) => {
    if (!channel.id || checkInvalidConnection()) return

    client.channels.get(channel.id).unsubscribe("message")
    setSelectedChannel(null)
    setSelectedChannelConnection(null)
  }

  const validateCanSendMessage = () => {
    if (!selectedChannel) {
      toast.error("Error sending message, no channel selected")
      return false
    }

    if (checkInvalidConnection()) {
      toast.error("Error sending message, please refresh the page or contact support")
      return false
    }

    return true
  }

  const checkInvalidConnection = () => {
    return INVALID_CONNECTION_STATES.includes(client.connection.state)
  }

  useEffect(() => {
    checkUnreadMessages()
  }, [])

  useEffect(() => {
    const handleConnectionClosed = () => {
      if (selectedChannel) unsubscribeFromChannel(selectedChannel)
      setSelectedChannel(null)
      setSelectedChannelConnection(null)
    }

    client.connection.on("closed", handleConnectionClosed)

    return () => {
      client.connection.off("closed", handleConnectionClosed)
    }
  }, [client])

  useEffect(() => {
    if (!messagesCount) return

    messagesCount.forEach(count => {
      updateMessagingStateByChannelId(count.channelId, {
        lastTotalCount: count.count,
        lastReadTimestamp: new Date().toISOString(),
      })
    })

    checkUnreadMessages()
  }, [messagesCount])

  const publishMessage = async (message: string, channelId: string) => {
    if (!validateCanSendMessage()) return

    if (selectedChannelConnection == null) {
      toast.error("Error sending message, channel not connected")
      return
    }

    try {
      setIsSendingMessage(true)

      await selectedChannelConnection.publish("message", { message, channelId, userId: loggedInUserId })

      setIsSendingMessage(false)
    } catch (error) {
      let errorMessage = "Message notification error"
      if (error instanceof Error) errorMessage = error.message
      if (error instanceof ErrorInfo) {
        if (error.code) errorMessage += ` - ${error.code}`
        if (error.cause && error.cause instanceof ErrorInfo) errorMessage += ` - ${error.cause.code}`
      }
      toast.error("Message notification error (" + errorMessage + ")")
    } finally {
      return
    }
  }

  const onIncomingMessage = async (message: Message) => {
    const messagePayload = message.data as AblyMessagePayload
    const { channelId, message: messageContent, userId } = messagePayload

    if (userId !== loggedInUserId) {
      void utils.channelMessages.getByChannelId.invalidate()
      await new Promise(resolve => setTimeout(resolve, 2000))
      void utils.channelMessages.getByChannelId.invalidate()
      return
    }

    try {
      await createChannelMessage({
        channelId: channelId,
        content: messageContent,
        userId: userId,
        ablyMessageId: message.id ?? "",
        ablyRawMessage: JSON.stringify(message),
        metadata: null,
      })
      void utils.channelMessages.getByChannelId.invalidate()

      //add +1 unread count if message is from different channel
      //this exist to give the user a faster feedback on new message, instead of waiting 60s for the next refresh
      if (channelId !== selectedChannel?.id || selectedChannel == null) {
        const messagingState = getMessagingStateByChannelId(channelId)
        updateMessagingStateByChannelId(channelId, {
          lastTotalCount: (messagingState?.lastTotalCount ?? 0) + 1,
          lastReadTimestamp: new Date().toISOString(),
        })
      }
    } catch (error) {
      toast.error("Error sending message, please try again (error: " + JSON.stringify(error, null, 2) + ")")
    }
  }

  return {
    getMessagingStateByChannelId,
    updateMessagingStateByChannelId,
    hasUnreadMessages,
    subscribeToChannel,
    unsubscribeFromChannel,
    isSendingMessage,
    setIsSendingMessage,
    selectedChannelConnection,
    setSelectedChannelConnection,
    selectedChannel,
    publishMessage,
  }
}
