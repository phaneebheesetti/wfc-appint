import { auth } from "@clerk/nextjs/server"
import { createHydrationHelpers } from "@trpc/react-query/rsc"
import { cookies as nextCookies, headers as nextHeaders } from "next/headers"
import { cache } from "react"
import "server-only"

import { type RolesEnum } from "@/constants/roles"
import { env } from "@/env"
import { ROLE_SESSION_COOKIE_NAME, resolveActiveRole } from "@/lib/role-session"
import { createTRPCContext } from "@/server/api/core"
import { type AppRouter, createCaller } from "@/server/api/root"

import { createQueryClient } from "./query-client"

/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a tRPC call from a React Server Component.
 */
const createContext = cache(async () => {
  const clerkSession = await auth()

  const headers = new Headers(await nextHeaders())
  headers.set("x-trpc-source", "rsc")

  const cookieStore = await nextCookies()
  const { role } = await resolveActiveRole({
    cookieValue: cookieStore.get(ROLE_SESSION_COOKIE_NAME)?.value,
    clerkId: clerkSession.userId,
    fallbackRole: clerkSession.sessionClaims?.user_role as RolesEnum | undefined,
    fallbackDatabaseId: clerkSession.sessionClaims?.user_id,
    secret: env.ROLE_SESSION_SECRET,
  })

  return createTRPCContext({
    headers,
    userId: clerkSession.sessionClaims?.user_id,
    userRole: role,
  })
})

const getQueryClient = cache(createQueryClient)
const caller = createCaller(createContext)

export const { trpc: api, HydrateClient } = createHydrationHelpers<AppRouter>(caller, getQueryClient)
