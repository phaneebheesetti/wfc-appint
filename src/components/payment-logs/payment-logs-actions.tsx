import { useState } from "react"

import { DeleteButton, UpdateButton } from "@/components/ui/button"
import { SheetSimple } from "@/components/ui/sheet/sheet-simple"
import { COLOR_MAP } from "@/constants/colors"
import { PaymentLogsTypeEnum } from "@/constants/payment-logs"
import { PAYMENT_LOGS_TYPE_DETAILS } from "@/constants/payment-logs"
import { PaymentLogsPermissionsEnum } from "@/constants/permissions"
import { useLoggedInUser } from "@/hooks/use-logged-in-user"
import { type PaymentLog } from "@/server/db/schema"
import { usePermissionsStore } from "@/stores"

import { PaymentLogsDelete } from "./payment-logs-delete"
import { PaymentLogsForm } from "./payment-logs-form"
import { PaymentLogsView } from "./payment-logs-view"

interface PaymentLogsActionsProps {
  paymentLog: PaymentLog
  open: boolean
  onOpenChange: (open: boolean) => void
  campaignIsActive: boolean
}

type Actions = "view" | "update" | "delete"

export function PaymentLogsActions({ paymentLog, open, onOpenChange, campaignIsActive }: PaymentLogsActionsProps) {
  const getResourcePermissions = usePermissionsStore(state => state.getResourcePermissions)
  const { loggedInRole: role } = useLoggedInUser()
  const [action, setAction] = useState<Actions>("view")

  if (!role) return null

  const { canUpdate, canDelete } = getResourcePermissions(role, PaymentLogsPermissionsEnum)

  const { icon: Icon, label, color } = PAYMENT_LOGS_TYPE_DETAILS[paymentLog.type as PaymentLogsTypeEnum]
  const colorClasses = COLOR_MAP[color] ?? { text: "", progress: "" }

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
      {action === "update" && (
        <PaymentLogsForm
          paymentLog={paymentLog}
          onBack={() => setAction("view")}
          onUpdate={() => onOpenChange(false)}
        />
      )}

      {action !== "update" && (
        <>
          <PaymentLogsView paymentLog={paymentLog} />

          {campaignIsActive && (
            <div className="flex gap-2">
              {canUpdate && (paymentLog.type as PaymentLogsTypeEnum) !== PaymentLogsTypeEnum.DIGITAL && (
                <UpdateButton onClick={() => setAction("update")} />
              )}
              {canDelete && (paymentLog.type as PaymentLogsTypeEnum) !== PaymentLogsTypeEnum.DIGITAL && (
                <DeleteButton onClick={() => setAction("delete")} />
              )}
            </div>
          )}
        </>
      )}

      <PaymentLogsDelete
        paymentLog={paymentLog}
        open={action === "delete"}
        onOpenChange={() => setAction("view")}
        onDelete={() => onOpenChange(false)}
      />
    </SheetSimple>
  )
}
