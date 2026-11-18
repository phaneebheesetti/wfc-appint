import { and, eq, inArray } from "drizzle-orm"

import { DocumentsTypeEnum } from "@/constants/documents"
import { DocumentsUsersStatusEnum } from "@/constants/documents-users"
import { type db } from "@/server/db"
import { campaignsUsers } from "@/server/db/schema"
import { documents, documentsUsers } from "@/server/db/schema"

export const campaignsUsersSignManyPermissionSlip = async ({
  database,
  input,
}: {
  database: typeof db
  input: { ids: string[]; campaignId: string }
}) => {
  const ids = input.ids ?? []
  const [updatedCampaignUsers = [], permissionSlipDocument = null] = await Promise.all([
    database
      .update(campaignsUsers)
      .set({ permissionSlipSignedAt: new Date() })
      .where(inArray(campaignsUsers.id, ids))
      .returning(),

    database.query.documents.findFirst({
      where: and(eq(documents.type, DocumentsTypeEnum.PERMISSION_SLIP), eq(documents.campaignId, input.campaignId)),
    }),
  ])

  if (!updatedCampaignUsers.length || !permissionSlipDocument) return []

  const userIds = updatedCampaignUsers.map(campaignUser => campaignUser.userId)

  await Promise.all([
    database
      .delete(documentsUsers)
      .where(and(eq(documentsUsers.documentId, permissionSlipDocument.id), inArray(documentsUsers.userId, userIds))),

    database.insert(documentsUsers).values(
      userIds.map(userId => ({
        documentId: permissionSlipDocument.id,
        userId: userId,
        status: DocumentsUsersStatusEnum.SIGNED,
        signedAt: new Date(),
        metadata: {
          date: new Date().toLocaleString(),
          signedDigitally: "false",
        },
      }))
    ),
  ])

  return updatedCampaignUsers
}
