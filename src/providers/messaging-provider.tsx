"use client"

import { AblyProvider } from "ably/react"
import { useEffect, useMemo } from "react"

import { useLoggedInUser } from "@/hooks"
import { getAblyInstance } from "@/lib/ably"

interface MessagingProviderProps {
  children: React.ReactNode
}

export function MessagingProvider({ children }: MessagingProviderProps) {
  const { loggedInUserId } = useLoggedInUser()

  const ablyRealtimeClient = useMemo(() => getAblyInstance(loggedInUserId), [loggedInUserId])

  useEffect(() => {
    if (loggedInUserId) {
      ablyRealtimeClient.connect()
    }

    return () => {
      ablyRealtimeClient.close()
    }
  }, [loggedInUserId, ablyRealtimeClient])

  return <AblyProvider client={ablyRealtimeClient}>{children}</AblyProvider>
}
