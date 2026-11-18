import { and, eq } from "drizzle-orm"

import { DocumentsTypeEnum } from "@/constants/documents"
import type { db } from "@/server/db"
import { documents } from "@/server/db/schema"

import { documentsUsersBuildReportRows } from "./documents-users-build-report-rows"

export const documentsUsersDownloadReportByCampaignId = async ({
  database,
  input,
  maskParticipantPii = false,
}: {
  database: typeof db
  input: { campaignId: string; timezone?: string }
  maskParticipantPii?: boolean
}) => {
  const campaignDocuments = await database.query.documents.findMany({
    where: and(eq(documents.campaignId, input.campaignId), eq(documents.type, DocumentsTypeEnum.PERMISSION_SLIP)),
    with: {
      documentsUsers: {
        with: {
          user: true,
        },
      },
    },
  })

  return documentsUsersBuildReportRows({
    documents: campaignDocuments,
    timezone: input.timezone,
    maskParticipantPii,
  })
}
