import { FieldText } from "@/components/ui/text"
import { COLOR_MAP } from "@/constants/colors"
import { ROLES_DETAILS, type RolesEnum } from "@/constants/roles"
import { USER_STATUS_DETAILS, type UsersStatusEnum } from "@/constants/users"
import { type User } from "@/server/db/schema"
import { formatDateAndTime } from "@/utils/date"
import { formatPhoneNumber } from "@/utils/phone"
import { getUserDisplayName } from "@/utils/users"

import { UsersInvitationEmailActions } from "./users-invitation-email-actions"

interface UsersViewProps {
  user: User
  setUser?: (user: User | null) => void
}

export function UsersView({ user, setUser }: UsersViewProps) {
  const { icon: Icon, label, color } = USER_STATUS_DETAILS[user.status as UsersStatusEnum]
  const colorClasses = COLOR_MAP[color] ?? { text: "", progress: "" }

  return (
    <div className="flex flex-col gap-4">
      <FieldText label="User ID" value={user.id} adminOnly />
      <FieldText label="Clerk ID" value={user.clerkId} adminOnly />

      <FieldText label="Email" value={user?.email ?? ""} />

      <UsersInvitationEmailActions user={user} setUser={setUser} />

      <FieldText label="Phone" value={user?.phone ? formatPhoneNumber(user?.phone) : ""} />

      <FieldText label="Role" value={ROLES_DETAILS[user.role as RolesEnum].label ?? ""} />

      <FieldText
        label="Status"
        value={
          <div className={`flex items-center gap-1 ${colorClasses.text}`}>
            <Icon size={16} />
            {label}
          </div>
        }
      />

      <FieldText
        label="Invited By"
        value={
          <>
            <div>{getUserDisplayName(user.invitedByUser)}</div>
            <div className="text-xs text-muted-foreground">{user.invitedByUser?.email ?? ""}</div>
          </>
        }
      />
      <FieldText label="Invited By ID" value={user.invitedByUser?.id} adminOnly />

      <FieldText label="Created On" value={user.createdAt ? formatDateAndTime(user.createdAt) : ""} />
    </div>
  )
}
