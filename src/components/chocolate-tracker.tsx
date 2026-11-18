import Image from "next/image"

import { Skeleton } from "@/components/ui/skeleton"
import { WFC_LONG_NAME } from "@/constants/app"
import { cn } from "@/utils/cn"

interface ChocolateTrackerProps {
  title: string
  value: number
  valueDescription: string
  description: string
  bars?: number
  isLoading?: boolean
}

export function ChocolateTracker({
  title,
  value,
  valueDescription,
  description,
  bars,
  isLoading,
}: ChocolateTrackerProps) {
  return (
    <div className={cn("relative", bars !== undefined && "mt-16")}>
      {bars !== undefined && (
        <>
          <Image
            src="/participant/chocolate.png"
            alt="Chocolate Bar Mascot"
            className="absolute -top-16 left-0"
            width={88}
            height={88}
          />

          <div className="absolute -top-16 right-0 flex items-center gap-1 text-sm font-medium">
            <Image src="/participant/chocolate-bitten.svg" alt="Chocolate Bar Bitten" width={24} height={24} />

            {isLoading ? <Skeleton className="w-10 h-4" /> : `${bars} bars`}
          </div>
        </>
      )}

      <div className="relative z-10 bg-blue-50 rounded-lg p-6 flex items-center justify-between shadow-elev-1">
        <div className="flex flex-col gap-3">
          <div className="font-semibold">{title}</div>

          <div className="flex items-center gap-2">
            {isLoading ? <Skeleton className="w-5 h-8" /> : <span className="text-4xl font-semibold">{value}</span>}
            <span className="text-xs text-muted-foreground">{valueDescription}</span>
          </div>

          <div className="text-xs text-muted-foreground">{description}</div>
        </div>

        <Image src="/participant/chocolate-box.png" alt={`${WFC_LONG_NAME} Box`} width={120} height={104} />
      </div>
    </div>
  )
}
