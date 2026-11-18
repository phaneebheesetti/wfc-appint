import { MapPin } from "lucide-react"

import { cn } from "@/utils/cn"

interface AddressProps {
  street?: string
  city?: string
  state?: string
  postalCode?: string
  showIcon?: boolean
  className?: string
}

export function Address({ street, city, state, postalCode, showIcon = false, className }: AddressProps) {
  if (!street && !city && !state && !postalCode) return "-"

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {showIcon && <MapPin className="shrink-0 text-muted-foregroundf" />}

      <address className="flex flex-col not-italic">
        {street && <div className="text-sm">{street}</div>}
        {(city ?? state ?? postalCode) && (
          <div className="text-xs">
            {city}
            {city && state ? ", " : ""}
            {state} {postalCode}
          </div>
        )}
      </address>
    </div>
  )
}
