import { and, eq } from "drizzle-orm"

import { DocumentsTypeEnum } from "@/constants/documents"
import { DocumentsUsersStatusEnum } from "@/constants/documents-users"
import { type db } from "@/server/db"
import { campaignsUsers } from "@/server/db/schema"
import { documents, documentsUsers } from "@/server/db/schema"

export const campaignsUsersSignPermissionSlip = async ({
  database,
  input,
}: {
  database: typeof db
  input: { id: string; campaignId: string }
}) => {
  const [[updatedCampaignUser], permissionSlipDocument] = await Promise.all([
    database
      .update(campaignsUsers)
      .set({ permissionSlipSignedAt: new Date() })
      .where(eq(campaignsUsers.id, input.id))
      .returning(),

    database.query.documents.findFirst({
      where: and(eq(documents.type, DocumentsTypeEnum.PERMISSION_SLIP), eq(documents.campaignId, input.campaignId)),
    }),
  ])

  if (!updatedCampaignUser || !permissionSlipDocument) return updatedCampaignUser ?? null

  await Promise.all([
    database
      .delete(documentsUsers)
      .where(
        and(
          eq(documentsUsers.documentId, permissionSlipDocument.id),
          eq(documentsUsers.userId, updatedCampaignUser.userId)
        )
      ),

    database.insert(documentsUsers).values({
      documentId: permissionSlipDocument.id,
      userId: updatedCampaignUser.userId,
      status: DocumentsUsersStatusEnum.SIGNED,
      signedAt: new Date(),
      metadata: {
        date: new Date().toLocaleString(),
        signedDigitally: "false",
      },
    }),
  ])

  return updatedCampaignUser
}
