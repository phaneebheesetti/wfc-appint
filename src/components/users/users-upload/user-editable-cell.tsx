import { useState } from "react"
import { z } from "zod"

import { Input } from "@/components/ui/input"
import { cn } from "@/utils/cn"

interface UserEditableCellProps {
  rowIndex: number
  columnId: string
  initialValue: string
  isChanged: boolean
  onCommit: (rowIndex: number, columnId: string, newValue: string) => void
}

export function UserEditableCell({
  rowIndex,
  columnId,
  initialValue = "",
  isChanged,
  onCommit,
}: UserEditableCellProps) {
  const [localValue, setLocalValue] = useState(initialValue)

  let isInvalid = initialValue === ""

  if (columnId === "eligible") {
    isInvalid = !z.string().optional().or(z.literal("")).safeParse(initialValue).success
  }

  if (["participantEmail", "parentEmail"].includes(columnId)) {
    isInvalid = !z.string().email("Invalid email").optional().or(z.literal("")).safeParse(initialValue).success
  }

  if (["participantPhone", "parentPhone"].includes(columnId)) {
    isInvalid = !z.string().optional().or(z.literal("")).safeParse(initialValue).success
  }

  return (
    <Input
      type="text"
      value={localValue}
      className={cn(
        "w-full rounded-none pl-1",
        isChanged ? "bg-yellow-50" : "",
        isInvalid ? "bg-destructive/10 border-b border-destructive border-t-0 border-l-0 border-r-0" : "border-none"
      )}
      onChange={e => setLocalValue(e.target.value)}
      onBlur={() => onCommit(rowIndex, columnId, localValue)}
    />
  )
}
