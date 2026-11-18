import * as Ably from "ably"

import { env } from "@/env"

let ablyInstance: Ably.Realtime | null = null
let currentClientId: string | null = null

export function getAblyInstance(clientId?: string | null) {
  if (ablyInstance && clientId && currentClientId !== clientId) {
    ablyInstance.close()
    ablyInstance = null
  }

  if (!ablyInstance) {
    ablyInstance = new Ably.Realtime({
      key: env.NEXT_PUBLIC_ABLY_API_KEY,
      autoConnect: false,
      closeOnUnload: true,
      ...(clientId && { clientId }),
    })
    currentClientId = clientId ?? null
  }

  return ablyInstance
}
