import { and, eq } from "drizzle-orm"

import type { db } from "@/server/db"
import { digitalSalesInformation } from "@/server/db/schema"

export const digitalSalesInformationGetByParticipantAndFundraiser = async ({
  database,
  input,
}: {
  database: typeof db
  input: { participantId: string; fundraiserId: string }
}) => {
  const row = await database.query.digitalSalesInformation.findFirst({
    where: and(
      eq(digitalSalesInformation.participantId, input.participantId),
      eq(digitalSalesInformation.fundraiserId, input.fundraiserId)
    ),
  })
  // tRPC queries must not return `undefined` (React Query rejects it) — return
  // null when the participant has no sales-page row yet.
  return row ?? null
}
