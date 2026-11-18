import { QueryCache, QueryClient, defaultShouldDehydrateQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import SuperJSON from "superjson"

import { USER_FRIENDLY_ERROR_MESSAGES } from "@/constants/errors"

export interface MutationError extends Error {
  shape?: { message: string; code: number }
  data?: { code: number; httpStatus: number; stack: string; path: string; zodError: unknown }
  meta?: { response: unknown }
  name: string
}

export const createQueryClient = () =>
  new QueryClient({
    queryCache: new QueryCache({
      onError: error => {
        toast.error(error.message || "An unexpected error occurred")
      },
    }),
    defaultOptions: {
      queries: {
        // With SSR, we usually want to set some default staleTime
        // above 0 to avoid refetching immediately on the client
        staleTime: 30 * 1000,
      },
      mutations: {
        onError: (error: MutationError) => {
          let errorMessage

          if (error instanceof Error) {
            errorMessage = error.message

            if (error.name === "TRPCClientError") {
              const errorKey =
                Object.keys(USER_FRIENDLY_ERROR_MESSAGES).find(key =>
                  String(error?.shape?.message ?? "").includes(key)
                ) ?? ""

              if (errorKey in USER_FRIENDLY_ERROR_MESSAGES) {
                errorMessage = USER_FRIENDLY_ERROR_MESSAGES[errorKey as keyof typeof USER_FRIENDLY_ERROR_MESSAGES]
              }
            }
          } else {
            errorMessage = String(error)
          }

          toast.error(errorMessage ?? "An unexpected error occurred")
        },
      },
      dehydrate: {
        serializeData: SuperJSON.serialize,
        shouldDehydrateQuery: query => defaultShouldDehydrateQuery(query) || query.state.status === "pending",
      },
      hydrate: {
        deserializeData: SuperJSON.deserialize,
      },
    },
  })
