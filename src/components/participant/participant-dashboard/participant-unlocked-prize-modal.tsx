import { Trophy } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useLocalStorage } from "usehooks-ts"

import { Button } from "@/components/ui/button"
import { ImageWithFallback } from "@/components/ui/image"
import { Modal } from "@/components/ui/modal"
import { api } from "@/trpc/react"

interface ParticipantUnlockedPrizeModalProps {
  userId: string
}

export function ParticipantUnlockedPrizeModal({ userId }: ParticipantUnlockedPrizeModalProps) {
  const [open, setOpen] = useState(false)
  const [unlockedPrizesIds, setUnlockedPrizesIds] = useLocalStorage<string[]>("participant-unlocked-prizes-ids", [])
  const { data: currentPrize, isLoading } = api.prizes.getCurrentPrizeByUserId.useQuery(
    { userId },
    { enabled: !!userId }
  )

  useEffect(() => {
    if (!currentPrize?.id) return

    const prizeAlreadyUnlocked = unlockedPrizesIds.includes(currentPrize.id)

    if (!prizeAlreadyUnlocked) {
      setUnlockedPrizesIds([...unlockedPrizesIds, currentPrize.id])
      setOpen(true)
    }
  }, [currentPrize])

  if (!currentPrize || isLoading) return null

  return (
    <Modal
      open={open}
      onOpenChange={setOpen}
      title="Great Job!"
      description="Congratulations! You've earned a new prize for your achievements"
      className="gap-2"
    >
      <div className="flex flex-col gap-5 mt-2">
        <div className="bg-blue-50 flex gap-2 items-center p-2 rounded-xl">
          <Trophy className="text-chart-1" />
          <span className="text-sm font-semibold">{currentPrize.name}</span>
        </div>

        <div className="relative w-full h-80 rounded-md overflow-hidden">
          <ImageWithFallback src={currentPrize.imageUrl ?? ""} alt={currentPrize.name} className="object-cover" fill />
        </div>

        <div className="flex flex-col gap-2">
          <span className="font-semibold">{currentPrize.campaign.name}</span>
        </div>

        <div className="bg-accent p-4 rounded-lg text-muted-foreground">
          Your hard work is paying off! Keep the momentum going—grab the next case and push the fundraiser closer to its
          goal.
        </div>

        {currentPrize.campaign.id ? (
          <Link
            href={`/dashboard/campaigns/${currentPrize.campaign.id}?userId=${userId}#prizes-events`}
            className="w-full"
          >
            <Button className="w-full">
              <Trophy />
              See Campaign Prizes
            </Button>
          </Link>
        ) : (
          <Button className="w-full" disabled>
            <Trophy />
            See Campaign Prizes
          </Button>
        )}
      </div>
    </Modal>
  )
}
