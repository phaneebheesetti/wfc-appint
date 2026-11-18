import Image from "next/image"

import { Skeleton } from "@/components/ui/skeleton"
import { AVATARS } from "@/constants/avatars"
import { useLoggedInUser } from "@/hooks"
import { type User } from "@/server/db/schema"
import { api } from "@/trpc/react"
import { getDigitFromFirstChar } from "@/utils/string"
import { getUserDisplayName } from "@/utils/users"

interface ParentDashboardChildrenListProps {
  selectedUser: User | null
  setSelectedUser: (user: User | null) => void
}

export function ParentDashboardChildrenList({ selectedUser, setSelectedUser }: ParentDashboardChildrenListProps) {
  const { loggedInUserId } = useLoggedInUser()

  const { data: users, isLoading } = api.users.listByParentId.useQuery(
    { parentId: loggedInUserId! },
    { enabled: !!loggedInUserId }
  )

  if (isLoading) {
    return <Skeleton className="w-full h-32" />
  }

  if (!users || users.length === 0) {
    return (
      <div className="flex flex-row overflow-x-auto items-center gap-2 py-4 px-4 bg-blue-50">
        <div className="text-sm text-muted-foreground">No children found on your family</div>
      </div>
    )
  }

  return (
    <div className="flex flex-row overflow-x-auto items-center gap-2 p-4 bg-blue-50">
      <div className="flex flex-col items-center gap-2 cursor-pointer" onClick={() => setSelectedUser(null)}>
        <div
          className={`flex items-center justify-center text-blue-500 h-20 w-20 border-blue-400 bg-blue-200 rounded-full ${!selectedUser ? "border-4" : "border-1"}`}
        >
          Family
        </div>
        <div className={`text-xs ${!selectedUser ? "text-blue-400 font-semibold" : "text-muted-foreground"}`}>
          Overview
          <br />
          <div className="min-h-[13px]" />
        </div>
      </div>

      {users.map(user => (
        <Avatar key={user.id} user={user} selectedUserId={selectedUser?.id ?? ""} setSelectedUser={setSelectedUser} />
      ))}
    </div>
  )
}

interface AvatarProps {
  user: User
  selectedUserId: string
  setSelectedUser: (user: User) => void
}

const Avatar = ({ user, selectedUserId, setSelectedUser }: AvatarProps) => {
  const isSelected = selectedUserId === user.id

  return (
    <div
      key={user.id}
      className="flex flex-col items-center gap-2 cursor-pointer hover:opacity-80"
      onClick={() => setSelectedUser(user)}
    >
      <div className={`h-20 w-20 ${isSelected ? "border-4 border-blue-400 bg-blue-200 rounded-full " : ""}`}>
        <Image src={AVATARS[getDigitFromFirstChar(user?.id)] ?? ""} alt="User Avatar" width={88} height={88} />
      </div>
      <p className={`text-center text-xs ${isSelected ? "text-blue-400 font-semibold" : "text-muted-foreground"}`}>
        {getUserDisplayName(user)}
        <br />
        <span className="text-[10px] text-muted-foreground">PIN: {user.pin}</span>
      </p>
    </div>
  )
}
