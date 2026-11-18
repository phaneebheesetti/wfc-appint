"use client"

import {
  Box,
  ChevronLeft,
  ChevronRight,
  CirclePlay,
  Clock3,
  CreditCard,
  Gift,
  ListChecks,
  MoveRight,
  PartyPopper,
  Quote,
  Rocket,
  StickyNote,
  TrendingUp,
  Users,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { ROLES_DETAILS, type RolesEnum } from "@/constants/roles"
import { env } from "@/env"
import { useLoggedInUser } from "@/hooks"
import { api } from "@/trpc/react"
import { cn } from "@/utils/cn"
import { getUserDisplayName } from "@/utils/users"

import { DashboardNotificationPopup } from "./dashboard-notification-popup"
import { getReadinessInfo } from "./readiness-info"

const SETUP_HUB_PATH = "/dashboard/orgadmin-setuphub-experience"

export function DashboardOrgAdminWelcomeExp() {
  const { loggedInUserId, user } = useLoggedInUser()
  const firstName = user?.firstName
  const router = useRouter()
  const { data: campaigns, isLoading: isCampaignsLoading } = api.campaigns.getCampaignForOrgAdmin.useQuery(
    { userId: loggedInUserId ?? "" },
    { enabled: !!loggedInUserId }
  )

  const activeCampaigns = campaigns?.filter(campaign => campaign.status.toUpperCase() === "ACTIVE")
  const activeCampaign = activeCampaigns?.length
    ? activeCampaigns.reduce((oldest, current) =>
        new Date(current.createdAt).getTime() < new Date(oldest.createdAt).getTime() ? current : oldest
      )
    : undefined

  const incompleteCampaign = campaigns?.find(campaign => {
    const readiness = getReadinessInfo({
      hasParticipants: campaign.hasParticipants,
      hasInventory: campaign.hasInventory,
      hasPrizes: campaign.hasPrizeAndEventSetup,
      hasStripeSetup: campaign.hasStripeSetup,
      hasPermissionSlipSetup: campaign.hasPermissionSlipSetup,
      hasFinalReviewCompleted: campaign.hasFinalReviewCompleted,
    })

    return readiness.readinessPercent < 100
  })

  let ctaLabel: string | null = null
  let ctaAction: (() => void) | null = null

  if (isCampaignsLoading) {
    // no-op: ctaLabel/ctaAction stay null until loading finishes
  } else if (incompleteCampaign) {
    ctaLabel = "Finish Setup"
    ctaAction = () => router.push(`/dashboard/orgadmin-setuphub-experience?campaignId=${incompleteCampaign.id}`)
  } else if (activeCampaign) {
    ctaLabel = "Manage Your Fundraiser"
    ctaAction = () => router.push(`/dashboard/organizations`)
  } else if (!campaigns?.length) {
    ctaLabel = "Manage Your Fundraiser"
    ctaAction = () => {
      router.push(`/dashboard/organizations`)
    }
  }

  const setupCards = [
    {
      title: "Manage Participants",
      description: "Track every participant raising money in one place.",
      icon: Users,
      iconContainerClassName: "bg-purple-50",
      iconClassName: "text-purple-800",
    },
    {
      title: "Collect payments online",
      description: "Enable digital payment and collect payments online.",
      icon: CreditCard,
      iconContainerClassName: "bg-blue-50",
      iconClassName: "text-blue-800",
    },
    {
      title: "Watch your progress",
      description: "Live updates on amount raised and participation.",
      icon: TrendingUp,
      iconContainerClassName: "bg-green-50",
      iconClassName: "text-green-800",
    },
    {
      title: "Reward top sellers",
      description: "Built-in prize tiers keep participants motivated.",
      icon: Gift,
      iconContainerClassName: "bg-orange-50",
      iconClassName: "text-orange-500",
    },
  ]
  const checklist = [
    {
      step: 1,
      title: "Enable digital payments",
      icon: CreditCard,
      duration: "5 min",
    },
    {
      step: 2,
      title: "Add participants",
      icon: Users,
      duration: "3 min",
    },
    {
      step: 3,
      title: "Product Selection",
      icon: Box,
      duration: "2 min",
    },
    {
      step: 4,
      title: "Configure prize program",
      icon: Gift,
      duration: "2 min",
    },
    {
      step: 5,
      title: "Create permission slip",
      icon: StickyNote,
      duration: "1 min",
    },
  ]
  const reviewCards = [
    {
      description:
        "The tool helped streamline communication, increase our staff's capacity to track student progress, and contribute to a successful fundraiser that supported our students and programs.",
      name: "Amanda V",
      designation: "Northview Elementary School ",
    },
    {
      description:
        "The new app helped make it easier to navigate the checkout process, enter students and rosters, and track sales. Overall, it was a huge time-saver.",
      name: "Brennan G",
      designation: "Mike Miller Elementary School",
    },
    {
      description: "Using the app this year made things so much easier for us! We absolutely loved it!",
      name: "Molly L",
      designation: "Ewalt Elementary School",
    },
    {
      description:
        "Using the app really helped me keep track of everything from who was selling, how many boxes they took, how much each student collected, and how much they still owed. At the end of the fundraiser I was able to quickly see who our top sellers were as well as download a spreadsheet with the money amounts owed. It was very quick and easy to use. I will definitely use it again for our next fundraiser.",
      name: "Kari M",
      designation: "Amery High School ",
    },
    {
      description: "I loved using the app. It was so easy to keep track of boxes going out and money coming in.",
      name: "Laura H",
      designation: "PTO Volunteer",
    },
    {
      description:
        "The app was so user friendly and so much easier to manage the sale compared to the previous paper tracking system we used. I appreciated having this all stored digitally.",
      name: "Nancy P",
      designation: "Allen Elementary School",
    },
    {
      description:
        "We used the new system this year, and it made a huge difference! Being able to track sales and collect payments all in one place saved us a ton of time and stress. Not having to handle and count cash/change every day was a game changer. Everything stayed organized, and it made the whole fundraiser run smoother from start to finish. Highly recommended for any group looking to simplify the process!",
      name: "Torey R",
      designation: " Ninety Six High School Band Director",
    },
    {
      description:
        "We loved the system. Very intuitive and reduced the need for counting cash and provided universal record keeping.”",
      name: "Anonymous",
      designation: "Dana Elementary School  ",
    },
    {
      description:
        "The new online tracking system is super convenient! It allowed for accuracy with the ability for us to know exactly how much we had made and any outstanding amounts for families to turn in!”",
      name: "Michael N",
      designation: "Van Buren Elementary School",
    },
  ]

  const [isPlaying, setIsPLaying] = useState(false)
  const [videoAvailable, setVideoAvailable] = useState(true)
  const videoUrl = "/oa-welcome-exp/WFC-App-Walkthrough-Video.mp4"
  const videoRef = useRef<HTMLVideoElement>(null)
  const [currentReview, setCurrentReview] = useState(0)
  const [open, setOpen] = useState(false)

  const handlePlay = async () => {
    if (!videoAvailable || !videoRef.current) return
    try {
      await videoRef.current?.play()
      setIsPLaying(true)
    } catch (_error) {
      setVideoAvailable(false)
    }
  }

  const { data: campaign } = api.campaigns.getOrgAdminWelcomeCampaign.useQuery(
    { userId: loggedInUserId ?? "" },
    {
      enabled: !!loggedInUserId,
      // Poll so a fundraiser assigned while the admin is already sitting on the dashboard surfaces the
      // popup on its own, instead of waiting for a window-focus refetch (i.e. clicking back into the page).
      refetchInterval: 10_000,
      refetchOnWindowFocus: true,
    }
  )
  const { mutateAsync: markAllWelcomeSeen } = api.campaigns.markAllOrgAdminWelcomeSeen.useMutation()
  const utils = api.useUtils()

  // Open once a fresh eligible campaign arrives from the query.
  useEffect(() => {
    if (campaign) setOpen(true)
  }, [campaign])

  // Mark ALL currently-pending campaigns as seen so only new assignments (stamped after this action)
  // will surface as a popup — not the ones that were already queued up alongside the one just shown.
  const markSeen = async () => {
    if (!loggedInUserId) return
    await markAllWelcomeSeen({ userId: loggedInUserId })
    void utils.campaigns.getOrgAdminWelcomeCampaign.invalidate()
  }

  const clearCampaignCache = () => {
    utils.campaigns.getOrgAdminWelcomeCampaign.setData({ userId: loggedInUserId ?? "" }, null)
  }

  const handleDismiss = () => {
    setOpen(false)
    clearCampaignCache()
    void markSeen()
  }

  const handleFinishSetup = () => {
    if (!campaign) return
    setOpen(false)
    clearCampaignCache()
    void markSeen()
    const matchedCampaign = campaigns?.find(c => c.id === campaign.id)
    const readiness = matchedCampaign
      ? getReadinessInfo({
          hasParticipants: matchedCampaign.hasParticipants,
          hasInventory: matchedCampaign.hasInventory,
          hasPrizes: matchedCampaign.hasPrizeAndEventSetup,
          hasStripeSetup: matchedCampaign.hasStripeSetup,
          hasPermissionSlipSetup: matchedCampaign.hasPermissionSlipSetup,
          hasFinalReviewCompleted: matchedCampaign.hasFinalReviewCompleted,
        })
      : null
    if (!readiness || readiness.readinessPercent < 100) {
      router.push(`${SETUP_HUB_PATH}?campaignId=${campaign.id}`)
    } else {
      router.push(`/dashboard/organizations/${campaign.organizationId}/campaigns/${campaign.id}`)
    }
  }

  const assigner = campaign?.createdByUser
  const assignerName = getUserDisplayName(assigner, "Your Fundraising Consultant")
  const assignerEmail = assigner?.email ?? ""
  const assignerRoleLabel = assigner?.role
    ? (ROLES_DETAILS[assigner.role as RolesEnum]?.label ?? "Fundraising Consultant")
    : "Fundraising Consultant"
  const currentCard = reviewCards[currentReview]
  if (!currentCard) return null
  const nextReview = () => {
    setCurrentReview(prev => (prev + 2) % reviewCards.length)
  }

  const prevReview = () => {
    setCurrentReview(prev => (prev - 2 + reviewCards.length) % reviewCards.length)
  }
  const visibleReviews = [reviewCards[currentReview], reviewCards[(currentReview + 1) % reviewCards.length]].filter(
    (card): card is (typeof reviewCards)[number] => card !== undefined
  )

  return (
    <>
      <div className="bg-[#fdf8ee]">
        {/* Modal */}
        {campaign && (
          <DashboardNotificationPopup
            open={open}
            assignerName={assignerName}
            assignerEmail={assignerEmail}
            assignerRoleLabel={assignerRoleLabel}
            fundraiserName={campaign.name}
            onDismiss={handleDismiss}
            onFinishSetup={handleFinishSetup}
          />
        )}

        {/* Welcome page */}
        <div>
          {/* Hero Section */}
          <div className="w-full bg-[#6e3332] p-4 text-white shadow-elev-2">
            <div className="flex flex-col gap-5 items-center">
              <div className="flex w-fit items-center rounded-full border border-white/20 bg-white/10 text-yellow-100 backdrop-blur-md gap-2 px-3 py-1 text-sm font-medium">
                <PartyPopper className="mt-0.5" size={16} />
                <span className="text-[#]">QUICK START</span>
              </div>
              {incompleteCampaign && (
                <p>You&apos;re steps away from launching your fundraiser. Spend a few minutes finishing setup.</p>
              )}
              <h2 className="text-3xl font-bold ">Welcome back, {firstName}</h2>
              {ctaLabel && ctaAction && (
                <Button
                  type="button"
                  className="w-fit rounded-full border bg-white hover:bg-white font-bold px-4 py-2 text-[#6e3332]"
                  onClick={ctaAction}
                >
                  <Rocket size={14} />
                  <span>{ctaLabel}</span>
                  <MoveRight className="mt-0.5" size={16} />
                </Button>
              )}
            </div>
          </div>

          {/* Capabilities Section */}
          <div className="flex flex-col items-center gap-3 ">
            <p className="text-muted-foreground pt-5 text-sm">HERE&apos;S WHAT YOU&apos;LL BE ABLE TO DO</p>
            <h2 className="text-3xl font-bold">Everything you need in one place</h2>
            <div className="grid grid-cols-2 gap-5 py-4">
              {setupCards.map(card => {
                const Icon = card.icon

                return (
                  <Card key={card.title}>
                    <CardContent className="flex items-start gap-3 p-4">
                      <div
                        className={`flex h-8 w-8 md:h-10 md:w-10 lg:h-12 lg:w-12 items-center justify-center rounded-xl ${card.iconContainerClassName}`}
                      >
                        <Icon size={16} className={`h-4 w-4 md:h-5 md:w-5 lg:h-6 lg:w-6 ${card.iconClassName}`} />
                      </div>
                      <div>
                        <p className="text-medium font-bold">{card.title}</p>
                        <p className="text-xs font-medium pt-1">{card.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>

          {/* Demo & Social Proof Section */}
          {env.NEXT_PUBLIC_DEMO_SOCIAL_PROOF === "true" && (
            <div className="flex flex-col items-center justify-center py-4">
              <div className="relative h-64 w-full max-w-3xl overflow-hidden rounded-xl">
                {videoAvailable ? (
                  <video
                    controls={isPlaying}
                    ref={videoRef}
                    className="h-64 w-full object-cover"
                    src={videoUrl}
                    poster="/oa-welcome-exp/poster.png"
                    preload="auto"
                    playsInline
                    muted
                    onError={() => setVideoAvailable(false)}
                  />
                ) : (
                  <div className="h-64 w-full bg-black/60"></div>
                )}
                {!isPlaying && (
                  <button
                    type="button"
                    onClick={handlePlay}
                    className="absolute inset-0 flex flex-col items-center justify-center"
                  >
                    {/* Lighten or darken the poster */}
                    <div className="absolute inset-0 bg-black/25" />

                    {/* Play icon and text */}
                    <div className="relative z-10 flex flex-col items-center">
                      <CirclePlay size={64} className="text-white transition-transform duration-200 hover:scale-110" />

                      <p className="mt-3 text-lg font-semibold text-white">See WFCentral in action</p>
                    </div>
                  </button>
                )}
              </div>

              {/* testimonials */}
              <div>
                <div className="flex flex-col items-center justify-center py-4">
                  <p className="text-muted-foreground py-4 text-sm fond-bold">FROM OTHER ADMINS</p>
                  <h3 className="text-2xl font-bold">Loved by schools and clubs nationwide</h3>
                </div>
                <div className="mx-auto mt-6 flex items-center gap-4">
                  <Button variant="outline" size="icon" className="rounded-full" onClick={prevReview}>
                    <ChevronLeft size={18} />
                  </Button>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {visibleReviews.map((card, index) => {
                      const initials = card.name
                        .split(" ")
                        .map(word => word[0])
                        .join("")
                        .slice(0, 2)

                      return (
                        <Card
                          key={card.name}
                          className={cn("h-[280px] w-full max-w-[420px]", index === 1 && "hidden md:block")}
                        >
                          <CardContent className="flex h-full flex-col p-5">
                            <Quote className="mb-3 text-[#B22222]" size={16} />

                            {/* Scrollable description */}
                            <div className="flex-1 overflow-y-auto pr-2">
                              <p className="text-sm leading-6 text-muted-foreground">{card.description}</p>
                            </div>

                            {/* Footer */}
                            <div className="mt-4">
                              <div className="mb-3 border-t" />

                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#6e3332] font-bold text-white">
                                  {initials}
                                </div>

                                <div>
                                  <p className="text-sm font-semibold">{card.name}</p>
                                  <p className="text-xs text-muted-foreground">{card.designation}</p>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>

                  <Button variant="outline" size="icon" className="rounded-full" onClick={nextReview}>
                    <ChevronRight size={18} />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Setup Checklist Preview Section */}
          <div className="py-3">
            <Card className="mx-auto w-full max-w-xl">
              <CardHeader className="bg-[#fefbf5]">
                <div className="flex gap-2 text-[#6e3332]">
                  <ListChecks size={16} />
                  <span className="text-sm">HERE&apos;S WHAT YOU&apos;LL NEED</span>
                </div>
                <span className="text-medium font-bold">5 quick steps &bull; about 8 minutes</span>
              </CardHeader>
              <CardContent className="py-2">
                <div className="space-y-4">
                  {checklist.map(item => {
                    const Icon = item.icon
                    return (
                      <div key={item.step} className="flex w-full items-center justify-between ">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center gap-3 justify-center rounded-full bg-[#fdf8ee] text-[#6e3332] font-semibold">
                            {item.step}
                          </div>
                          <div className="text-muted-foreground">
                            <Icon size={18} />
                          </div>
                          <span>{item.title}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock3 size={16} />
                          <span>{item.duration}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="flex flex-col gap-2 items-center justify-center">
            {ctaLabel && ctaAction && (
              <Button type="button" className="w-fit rounded-full border font-bold px-4 py-2" onClick={ctaAction}>
                <Rocket size={14} />
                <span>{ctaLabel}</span>
                <MoveRight className="mt-0.5" size={16} />
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
