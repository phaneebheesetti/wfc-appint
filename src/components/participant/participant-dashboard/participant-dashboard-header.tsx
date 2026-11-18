import Image from "next/image"

import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { AVATARS } from "@/constants/avatars"
import { api } from "@/trpc/react"
import { getDigitFromFirstChar } from "@/utils/string"
import { getUserDisplayName } from "@/utils/users"

interface ParticipantDashboardHeaderProps {
  userId: string
}

export function ParticipantDashboardHeader({ userId }: ParticipantDashboardHeaderProps) {
  const { data: user, isLoading } = api.users.getById.useQuery({ id: userId }, { enabled: !!userId })

  if (isLoading)
    return (
      <div className="flex items-center gap-2">
        <Skeleton className="size-12 min-w-12 min-h-12 rounded-full" />
        <Skeleton className="w-1/2 h-10" />
      </div>
    )

  return (
    <>
      <div className="flex items-center gap-2">
        <Image src={AVATARS[getDigitFromFirstChar(userId)] ?? ""} alt="User Avatar" width={48} height={48} />

        <div className="text-2xl font-semibold">Hello, {getUserDisplayName(user, "Participant")}!</div>
      </div>

      <Separator className="hidden md:block" />
    </>
  )
}
