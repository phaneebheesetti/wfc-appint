import { eq } from "drizzle-orm"

import type { db } from "@/server/db"
import { documents } from "@/server/db/schema"

import { documentsUsersBuildReportRows } from "./documents-users-build-report-rows"

export const documentsUsersDownloadReportByDocumentId = async ({
  database,
  input,
  maskParticipantPii = false,
}: {
  database: typeof db
  input: { documentId: string; timezone?: string }
  maskParticipantPii?: boolean
}) => {
  const document = await database.query.documents.findFirst({
    where: eq(documents.id, input.documentId),
    with: {
      documentsUsers: {
        with: {
          user: true,
        },
      },
    },
  })

  return documentsUsersBuildReportRows({
    documents: document ? [document] : [],
    timezone: input.timezone,
    maskParticipantPii,
  })
}
