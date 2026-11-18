import { TRPCError } from "@trpc/server"
import { and, eq } from "drizzle-orm"

import { DocumentsTypeEnum } from "@/constants/documents"
import { DocumentsUsersStatusEnum } from "@/constants/documents-users"
import type { db } from "@/server/db"
import { campaignsUsers, channelMessages, channelsUsers, documents, documentsUsers, users } from "@/server/db/schema"
import { organizationsUsersGetAdmin } from "@/server/services/organizations-users"
import { getUserDisplayName } from "@/utils/users"

export const documentsUsersSignDocument = async ({
  database,
  input,
}: {
  database: typeof db
  input: {
    id: string
    metadata: Record<string, string>
    userId: string | null
  }
}) => {
  const [documentUser] = await database
    .update(documentsUsers)
    .set({
      status: DocumentsUsersStatusEnum.SIGNED,
      signedAt: new Date(),
      metadata: input.metadata,
    })
    .where(eq(documentsUsers.id, input.id))
    .returning()

  if (!documentUser) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Document user not found" })
  }

  const document = await database.query.documents.findFirst({
    where: eq(documents.id, documentUser.documentId),
  })

  if (document && (document?.type as DocumentsTypeEnum) === DocumentsTypeEnum.PERMISSION_SLIP) {
    await database
      .update(campaignsUsers)
      .set({ permissionSlipSignedAt: new Date() })
      .where(and(eq(campaignsUsers.userId, documentUser.userId), eq(campaignsUsers.campaignId, document.campaignId)))

    const user = await database.query.users.findFirst({
      where: eq(users.id, documentUser.userId),
    })

    const organizationAdmin = await organizationsUsersGetAdmin({
      database,
      input: { organizationId: document.organizationId },
    })
    if (!organizationAdmin?.email) return documentUser

    const channelUser = await database.query.channelsUsers.findFirst({
      where: eq(channelsUsers.userId, documentUser.userId),
    })
    if (!channelUser?.channelId) return documentUser

    await database.insert(channelMessages).values({
      channelId: channelUser.channelId,
      content: `${getUserDisplayName(user, "Participant")} has successfully signed their permission slip`,
      userId: organizationAdmin.id,
      createdAt: new Date(),
    })
  }

  return documentUser
}
