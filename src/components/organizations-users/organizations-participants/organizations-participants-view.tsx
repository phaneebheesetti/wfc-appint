import { FieldText } from "@/components/ui/text"
import { UsersInvitationEmailActions } from "@/components/users/users-invitation-email-actions"
import { GRADE_LABEL, TEACHER_LABEL } from "@/constants/participant-labels"
import { type OrganizationUser } from "@/server/db/schema"
import { formatPhoneNumber } from "@/utils/phone"
import { getUserDisplayName } from "@/utils/users"

export function OrganizationsParticipantsView({
  organizationUser,
  setSelectedUser,
}: {
  organizationUser: OrganizationUser
  setSelectedUser: React.Dispatch<React.SetStateAction<OrganizationUser | null>>
}) {
  return (
    <div className="flex flex-col gap-4">
      <FieldText label="Organization User ID" value={organizationUser.id} adminOnly />
      <FieldText label="User ID" value={organizationUser.userId} adminOnly />
      <FieldText label="Clerk ID" value={organizationUser.user?.clerkId} adminOnly />

      <FieldText label="Email" value={organizationUser.user?.email ?? ""} />

      {organizationUser.user && (
        <UsersInvitationEmailActions
          user={organizationUser.user}
          setUser={updatedUser => {
            if (!updatedUser) return

            setSelectedUser(prev =>
              prev
                ? {
                    ...prev,
                    user: { ...prev.user, ...updatedUser },
                  }
                : null
            )
          }}
        />
      )}

      <FieldText
        label="Phone"
        value={organizationUser.user?.phone ? formatPhoneNumber(organizationUser.user?.phone) : ""}
      />

      <FieldText
        label="Parent"
        value={
          <>
            <div>{getUserDisplayName(organizationUser.user?.parentUser)}</div>
            {organizationUser.user?.parentUser?.phone && (
              <div className="text-xs text-muted-foreground">
                {formatPhoneNumber(organizationUser.user?.parentUser?.phone)}
              </div>
            )}
            <div className="text-xs text-muted-foreground">{organizationUser.user?.parentUser?.email ?? ""}</div>
          </>
        }
      />

      {organizationUser.user?.parentUser && (
        <UsersInvitationEmailActions
          user={organizationUser.user.parentUser}
          setUser={updatedParentUser => {
            if (!updatedParentUser) return

            setSelectedUser(prev =>
              prev && prev.user
                ? {
                    ...prev,
                    user: {
                      ...prev.user,
                      parentUser: { ...prev.user.parentUser, ...updatedParentUser },
                    },
                  }
                : prev
            )
          }}
        />
      )}

      <FieldText label="Parent ID" value={organizationUser.user?.parentUserId} adminOnly />

      <FieldText label={GRADE_LABEL} value={organizationUser.user?.grade ?? ""} />
      <FieldText label={`${TEACHER_LABEL} Name`} value={organizationUser.user?.teacherName ?? ""} />

      {organizationUser.user && <FieldText label="PIN" value={organizationUser.user?.pin} />}
    </div>
  )
}
