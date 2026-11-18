import { eq } from "drizzle-orm"

import { FcAccessRevocationReasonEnum } from "@/constants/campaigns"
import { db } from "@/server/db"
import { type OrganizationInsert, organizations } from "@/server/db/schema"
import { participantNamesAccessRevokeByOrg } from "@/server/services/participant-names-access"

export const organizationsUpdate = async ({
  database,
  input,
  updatedByUserId,
}: {
  database: typeof db
  input: Partial<OrganizationInsert> & { id?: string }
  updatedByUserId?: string
}) => {
  const id = input.id!

  // Detect FC reassignment so we can revoke any active participant name access
  let fcReassigned = false
  if (input.fundraisingConsultantUserId !== undefined) {
    const existing = await database.query.organizations.findFirst({
      where: eq(organizations.id, id),
      columns: { fundraisingConsultantUserId: true },
    })
    if (existing && existing.fundraisingConsultantUserId !== input.fundraisingConsultantUserId) {
      fcReassigned = true
    }
  }

  const [organization] = await database.update(organizations).set(input).where(eq(organizations.id, id)).returning()

  if (fcReassigned && updatedByUserId) {
    // Revoke the outgoing FC's access as a system cascade. This must run on the privileged base
    // connection (`db`), NOT the request transaction (`database`): the latter has SET LOCAL role
    // 'authenticated', so RLS on participant_names_access silently filters the reads/writes to zero
    // rows unless the acting role (e.g. WFC_ADMIN) holds participant_names_access permissions. The
    // base connection runs as the owner role and bypasses RLS, so the revoke applies regardless of
    // which role performed the reassignment.
    await participantNamesAccessRevokeByOrg({
      database: db,
      organizationId: id,
      revokedByUserId: updatedByUserId,
      reason: FcAccessRevocationReasonEnum.FC_REASSIGNED,
    })
  }

  return organization
}
