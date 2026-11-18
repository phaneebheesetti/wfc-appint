import { forwardRef } from "react"

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/utils/cn"

export interface WithTooltipProps {
  content: React.ReactNode
  trigger: React.ReactNode
  delayDuration?: number
  side?: "left" | "right" | "top" | "bottom"
  tooltipTriggerClassnames?: string
}

export const WithTooltip = forwardRef<HTMLButtonElement, WithTooltipProps>(
  ({ content, trigger, delayDuration = 0, side = "right", tooltipTriggerClassnames }, ref) => {
    if (!content) {
      return trigger
    }

    return (
      <TooltipProvider delayDuration={delayDuration}>
        <Tooltip>
          <TooltipTrigger asChild ref={ref}>
            <div className={cn(tooltipTriggerClassnames)}>{trigger}</div>
          </TooltipTrigger>

          <TooltipContent side={side}>{content}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }
)

WithTooltip.displayName = "WithTooltip"
