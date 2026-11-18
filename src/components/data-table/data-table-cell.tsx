import type { CellContext } from "@tanstack/react-table"
import { format } from "date-fns"
import { CheckCircleIcon, XCircleIcon } from "lucide-react"

import { Progress } from "@/components/ui/progress"
import { type User } from "@/server/db/schema"
import { cn } from "@/utils/cn"
import { formatPhoneNumber } from "@/utils/phone"
import { getUserDisplayName } from "@/utils/users"

type DataTableCellType =
  | "boolean"
  | "phoneNumber"
  | "progress"
  | "datetime"
  | "nameAndEmail"
  | "nameAndEmailAndPhone"
  | "emailAndPhone"

interface DataTableCellProps<TData, TValue> extends CellContext<TData, TValue> {
  type?: DataTableCellType
  value?: NoInfer<TValue>
  valueTrueText?: string
  valueFalseText?: string
  progress?: number
  progressClassName?: string
}

export function DataTableCell<TData, TValue>(props: DataTableCellProps<TData, TValue>) {
  const { getValue, type, progress, progressClassName, valueTrueText = "Yes", valueFalseText = "No" } = props
  const value = props.value ?? getValue()

  const componentsByType: Record<DataTableCellType, React.ReactNode> = {
    boolean: (
      <div className={cn("flex items-center gap-2", value ? "text-green-500" : "text-red-500")}>
        {value ? <CheckCircleIcon className="h-4 w-4" /> : <XCircleIcon className="h-4 w-4" />}
        {value ? valueTrueText : valueFalseText}
      </div>
    ),
    phoneNumber: <div className="flex items-center">{value && formatPhoneNumber(String(value))}</div>,
    progress: (
      <div className="flex flex-col items-left gap-0.5">
        {value && <span className="text-sm">{value as React.ReactNode}</span>}

        <Progress
          value={progress ?? 0}
          className={cn("h-3", progressClassName)}
          showPercentage
          showPercentageClassName="text-[8px]"
        />
      </div>
    ),
    datetime: (
      <div className="flex items-center">
        {value instanceof Date && (
          <>
            {format(value, "MM/dd/yy")} at {format(value, "h:mm aaa")}
          </>
        )}
      </div>
    ),
    nameAndEmail:
      !(value as User)?.fullName && !(value as User)?.email ? (
        <div>-</div>
      ) : (
        <>
          <div className="truncate first-letter:uppercase">{getUserDisplayName(value as User)}</div>
          <div className="truncate text-xs text-muted-foreground">{(value as User)?.email}</div>
        </>
      ),
    nameAndEmailAndPhone:
      !(value as User)?.fullName && !(value as User)?.email ? (
        <div>-</div>
      ) : (
        <>
          <div className="truncate first-letter:uppercase">{getUserDisplayName(value as User)}</div>
          <div className="truncate text-xs text-muted-foreground">{(value as User)?.email}</div>
          <div className="text-xs text-muted-foreground">{(value as User)?.phone}</div>
        </>
      ),
    emailAndPhone:
      !(value as User)?.email && !(value as User)?.phone ? (
        <div>-</div>
      ) : (
        <>
          <div className="truncate">{(value as User)?.email}</div>
          <div className="text-xs text-muted-foreground">{(value as User)?.phone}</div>
        </>
      ),
  }

  if (type && type in componentsByType) {
    return componentsByType[type]
  }

  return String(value ?? "")
}
