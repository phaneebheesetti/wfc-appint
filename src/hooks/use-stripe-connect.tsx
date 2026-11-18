"use client"

import { type StripeConnectInstance } from "@stripe/connect-js"
import { loadConnectAndInitialize } from "@stripe/connect-js/pure"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { env } from "@/env"

interface UseStripeConnectProps {
  stripeAccountId: string
  enablePayouts?: boolean
}

export const useStripeConnect = ({ stripeAccountId, enablePayouts = false }: UseStripeConnectProps) => {
  const [stripeConnectInstance, setStripeConnectInstance] = useState<StripeConnectInstance | null>(null)
  const initializingRef = useRef(false)

  const fetchClientSecret = useCallback(async () => {
    const response = await fetch("/api/stripe/account-session", {
      method: "POST",
      body: JSON.stringify({ stripeAccountId, enablePayouts }),
    })

    if (!response.ok) {
      const { error } = (await response.json()) as { error: string }

      toast.error(error)

      return ""
    }

    const json = (await response.json()) as { data: { client_secret: string } }

    return json.data.client_secret
  }, [stripeAccountId, enablePayouts])

  useEffect(() => {
    if (stripeConnectInstance) {
      stripeConnectInstance.update({
        appearance: { overlays: "dialog" },
        locale: "en-US",
      })
    } else if (!initializingRef.current) {
      initializingRef.current = true

      const initializeStripeConnect = async () => {
        const instance = await loadConnectAndInitialize({
          publishableKey: env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY,
          appearance: { overlays: "dialog" },
          locale: "en-US",
          fetchClientSecret,
        })

        setStripeConnectInstance(instance)
      }

      initializeStripeConnect()
    }
  }, [stripeAccountId, fetchClientSecret, stripeConnectInstance])

  return { stripeConnectInstance }
}
