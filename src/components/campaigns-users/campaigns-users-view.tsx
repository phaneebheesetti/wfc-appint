import { FieldText } from "@/components/ui/text"
import { UsersInvitationEmailActions } from "@/components/users/users-invitation-email-actions"
import { COLOR_MAP } from "@/constants/colors"
import { GRADE_LABEL, TEACHER_LABEL } from "@/constants/participant-labels"
import { RolesEnum } from "@/constants/roles"
import { USER_STATUS_DETAILS, UsersStatusEnum } from "@/constants/users"
import { useLoggedInUser } from "@/hooks/use-logged-in-user"
import { type CampaignUserWithComputedFields } from "@/server/services/campaigns-users"
import { api } from "@/trpc/react"
import { formatPhoneNumber } from "@/utils/phone"
import { ENCRYPTED_STRING } from "@/utils/string"
import { getUserDisplayName } from "@/utils/users"

import { ParentAccessLinkActions } from "./parent-access-link-actions"

const STATUS_PRIORITY: Record<UsersStatusEnum, number> = {
  [UsersStatusEnum.ACTIVE]: 0,
  [UsersStatusEnum.PENDING]: 1,
  [UsersStatusEnum.INACTIVE]: 2,
  [UsersStatusEnum.DELETED]: 3,
}

export function CampaignsUsersView({
  campaignUser,
  maskParticipantPii = false,
  setSelectedUser,
}: {
  campaignUser: CampaignUserWithComputedFields
  campaignHasDigitalPayment: boolean
  maskParticipantPii?: boolean
  setSelectedUser: React.Dispatch<React.SetStateAction<CampaignUserWithComputedFields | null>>
}) {
  const { loggedInRole } = useLoggedInUser()
  const canManageParentAccessLink =
    loggedInRole === RolesEnum.ORGANIZATION_ADMIN || loggedInRole === RolesEnum.ORGANIZATION_STAFF

  const { data: existingMappings } = api.participantParentMapping.listByParticipantId.useQuery(
    { participantUserId: campaignUser.userId },
    { enabled: !!campaignUser.userId }
  )

  // Combine legacy parent + all mapping parents, dedupe by id, sort by status priority
  const parentMap = new Map<string, NonNullable<typeof campaignUser.user>["parentUser"]>()
  if (campaignUser.user?.parentUser?.id) {
    parentMap.set(campaignUser.user.parentUser.id, campaignUser.user.parentUser)
  }
  for (const mapping of existingMappings ?? []) {
    if (mapping.parentUser?.id) {
      parentMap.set(mapping.parentUser.id, mapping.parentUser)
    }
  }
  const allParents = Array.from(parentMap.values())
    .filter((p): p is NonNullable<typeof p> => !!p)
    .sort((a, b) => {
      const aPriority = STATUS_PRIORITY[(a.status as UsersStatusEnum) ?? UsersStatusEnum.PENDING] ?? 99
      const bPriority = STATUS_PRIORITY[(b.status as UsersStatusEnum) ?? UsersStatusEnum.PENDING] ?? 99
      return aPriority - bPriority
    })

  const { icon: Icon, label, color } = USER_STATUS_DETAILS[campaignUser.user?.status as UsersStatusEnum]
  const colorClasses = COLOR_MAP[color] ?? { text: "", progress: "" }

  return (
    <div className="flex flex-col gap-4">
      <FieldText label="Campaign User ID" value={campaignUser.id} adminOnly />
      <FieldText label="User ID" value={campaignUser.userId} adminOnly />
      <FieldText label="Clerk ID" value={campaignUser.user?.clerkId} adminOnly />

      <FieldText
        label="Status"
        value={
          <div className={`flex items-center gap-1 ${colorClasses.text}`}>
            <Icon size={16} />
            {label}
          </div>
        }
      />

      <FieldText label="Email" value={maskParticipantPii ? ENCRYPTED_STRING : (campaignUser.user?.email ?? "")} />

      {campaignUser.user && !maskParticipantPii && (
        <UsersInvitationEmailActions
          user={campaignUser.user}
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
        value={
          maskParticipantPii
            ? ENCRYPTED_STRING
            : campaignUser.user?.phone
              ? formatPhoneNumber(campaignUser.user.phone)
              : ""
        }
      />

      <FieldText label="Parent ID" value={campaignUser.user?.parentUserId} adminOnly />

      <div className="flex flex-col gap-2">
        <div className="text-sm font-medium">Parent / Guardian:</div>
        <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto pr-1">
          {allParents.map(parent => {
            const parentStatus = (parent.status as UsersStatusEnum) ?? UsersStatusEnum.PENDING
            const { icon: IconStatus, label: labelStatus, color: colorStatus } = USER_STATUS_DETAILS[parentStatus]
            const colorClassesStatus = COLOR_MAP[colorStatus] ?? { text: "", progress: "" }
            return (
              <div
                key={parent.id}
                className="rounded-md border border-input px-3 py-2 flex items-start justify-between gap-2"
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium truncate">{getUserDisplayName(parent)}</span>
                    <div className={`text-xs flex items-center gap-1 shrink-0 ${colorClassesStatus.text}`}>
                      <IconStatus size={12} />
                      {labelStatus}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground break-words">{parent.email}</div>
                </div>
                {canManageParentAccessLink && (
                  <div className="shrink-0">
                    <ParentAccessLinkActions parent={parent} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <FieldText label={GRADE_LABEL} value={campaignUser.user?.grade ?? ""} />
      <FieldText label={`${TEACHER_LABEL} Name`} value={campaignUser.user?.teacherName ?? ""} />

      {campaignUser.user && <FieldText label="PIN" value={campaignUser.user?.pin} />}
    </div>
  )
}
