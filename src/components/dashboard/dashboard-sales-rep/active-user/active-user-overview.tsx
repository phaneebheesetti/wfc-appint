"use client"

import { Lightbulb } from "lucide-react"
import { useMemo } from "react"

import { CampaignsStatusEnum } from "@/constants/campaigns"
import { useLoggedInUser } from "@/hooks"
import { api } from "@/trpc/react"

import { ActiveUserMetricCards } from "./active-user-metric-cards"
import { getReadinessInfo } from "./campaign-readiness-info"

interface NextBestAction {
  title: string
  subtitle: string
}

export function ActiveUserOverview() {
  const { user, loggedInUserId } = useLoggedInUser()

  const { data: organizations } = api.campaigns.getCampaignsForSalesRep.useQuery(
    { userId: loggedInUserId ?? "" },
    { enabled: !!loggedInUserId }
  )

  const { data: closedCampaignsCount = 0 } = api.campaigns.getClosedCampaignsCount.useQuery(
    { userId: loggedInUserId ?? "" },
    { enabled: !!loggedInUserId }
  )

  const firstName = user?.firstName ?? ""

  const organizationsCount = organizations?.filter(org => !org.deletedAt).length ?? 0

  const { launchedCount, needAttentionCount, nextBestAction } = useMemo(() => {
    const result = {
      launchedCount: 0,
      needAttentionCount: 0,
      nextBestAction: null as NextBestAction | null,
    }

    if (!organizations?.length) {
      return result
    }

    let nextBestAction: NextBestAction | null = null

    for (const organization of organizations) {
      if (organization.deletedAt) continue

      const hasNoCampaigns = organization.campaigns.length === 0

      if (hasNoCampaigns) {
        result.needAttentionCount += 1
        if (!nextBestAction) {
          nextBestAction = {
            title: "Create Fundraiser",
            subtitle: `${organization.name} does not have any fundraiser.`,
          }
        }

        continue
      }

      const activeCampaigns = organization.campaigns.filter(campaign => campaign.status === CampaignsStatusEnum.ACTIVE)

      if (activeCampaigns.length === 0) {
        continue
      }

      for (const campaign of activeCampaigns) {
        const readiness = getReadinessInfo({
          organization,
          campaign,
          hasPrizes: !!campaign.hasPrizeSetup,
        })

        if (readiness.readinessPercent < 100) {
          result.needAttentionCount += 1

          // Next Best Action
          if (!nextBestAction) {
            const nextBestTitle = readiness.missingItems[0]
            const nextBestSubtitle = readiness.nextBestItem[0]

            if (nextBestTitle && nextBestSubtitle) {
              nextBestAction = {
                title: nextBestTitle,
                subtitle: `${organization.name} ${nextBestSubtitle}`,
              }
            }
          }
        }

        if (readiness.readinessPercent === 100) {
          result.launchedCount += 1
        }
      }
    }

    result.nextBestAction = nextBestAction

    return result
  }, [organizations])

  return (
    <div className="flex flex-col gap-6 w-full mb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome back, {firstName}</h1>

        <p className="mt-3 text-lg text-muted-foreground">You&apos;re managing {organizationsCount} organizations.</p>
      </div>

      {nextBestAction && (
        <div className="w-full rounded-card border border-orange-200/60 bg-gradient-to-r from-primary-foreground to-orange-100/60 p-8 ">
          <div className="flex items-start gap-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-control bg-primary">
              <Lightbulb className="h-8 w-8 text-primary-foreground" />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold tracking-wider text-primary">NEXT BEST ACTION</span>

                <div className="rounded-full border border-orange-200 bg-white px-3 py-1 text-xs font-semibold text-primary">
                  1 min
                </div>
              </div>

              <div className="text-2xl font-bold">{nextBestAction?.title}</div>

              <div className="text-muted-foreground">{nextBestAction?.subtitle}</div>
            </div>
          </div>
        </div>
      )}

      <ActiveUserMetricCards
        launchedCount={launchedCount}
        needAttentionCount={needAttentionCount}
        closedCount={closedCampaignsCount}
      />
    </div>
  )
}
