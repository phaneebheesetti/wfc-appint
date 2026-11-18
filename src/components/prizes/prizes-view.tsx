import { ImageWithFallback } from "@/components/ui/image"
import { FieldText } from "@/components/ui/text"
import { PRIZE_GOAL_TYPE_DETAILS, type PrizeGoalTypeEnum } from "@/constants/prize"
import { type Prize } from "@/server/db/schema"

interface PrizesViewProps {
  prize: Prize
}

export function PrizesView({ prize }: PrizesViewProps) {
  const casesGoal = prize?.casesGoal ?? 0

  return (
    <div className="flex flex-col gap-4">
      <FieldText label="Prize ID" value={prize.id} adminOnly />

      <FieldText label="Name" value={prize.name} truncate />
      <FieldText label="Description" value={prize.description} truncate />

      <div className="text-sm flex gap-2 flex-col font-medium">
        Image:
        <div className="relative h-44 w-44 overflow-hidden rounded-lg">
          <ImageWithFallback
            src={prize.imageUrl ?? ""}
            alt={prize.name}
            fill
            sizes="240px"
            className="object-contain"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
            }}
          />
        </div>
      </div>

      <FieldText label="Goal" value={PRIZE_GOAL_TYPE_DETAILS[prize.goalType as PrizeGoalTypeEnum].label} />
      {casesGoal > 0 && <FieldText label="Number of Cases" value={prize.casesGoal ?? ""} />}

      {prize.description && <FieldText label="Description" value={prize.description} />}
      <FieldText label="Status" value={prize.active ? "Active" : "Inactive"} />

      <FieldText label="Previous Prize" value={prize.previousPrize?.name ?? "N/A"} />
      <FieldText label="Previous Prize ID" value={prize?.previousPrizeId ?? null} adminOnly />

      <FieldText label="Next Prize" value={prize.nextPrize?.name ?? "N/A"} />
      <FieldText label="Next Prize ID" value={prize?.nextPrizeId ?? null} adminOnly />
    </div>
  )
}
