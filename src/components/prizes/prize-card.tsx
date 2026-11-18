import { Eye, Goal, Lock } from "lucide-react"
import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ImageWithFallback } from "@/components/ui/image"
import { SheetSimple } from "@/components/ui/sheet/sheet-simple"
import { PRIZE_GOAL_TYPE_DETAILS, type PrizeGoalTypeEnum } from "@/constants/prize"
import { type Prize } from "@/server/db/schema"

import { PrizesView } from "./prizes-view"

interface PrizeCardProps {
  prize: Prize
}

export function PrizeCard({ prize }: PrizeCardProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Card className="flex flex-col overflow-hidden" key={prize.id}>
        <div className="w-full h-80 relative">
          <ImageWithFallback src={prize.imageUrl ?? ""} alt={prize.name} fill className="object-contain" />

          <Lock className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white" />
        </div>

        <div className="flex flex-col gap-4 p-6">
          <div className="flex flex-col gap-4">
            <div className="text-xs">Fundraiser: {prize.campaign?.name}</div>
            <div className="flex items-center justify-between text-2xl font-semibold">
              {prize.name} <Goal className="text-chart-1" />
            </div>
            {prize.description && <div className="text-xs">{prize.description}</div>}
          </div>

          <div className="flex justify-between items-center">
            <Badge variant="success" className="w-fit">
              {PRIZE_GOAL_TYPE_DETAILS[prize.goalType as PrizeGoalTypeEnum]?.howToBeEligible}
            </Badge>

            <Button variant="secondary" onClick={() => setOpen(true)}>
              <Eye />
              View
            </Button>
          </div>
        </div>
      </Card>

      <SheetSimple open={open} onOpenChange={setOpen} title={prize.name} description="Prize">
        <PrizesView prize={prize} />
      </SheetSimple>
    </>
  )
}
