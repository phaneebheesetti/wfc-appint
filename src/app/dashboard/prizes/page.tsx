"use client"

import { Trophy } from "lucide-react"
import Image from "next/image"

import { PageTitle } from "@/components/page-title"
import { ParticipantDashboardHeader } from "@/components/participant/participant-dashboard/participant-dashboard-header"
import { ParticipantEventsList } from "@/components/participant/participant-events-list"
import { ParticipantPrizesList } from "@/components/participant/participant-prizes-list"
import { Skeleton } from "@/components/ui/skeleton"
import { TabsWithHash } from "@/components/ui/tabs"
import { useLoggedInUser } from "@/hooks/use-logged-in-user"
import { api } from "@/trpc/react"

export default function PrizesPage() {
  const { loggedInUserId: userId } = useLoggedInUser()

  const { data: prizes = [], isLoading } = api.prizes.listByUserId.useQuery({ userId: userId! }, { enabled: !!userId })

  return (
    <div className="flex flex-col gap-4">
      <ParticipantDashboardHeader userId={userId!} />

      <PageTitle
        title="Prizes & Events"
        description="These are all the prizes and events you've unlocked by selling chocolate."
      />

      <div className="bg-orange-50 flex gap-2 p-2 rounded-lg">
        <Image src="/participant/chocolate-running.png" alt="Chocolate Bar Mascot running" width={172} height={172} />

        <div className="flex flex-col justify-center gap-4">
          <Trophy className="text-chart-1" />

          <div className="flex flex-col gap-1">
            {isLoading ? (
              <Skeleton className="w-10 h-8" />
            ) : (
              <div className="text-2xl font-semibold">{prizes?.length ?? 0}</div>
            )}
            <div className="font-semibold">Prize{prizes.length === 1 ? "" : "s"} Won</div>
            <div className="text-sm text-muted-foreground">All prizes won in all fundraisers</div>
          </div>
        </div>
      </div>

      <TabsWithHash
        tabs={[
          {
            label: "Prizes",
            value: "prizes",
            content: <ParticipantPrizesList userId={userId!} />,
          },
          {
            label: "Events",
            value: "events",
            content: <ParticipantEventsList userId={userId!} />,
          },
        ]}
        tabsListClassName="flex-row"
      />
    </div>
  )
}
