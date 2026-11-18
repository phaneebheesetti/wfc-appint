import { useState } from "react"

import { DeleteButton, UpdateButton } from "@/components/ui/button"
import { SheetSimple } from "@/components/ui/sheet/sheet-simple"
import { CASES_TRANSACTIONS_TYPE_DETAILS, CasesTransactionsTypeEnum } from "@/constants/cases-transactions"
import { COLOR_MAP } from "@/constants/colors"
import { CasesTransactionsPermissionsEnum } from "@/constants/permissions"
import { useLoggedInUser } from "@/hooks/use-logged-in-user"
import { type CasesTransaction } from "@/server/db/schema"
import { usePermissionsStore } from "@/stores"
import { api } from "@/trpc/react"

import { CasesTransactionsAdjustmentForm } from "./cases-transactions-adjustment-form"
import { CasesTransactionsDelete } from "./cases-transactions-delete"
import { CasesTransactionsForm } from "./cases-transactions-form"
import { CasesTransactionsView } from "./cases-transactions-view"

interface CasesTransactionsActionsProps {
  transaction: CasesTransaction
  open: boolean
  onOpenChange: (open: boolean) => void
  campaignIsActive: boolean
}

type Actions = "view" | "update" | "delete"

export function CasesTransactionsActions({
  transaction,
  open,
  onOpenChange,
  campaignIsActive,
}: CasesTransactionsActionsProps) {
  const getResourcePermissions = usePermissionsStore(state => state.getResourcePermissions)
  const { loggedInRole: role } = useLoggedInUser()
  const [action, setAction] = useState<Actions>("view")
  const utils = api.useUtils()

  if (!role) return null

  const { canUpdate, canDelete } = getResourcePermissions(role, CasesTransactionsPermissionsEnum)

  const { icon: Icon, label, color } = CASES_TRANSACTIONS_TYPE_DETAILS[transaction.type as CasesTransactionsTypeEnum]
  const colorClasses = COLOR_MAP[color] ?? { text: "", progress: "" }
  const isAdjustment =
    (transaction.type as CasesTransactionsTypeEnum) === CasesTransactionsTypeEnum.INVENTORY_ADJUSTMENT

  return (
    <SheetSimple
      open={open}
      onOpenChange={onOpenChange}
      title={
        <div className="flex items-center gap-2">
          <Icon size={24} className={colorClasses.text} />
          <div>{label}</div>
        </div>
      }
    >
      {action === "update" &&
        (isAdjustment ? (
          <CasesTransactionsAdjustmentForm
            casesTransaction={transaction}
            onBack={() => setAction("view")}
            onUpdate={() => onOpenChange(false)}
          />
        ) : (
          <CasesTransactionsForm
            casesTransaction={transaction}
            onBack={() => setAction("view")}
            onUpdate={() => onOpenChange(false)}
          />
        ))}

      {action !== "update" && (
        <>
          <CasesTransactionsView transaction={transaction} />

          {campaignIsActive && (
            <div className="flex gap-2">
              {canUpdate && <UpdateButton onClick={() => setAction("update")} />}
              {canDelete && <DeleteButton onClick={() => setAction("delete")} />}
            </div>
          )}
        </>
      )}

      <CasesTransactionsDelete
        transaction={transaction}
        open={action === "delete"}
        onOpenChange={() => setAction("view")}
        onDelete={() => {
          onOpenChange(false)
          void utils.campaigns.getHeaderMetrics.invalidate()
          void utils.campaigns.getAnalyticsTotalCampaignProfit.invalidate()
          void utils.campaigns.getSmallCardsMetrics.invalidate()
          void utils.casesTransactions.invalidate()
          void utils.campaignsUsers.listPaginatedByCampaignId.invalidate()
          void utils.campaigns.getPrizesOverview.invalidate()
          void utils.campaigns.getParticipantsByEvent.invalidate()
        }}
      />
    </SheetSimple>
  )
}
