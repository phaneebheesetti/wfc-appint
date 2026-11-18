import copy from "copy-to-clipboard"
import { Copy } from "lucide-react"
import { toast } from "sonner"

import { RolesEnum } from "@/constants/roles"
import { useLoggedInUser } from "@/hooks"
import { cn } from "@/utils/cn"

interface FieldTextProps {
  label: React.ReactNode
  value: React.ReactNode
  invertedColor?: boolean
  encrypted?: boolean
  labelClassName?: string
  valueClassName?: string
  truncate?: boolean
  allowCopy?: boolean
  adminOnly?: boolean
}

export function FieldText({
  label,
  value,
  invertedColor = false,
  encrypted = false,
  labelClassName,
  valueClassName,
  truncate = false,
  allowCopy = false,
  adminOnly = false,
}: FieldTextProps) {
  const { loggedInRole } = useLoggedInUser()

  if (adminOnly && loggedInRole !== RolesEnum.ADMIN) {
    return null
  }

  const defaultLabelClassname = invertedColor ? "text-muted-foreground font-normal" : "text-foreground font-medium"
  const defaultValueClassname = invertedColor ? "text-foreground font-medium" : "text-muted-foreground font-normal"

  const isCopyable = typeof value === "string" && (loggedInRole === RolesEnum.ADMIN || allowCopy) && value !== ""

  const displayValue = !value || value === "" ? "-" : value

  const handleCopy = () => {
    if (typeof value !== "string" || typeof label !== "string") {
      return
    }

    copy(value?.toString() ?? "")
    toast.success(`Copied ${label} to clipboard`)
  }

  return (
    <div className="flex gap-2">
      <div className={cn("text-sm flex items-center", defaultLabelClassname, labelClassName)}>{label}:</div>
      <div
        className={cn(
          "text-sm first-letter:uppercase",
          defaultValueClassname,
          valueClassName,
          truncate && "truncate max-w-[200px]",
          isCopyable && "flex items-center gap-2"
        )}
      >
        {encrypted ? "*********" : displayValue}
        {isCopyable && <Copy size={12} className="cursor-pointer" onClick={handleCopy} />}
      </div>
    </div>
  )
}
