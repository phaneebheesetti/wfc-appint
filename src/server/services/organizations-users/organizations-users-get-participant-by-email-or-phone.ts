import type { db } from "@/server/db"

import { organizationsUsersGetParticipantsByEmailOrPhone } from "./organizations-users-get-participants-by-email-or-phone"

export const organizationsUsersGetParticipantByEmailOrPhone = async ({
  database,
  input,
}: {
  database: typeof db
  input: { organizationId: string; email?: string; phone?: string }
}) => {
  const participants = await organizationsUsersGetParticipantsByEmailOrPhone({
    database,
    input: {
      organizationId: input.organizationId,
      emails: input.email ? [input.email] : [],
      phones: input.phone ? [input.phone] : [],
    },
  })
  return participants?.[0] ?? null
}
