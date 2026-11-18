import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { useLoggedInUser } from "@/hooks"

export function ParentDashboardHeader() {
  const { isLoading, user } = useLoggedInUser()

  if (isLoading) return <Skeleton className="w-1/2 h-10" />

  return (
    <>
      <div className="flex items-center gap-2">
        <div className="text-2xl font-semibold">Hello, {user?.fullName ?? user?.firstName ?? "Parent"}!</div>
      </div>

      <Separator className="hidden md:block" />
    </>
  )
}
