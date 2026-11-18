import { AnalyticsAvgCasesPerParticipant } from "./analytics-avg-cases-per-participant"
import { AnalyticsCasesRemaining } from "./analytics-cases-remaining"
import { AnalyticsCashDigitalPayments } from "./analytics-cash-digital-payments"
import { AnalyticsDailyCasesCheckedOut } from "./analytics-daily-cases-checked-out"
import { AnalyticsParentEngagement } from "./analytics-parent-engagement"
import { AnalyticsProgressToGoal } from "./analytics-progress-to-goal"
import { AnalyticsUnpaidBalance } from "./analytics-unpaid-balance"

interface AnalyticsCampaignsProps {
  campaignId: string
}

export function AnalyticsCampaigns({ campaignId }: AnalyticsCampaignsProps) {
  return (
    // the layouts below will toggle on/off based on the breakpoint (930px) setting
    <div className="grid gap-4 w-full">
      {/* Desktop Layout */}
      <div className="hidden min-[930px]:grid gap-4">
        <AnalyticsProgressToGoal campaignId={campaignId} />

        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(420px,1fr))]">
          <AnalyticsCasesRemaining campaignId={campaignId} />
          <AnalyticsAvgCasesPerParticipant campaignId={campaignId} />
          <AnalyticsParentEngagement campaignId={campaignId} />
          <AnalyticsDailyCasesCheckedOut campaignId={campaignId} />
          <AnalyticsUnpaidBalance campaignId={campaignId} />
          <AnalyticsCashDigitalPayments campaignId={campaignId} />
        </div>
      </div>

      {/* Mobile / Tablet Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-[930px]:hidden">
        <AnalyticsProgressToGoal campaignId={campaignId} />
        <AnalyticsCasesRemaining campaignId={campaignId} />
        <AnalyticsAvgCasesPerParticipant campaignId={campaignId} />
        <AnalyticsParentEngagement campaignId={campaignId} />
        <AnalyticsDailyCasesCheckedOut campaignId={campaignId} />
        <AnalyticsUnpaidBalance campaignId={campaignId} />
        <AnalyticsCashDigitalPayments campaignId={campaignId} />
      </div>
    </div>
  )
}
