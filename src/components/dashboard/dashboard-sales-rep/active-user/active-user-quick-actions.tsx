"use client"

import { ChevronRight, CircleCheck, Grid2x2, List, MoveRight, Rocket, Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"

import { useLoggedInUser } from "@/hooks"
import { api } from "@/trpc/react"

import { getReadinessInfo } from "./campaign-readiness-info"

export function ActiveUserQuickActions() {
  const { loggedInUserId } = useLoggedInUser()
  const [view, setView] = useState<"grid" | "list">(() => {
    if (typeof window === "undefined") {
      return "grid"
    }
    const savedView = sessionStorage.getItem("quickActionsView")
    if (savedView === "grid" || savedView === "list") {
      return savedView
    }
    return window.innerWidth < 640 ? "list" : "grid"
  })
  const router = useRouter()
  const { data: organizations } = api.campaigns.getCampaignsForSalesRep.useQuery(
    { userId: loggedInUserId ?? "" },
    { enabled: !!loggedInUserId }
  )
  useEffect(() => {
    sessionStorage.setItem("quickActionsView", view)
  }, [view])

  type Organization = NonNullable<typeof organizations>[number]

  type Campaign = Organization["campaigns"][number]

  type QuickActionItem =
    | {
        type: "organization"
        organization: Organization
      }
    | {
        type: "campaign"
        organization: Organization
        campaign: Campaign
      }
  const quickActionItems = useMemo(() => {
    return (organizations ?? []).reduce<QuickActionItem[]>((acc, organization) => {
      if (organization.deletedAt) return acc // skip deleted
      //No campaigns -> show org tile
      if (!organization.campaigns?.length) {
        acc.push({ type: "organization", organization })
        return acc
      }
      const activeCampigns =
        organization.campaigns?.filter(campaign => campaign.status?.toUpperCase() === "ACTIVE") ?? []
      //Has campaigns but none as ACTIVE -> show no tile
      if (activeCampigns.length === 0) {
        return acc
      }
      activeCampigns.forEach(campaign => {
        acc.push({ type: "campaign", organization, campaign })
      })

      return acc
    }, [])
  }, [organizations])

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Quick Actions</h2>

        <div className="flex items-center gap-2">
          <div className="flex items-center overflow-hidden rounded-control border">
            <button
              onClick={() => setView("grid")}
              className={`flex items-center gap-1 px-3 py-1 transition-colors ${
                view === "grid" ? "bg-red-900 text-white" : "bg-white text-black hover:bg-gray-100"
              }`}
            >
              <Grid2x2 size={16} />
              <span>Grid</span>
            </button>

            <button
              onClick={() => setView("list")}
              className={`flex items-center gap-1 border-l px-3 py-1 transition-colors ${
                view === "list" ? "bg-red-900 text-white" : "bg-white text-black hover:bg-gray-100"
              }`}
            >
              <List size={16} />
              <span>List</span>
            </button>
          </div>

          <div className="flex items-center">
            <button onClick={() => router.push("/dashboard/organizations")}>View All</button>

            <ChevronRight size={13} />
          </div>
        </div>
      </div>

      {/* GRID VIEW */}
      {view === "grid" ? (
        <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
          {quickActionItems.map(item => {
            const organization = item.organization

            const campaign = item.type === "campaign" ? item.campaign : null

            const readiness = getReadinessInfo({ organization, campaign, hasPrizes: !!campaign?.hasPrizeSetup })

            const isLive = campaign?.status?.toUpperCase() === "ACTIVE"

            return (
              <div
                key={campaign?.id ?? organization.id}
                className="rounded-card border p-4 shadow-elev-1 transition hover:shadow-elev-2 relative overflow-hidden bg-white"
              >
                <div className={`absolute top-0 left-0 h-1 w-full ${readiness.readinessColor}`} />
                {/* Organization */}
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-bold">{organization.name}</h2>

                  <div
                    className={`flex items-center gap-1 rounded-chip border px-1 py-1 ${readiness.readinessColor} bg-opacity-10`}
                  >
                    <div className={`h-2 w-2 rounded-full ${readiness.readinessColor}`} />
                    <span className={`text-xs font-medium ${readiness.readinessTextColor} `}>
                      {readiness.readinessPercent}%
                    </span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  {organization.city}, {organization.state}
                </p>

                <p className="mt-5 text-sm text-muted-foreground">ACTIVE FUNDRAISER</p>

                {/* Campaign */}
                <h2
                  className={`flex items-center gap-2 text-lg font-semibold ${!campaign ? "italic text-muted-foreground" : ""}`}
                >
                  {campaign ? (
                    <>
                      <Sparkles size={14} className="text-[#B22222]" />
                      {campaign.name}
                    </>
                  ) : (
                    "No active fundraiser"
                  )}
                </h2>

                <hr className="mt-3" />

                <div className="mt-3 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">READINESS</p>

                  <span
                    className={`text-xs font-medium ${
                      readiness.readinessPercent == 100
                        ? "text-success"
                        : readiness.readinessPercent > 50
                          ? "text-warning"
                          : "text-destructive"
                    }`}
                  >
                    {readiness.readinessText.toLocaleUpperCase()}
                  </span>
                </div>

                <div className="mt-2">
                  <div className="h-2 w-full rounded-full bg-gray-200">
                    <div
                      className={`h-2 rounded-full transition-all ${readiness.readinessColor}`}
                      style={{
                        width: `${readiness.readinessPercent}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="mt-3">
                  {readiness.readinessPercent < 100 ? (
                    <>
                      <p className="text-xs font-medium text-muted-foreground">Missing:</p>

                      <ul className="mt-1 list-disc pl-4 text-xs text-muted-foreground">
                        {readiness.missingItems.map(item => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                      {readiness.extraMissingCount > 0 && (
                        <p className="text-xs pl-4 text-muted-foreground mt-1">+{readiness.extraMissingCount} more</p>
                      )}
                    </>
                  ) : (
                    <p className="flex items-center gap-1 text-xs font-medium text-success">
                      <CircleCheck size={14} /> Everything&apos; set up
                    </p>
                  )}
                </div>

                <hr className="mt-3" />

                {/* Actions */}
                <div className="mt-4 flex items-center justify-between pb-1">
                  <button
                    className="flex items-center gap-1 font-medium text-[#B22222]"
                    onClick={() =>
                      router.push(
                        campaign?.id
                          ? `/dashboard/organizations/${organization.id}/campaigns/${campaign?.id}`
                          : `/dashboard/organizations/${organization.id}`
                      )
                    }
                  >
                    {readiness.readinessPercent === 100 ? "View Dashboard" : "Continue Setup"}
                    <MoveRight size={14} />
                  </button>

                  {isLive && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-success">
                      <Rocket size={14} />
                      LIVE
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* LIST VIEW */
        <div className="flex flex-col gap-3">
          {quickActionItems.map(item => {
            const organization = item.organization

            const campaign = item.type === "campaign" ? item.campaign : null

            const readiness = getReadinessInfo({ organization, campaign, hasPrizes: !!campaign?.hasPrizeSetup })

            return (
              //desktop view
              <div
                key={campaign?.id ?? organization.id}
                className="relative overflow-hidden rounded-card border px-4 py-3 shadow-elev-1 transition hover:shadow-elev-2 bg-white"
              >
                <div className={`absolute top-0 left-0 h-full w-1 ${readiness.readinessColor}`} />

                {/* list view in mobile view */}
                <div className="md:hidden flex flex-col gap-2">
                  {/* Line 1 */}
                  <div className="flex items-center justify-between">
                    <p className="truncate text-sm font-semibold">{organization.name}</p>

                    <div className="flex items-center gap-1">
                      <div className={`h-2 w-2 rounded-full ${readiness.readinessColor}`} />

                      <span className={`text-xs font-medium ${readiness.readinessTextColor}`}>
                        {readiness.readinessPercent}%
                      </span>
                    </div>
                  </div>

                  {/* Line 2 */}
                  <p className="truncate text-xs text-muted-foreground">
                    {organization.city}, {organization.state}
                    {campaign && ` • ${campaign.name}`}
                  </p>

                  {/* Line 3 */}
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 rounded-full bg-gray-200">
                      <div
                        className={`h-2 rounded-full ${readiness.readinessColor}`}
                        style={{
                          width: `${readiness.readinessPercent}%`,
                        }}
                      />
                    </div>

                    {readiness.readinessPercent < 100 && (
                      <span className="whitespace-nowrap rounded-chip border px-2 py-1 text-xs">
                        {readiness.totalMissingCount} Missing
                      </span>
                    )}
                    <button
                      onClick={() => {
                        if (campaign) {
                          router.push(`/dashboard/organizations/${organization.id}/campaigns/${campaign.id}`)
                        } else {
                          router.push(`/dashboard/organizations/${organization.id}`)
                        }
                      }}
                      className="text-muted-foreground hover:text-black"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>

                <div className="hidden md:flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-4 justify-between">
                      <p className="text-lg font-semibold">{organization.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {organization.city}, {organization.state}
                      </p>
                    </div>

                    <h3
                      className={`flex items-center gap-2 text-sm text-muted-foreground ${
                        !campaign ? "italic text-muted-foreground" : ""
                      }`}
                    >
                      {campaign && <Sparkles size={14} className="text-[#B22222]" />}

                      {campaign?.name ?? "No active fundraiser"}
                    </h3>
                  </div>

                  <div className="flex items-center gap-4">
                    {readiness.readinessPercent < 100 && (
                      <p className={`text-xs rounded-chip border px-2 py-1 ${readiness.readinessColor} bg-opacity-10`}>
                        {readiness.totalMissingCount} MISSING
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-2 w-40">
                      <div className="h-2 flex-1 rounded-full bg-gray-200">
                        <div
                          className={`h-2 rounded-full transition-all ${readiness.readinessColor}`}
                          style={{
                            width: `${readiness.readinessPercent}%`,
                          }}
                        />
                      </div>
                      <div className={`h-2 w-2 rounded-full ${readiness.readinessColor}`} />
                      <span className={`text-xs font-medium ${readiness.readinessTextColor}`}>
                        {readiness.readinessPercent}%
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        if (campaign) {
                          router.push(`/dashboard/organizations/${organization.id}/campaigns/${campaign.id}`)
                        } else {
                          router.push(`/dashboard/organizations/${organization.id}`)
                        }
                      }}
                      className="text-muted-foreground hover:text-black"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
