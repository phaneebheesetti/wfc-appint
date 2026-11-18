"use client"

import { useUser } from "@clerk/nextjs"
import { useEffect, useRef } from "react"

import { useClerkRolesSync } from "@/hooks"
import { api } from "@/trpc/react"

export function EnsureClerkMetadata() {
  const { user, isLoaded, isSignedIn } = useUser()
  const utils = api.useUtils()
  const hasRunRef = useRef(false)

  useClerkRolesSync()

  useEffect(() => {
    if (!isLoaded || !isSignedIn || hasRunRef.current) return
    hasRunRef.current = true

    utils.users.ensureClerkMetadata
      .fetch()
      .then(result => {
        if (result.backfilled) {
          void user?.reload()
        }
      })
      .catch(() => {
        // Best-effort; failures shouldn't block the app
      })
  }, [isLoaded, isSignedIn, user, utils.users.ensureClerkMetadata])

  return null
}
