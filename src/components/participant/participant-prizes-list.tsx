import { Card } from "@/components/ui/card"
import { ImageWithFallback } from "@/components/ui/image"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/trpc/react"

interface ParticipantPrizesListProps {
  userId: string
}

export function ParticipantPrizesList({ userId }: ParticipantPrizesListProps) {
  const { data: prizes = [], isLoading } = api.prizes.listByUserId.useQuery({ userId }, { enabled: !!userId })

  if (isLoading)
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="w-full h-32" />
        <Skeleton className="w-full h-32" />
      </div>
    )

  if (prizes.length === 0) return <div className="text-sm text-muted-foreground">No prizes found</div>

  return (
    <div className="flex flex-col gap-4">
      {prizes.map(prize => (
        <Card key={prize.id} className="flex items-center gap-4 p-4">
          <ImageWithFallback
            src={prize.imageUrl ?? ""}
            alt={prize.name}
            width={85}
            height={85}
            className="rounded-lg object-cover"
          />

          <div className="flex flex-col text-sm truncate">
            <div className="font-medium truncate">{prize.name}</div>
            <div className="text-muted-foreground truncate">{prize.description}</div>
          </div>
        </Card>
      ))}
    </div>
  )
}
