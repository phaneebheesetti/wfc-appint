import { and, eq, isNotNull } from "drizzle-orm"

import { DocumentsUsersStatusEnum } from "@/constants/documents-users"
import type { db } from "@/server/db"
import { documentsUsers } from "@/server/db/schema"

export const documentsUsersGetByUserId = async ({
  database,
  input,
}: {
  database: typeof db
  input: { userId: string; status: string }
}) => {
  return database.query.documentsUsers.findMany({
    where: and(
      eq(documentsUsers.userId, input.userId),
      eq(documentsUsers.status, input.status),
      input.status === DocumentsUsersStatusEnum.PENDING ? isNotNull(documentsUsers.sentEmailAt) : undefined
    ),
    with: {
      document: {
        with: {
          organization: true,
          campaign: true,
          event: true,
        },
      },
    },
  })
}
