import { Info } from "lucide-react"

import { WithTooltip, type WithTooltipProps } from "./with-tooltip"

export function InfoTooltip(props: Omit<WithTooltipProps, "trigger">) {
  return <WithTooltip {...props} trigger={<Info className="h-4 w-4 text-muted-foreground" />} />
}
