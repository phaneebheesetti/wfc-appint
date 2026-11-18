"use client"

import { ChevronDown, Gift } from "lucide-react"
import { useId, useState } from "react"

import { PrizeFlyerModal, isPdfFlyer } from "@/components/prizes/prize-flyer-modal"
import { type PrizeProgramOption, usePrizeTemplates } from "@/components/prizes/use-prize-templates"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { HOME_RUN_PRIZE_TEMPLATE_ROLES, type PrizeTemplateSelection } from "@/constants/prize-selection"
import { type RolesEnum } from "@/constants/roles"
import { useLoggedInUser } from "@/hooks/use-logged-in-user"
import { cn } from "@/utils/cn"

export type PrizeProgramSelectProps = {
  value: PrizeTemplateSelection
  onChange: (value: PrizeTemplateSelection) => void
  disabled?: boolean
  className?: string
}

export function PrizeProgramOptions({ value, onChange, disabled = false, className }: PrizeProgramSelectProps) {
  const groupId = useId()
  const { loggedInRole, isLoading: isRoleLoading } = useLoggedInUser()
  const [flyerFor, setFlyerFor] = useState<PrizeProgramOption | null>(null)
  const [isOpen, setIsOpen] = useState(true)

  const canSelectHomeRun = HOME_RUN_PRIZE_TEMPLATE_ROLES.includes(loggedInRole as RolesEnum)

  const { templates, options } = usePrizeTemplates()

  if (isRoleLoading) {
    return (
      <div className={cn("flex flex-col gap-3", className)}>
        <Skeleton className="h-6 w-64 rounded-control" />
        <Skeleton className="h-[4.5rem] w-full rounded-control" />
      </div>
    )
  }

  if (!canSelectHomeRun) {
    return null
  }

  const visibleOptions: PrizeProgramOption[] =
    value && !templates.some(template => template.id === value)
      ? [{ id: value, name: "Previously selected template", subtitle: null, flyerImageUrl: null }, ...options]
      : options

  return (
    <div className={cn("rounded-control border bg-muted/30", className)}>
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-rose-100 text-rose-600">
          <Gift className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold">Prize program</div>
          <div className="text-xs text-muted-foreground">Reward participants with prizes that fuel engagement.</div>
        </div>
        <ChevronDown
          className={cn("h-5 w-5 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")}
        />
      </button>

      {isOpen && (
        <div className={cn("flex flex-col gap-3 px-4 pb-4", disabled && "opacity-60")}>
          {visibleOptions.map(template => {
            const isSelected = template.id === value
            const rowId = `${groupId}-${template.id}`

            return (
              <div key={rowId} className="flex items-start gap-2">
                <Checkbox
                  id={rowId}
                  className="mt-1"
                  checked={isSelected}
                  disabled={disabled}
                  onCheckedChange={checked => checked && onChange(template.id)}
                />

                <div className="min-w-0">
                  <Label htmlFor={rowId} className="cursor-pointer font-semibold">
                    {template.name}
                  </Label>

                  {template.subtitle && (
                    <p className="text-xs text-muted-foreground">
                      {template.subtitle}
                      {template.flyerImageUrl && (
                        <>
                          {" "}
                          {isPdfFlyer(template.flyerImageUrl) ? (
                            <a
                              href={template.flyerImageUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              // "View Flyer" alone is a non-unique accessible name across rows.
                              aria-label={`View flyer for ${template.name}`}
                              aria-disabled={disabled}
                              onClick={event => disabled && event.preventDefault()}
                              className={cn(
                                "font-medium underline underline-offset-2 hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                                disabled && "pointer-events-none opacity-50"
                              )}
                            >
                              View Flyer
                            </a>
                          ) : (
                            <button
                              type="button"
                              disabled={disabled}
                              // "View Flyer" alone is a non-unique accessible name across rows.
                              aria-label={`View flyer for ${template.name}`}
                              onClick={() => setFlyerFor(template)}
                              className="font-medium underline underline-offset-2 hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            >
                              View Flyer
                            </button>
                          )}
                        </>
                      )}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {flyerFor?.flyerImageUrl && (
        <PrizeFlyerModal
          open={!!flyerFor}
          onOpenChange={open => !open && setFlyerFor(null)}
          templateName={flyerFor.name}
          subtitle={flyerFor.subtitle}
          flyerImageUrl={flyerFor.flyerImageUrl}
        />
      )}
    </div>
  )
}
