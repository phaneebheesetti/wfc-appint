"use client"

import { Card, CardContent } from "@/components/ui/card"

interface OrderFundsBannerProps {
  cardAmountCents: number
  cashAmountCents: number
  totalAmountCents: number
}

const formatCents = (cents: number) => (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })

export function OrderFundsBanner({ cardAmountCents, cashAmountCents, totalAmountCents }: OrderFundsBannerProps) {
  const cardPct = totalAmountCents > 0 ? (cardAmountCents / totalAmountCents) * 100 : 0
  const cashPct = totalAmountCents > 0 ? (cashAmountCents / totalAmountCents) * 100 : 0

  return (
    <Card>
      <CardContent className="p-[14px]">
        <div className="pb-0.5 pt-1.5 text-center text-[44px] font-bold leading-none text-[#6e3332]">
          {formatCents(totalAmountCents)}
        </div>
        <div className="mb-2.5 text-center text-xs text-[#9a7d6a]">Total funds collected</div>

        <div className="mb-2 flex h-2.5 overflow-hidden rounded-full bg-[#efe6d2]">
          <div className="bg-[#6e3332] transition-[width]" style={{ width: `${cardPct}%` }} />
          <div className="bg-[#ffa004] transition-[width]" style={{ width: `${cashPct}%` }} />
        </div>

        <div className="flex flex-wrap justify-center gap-2.5 text-[11px] text-[#9a7d6a]">
          <div className="flex items-center gap-1">
            <div className="h-[7px] w-[7px] rounded-full bg-[#6e3332]" />
            <span className="font-semibold text-[#92580a]">Card — {formatCents(cardAmountCents)}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-[7px] w-[7px] rounded-full bg-[#ffa004]" />
            <span className="font-semibold text-[#92580a]">Cash — {formatCents(cashAmountCents)} (hand in)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
