type FundraiserProgressProps = {
  campaignName: string
  goalBars: number
  soldBars: number
  availableBars: number
  soldOut: boolean
}

export function FundraiserProgress({
  campaignName,
  goalBars,
  soldBars,
  availableBars,
  soldOut = false,
}: FundraiserProgressProps) {
  const remaining = goalBars - soldBars
  const percentage = goalBars > 0 ? Math.min(Math.round((soldBars / goalBars) * 100), 100) : 0
  const goalReached = goalBars > 0 && soldBars >= goalBars

  return (
    <>
      <div className="mb-[10px] rounded-[18px] border border-border bg-card p-[14px] shadow-sm">
        <span className="mb-[10px] block text-[11px] font-medium uppercase tracking-[0.5px] text-muted-foreground">
          {goalReached ? "Goal reached!" : "Help me reach my goal"}
        </span>

        <div className="mb-1 text-[22px] font-bold text-primary">
          {goalReached ? `${soldBars.toLocaleString()} bars sold!` : `${remaining.toLocaleString()} bars to go!`}
        </div>

        <div className="mb-[6px] flex items-center gap-2">
          <div className="h-[22px] flex-1 overflow-hidden rounded-[10px] bg-[#fbf6eb]">
            <div className="h-full rounded-[10px] bg-green-600" style={{ width: `${percentage}%` }} />
          </div>

          <span className="whitespace-nowrap text-sm font-bold text-green-600">{percentage}%</span>
        </div>

        <div className="mb-[6px] flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Sold: <strong className="font-semibold text-primary">{soldBars.toLocaleString()}</strong> bars &nbsp;·&nbsp;
            Goal: <strong className="font-semibold text-primary">{goalBars.toLocaleString()}</strong> bars
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[11px] text-[#bda898]">{campaignName} · ends soon</span>

          {!soldOut && (
            <div className="inline-flex items-center gap-1 rounded-full bg-[#eaf7ec] px-3 py-1 text-[11px] font-medium text-[#15803d]">
              {availableBars} bars available
            </div>
          )}
        </div>
      </div>

      {soldOut && (
        <div className="mb-[10px] rounded-xl border border-[#f0d8bd] bg-[#fdf0e4] p-4 text-center">
          <div className="mb-2 text-[28px]">😔</div>

          <div className="mb-[6px] text-[15px] font-medium text-primary">All current chocolate has been sold!</div>

          <div className="text-[13px] leading-[1.6] text-muted-foreground">
            Place a request below and if we are able to fulfill it, you will be notified and can complete your purchase
            at that time.
          </div>
        </div>
      )}
    </>
  )
}
