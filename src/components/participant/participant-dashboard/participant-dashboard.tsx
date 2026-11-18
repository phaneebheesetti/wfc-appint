import { ParticipantDashboardActiveCampaigns } from "./participant-dashboard-active-campaigns"
import { ParticipantDashboardChocolateTracker } from "./participant-dashboard-chocolate-tracker"
import { ParticipantDashboardEvents } from "./participant-dashboard-events"
import { ParticipantDashboardHeader } from "./participant-dashboard-header"
import { ParticipantDashboardMoney } from "./participant-dashboard-money"
import { ParticipantDashboardNotifications } from "./participant-dashboard-notifications"
import { ParticipantDashboardPrizes } from "./participant-dashboard-prizes"
import { ParticipantUnlockedPrizeModal } from "./participant-unlocked-prize-modal"

interface ParticipantDashboardProps {
  userId: string
  showHeader?: boolean
}

export function ParticipantDashboard({ userId, showHeader = true }: ParticipantDashboardProps) {
  return (
    <div className="flex flex-col gap-4">
      {showHeader && <ParticipantDashboardHeader userId={userId} />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="grid gap-4 h-fit">
          <ParticipantDashboardChocolateTracker userId={userId} />
          <ParticipantDashboardActiveCampaigns userId={userId} />
          <ParticipantDashboardNotifications userId={userId} />
        </div>

        <div className="grid gap-4 h-fit">
          <ParticipantDashboardMoney userId={userId} />
          <ParticipantDashboardPrizes userId={userId} />
          <ParticipantDashboardEvents userId={userId} />
          <ParticipantUnlockedPrizeModal userId={userId} />
        </div>
      </div>
    </div>
  )
}
