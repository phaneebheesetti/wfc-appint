import { CircleCheckBig, Mail, PackagePlus, PenLine, Trash2, Users } from "lucide-react"

import { DropdownButton } from "@/components/ui/button/dropdown-button"
import { SelectionBar } from "@/components/ui/selection-bar"

interface CampaignsUsersSelectionBarProps {
  selectedCount: number
  onClearSelection: () => void
  onGroupCheckout: () => void
  onSignPermissionSlip: () => void
  onMarkEligible: () => void
  onSendInviteEmail: () => void
  onDelete: () => void
}

export function CampaignsUsersSelectionBar({
  selectedCount,
  onClearSelection,
  onGroupCheckout,
  onSignPermissionSlip,
  onMarkEligible,
  onSendInviteEmail,
  onDelete,
}: CampaignsUsersSelectionBarProps) {
  return (
    <SelectionBar selectedCount={selectedCount} onClearSelection={onClearSelection}>
      <DropdownButton
        text="Group Actions"
        icon={Users}
        variant="default"
        buttons={[
          {
            text: "Check Out Chocolate",
            icon: PackagePlus,
            onClick: onGroupCheckout,
          },
          {
            text: "Sign Permission Slip",
            icon: PenLine,
            onClick: onSignPermissionSlip,
          },
          {
            text: "Resend Invite Email",
            icon: Mail,
            onClick: onSendInviteEmail,
          },
          {
            text: "Mark Eligible",
            icon: CircleCheckBig,
            onClick: onMarkEligible,
          },
          {
            text: "Delete",
            icon: Trash2,
            onClick: onDelete,
          },
        ]}
      />
    </SelectionBar>
  )
}
