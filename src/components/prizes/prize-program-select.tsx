"use client"

import { useEffect, useId, useState } from "react"

import { PrizeFlyerModal, isPdfFlyer } from "@/components/prizes/prize-flyer-modal"
import { type PrizeProgramOption, usePrizeTemplates } from "@/components/prizes/use-prize-templates"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { InfoTooltip } from "@/components/ui/tooltip"
import {
  HOME_RUN_PRIZE_TEMPLATE_INFO,
  HOME_RUN_PRIZE_TEMPLATE_ROLES,
  HOME_RUN_PRIZE_TEMPLATE_SINGLE_USE_HINT,
  HOME_RUN_PRIZE_TEMPLATE_TOGGLE_LABEL,
  type PrizeTemplateSelection,
} from "@/constants/prize-selection"
import { type RolesEnum } from "@/constants/roles"
import { useLoggedInUser } from "@/hooks/use-logged-in-user"
import { cn } from "@/utils/cn"

export type PrizeProgramSelectProps = {
  value: PrizeTemplateSelection
  onChange: (value: PrizeTemplateSelection) => void
  disabled?: boolean
  className?: string
}

export function PrizeProgramSelect({ value, onChange, disabled = false, className }: PrizeProgramSelectProps) {
  const groupId = useId()
  const { loggedInRole, isLoading: isRoleLoading } = useLoggedInUser()
  const [flyerFor, setFlyerFor] = useState<PrizeProgramOption | null>(null)
  const [lastSelectedId, setLastSelectedId] = useState<PrizeTemplateSelection>(value)

  useEffect(() => {
    if (value) {
      setLastSelectedId(value)
    }
  }, [value])

  const canSelectHomeRun = HOME_RUN_PRIZE_TEMPLATE_ROLES.includes(loggedInRole as RolesEnum)

  const { templates } = usePrizeTemplates()

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

  const visibleTemplates: PrizeProgramOption[] =
    value && !templates.some(template => template.id === value)
      ? [{ id: value, name: "Previously selected template", subtitle: null, flyerImageUrl: null }, ...templates]
      : templates

  const isEnabled = value !== null

  const handleToggle = (checked: boolean) => {
    if (!checked) {
      onChange(null)
      return
    }

    const restoredId =
      lastSelectedId && visibleTemplates.some(template => template.id === lastSelectedId)
        ? lastSelectedId
        : (visibleTemplates[0]?.id ?? null)

    onChange(restoredId)
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center gap-2">
        <Switch
          id={`${groupId}-toggle`}
          checked={isEnabled}
          disabled={disabled || visibleTemplates.length === 0}
          onCheckedChange={handleToggle}
        />
        <Label htmlFor={`${groupId}-toggle`} className="cursor-pointer">
          {HOME_RUN_PRIZE_TEMPLATE_TOGGLE_LABEL}
        </Label>

        <InfoTooltip side="top" content={HOME_RUN_PRIZE_TEMPLATE_INFO} />
      </div>

      {isEnabled && (
        <div className={cn("ml-6 flex flex-col gap-3", disabled && "opacity-60")}>
          {visibleTemplates.map(template => {
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

          <p className="text-xs text-muted-foreground">{HOME_RUN_PRIZE_TEMPLATE_SINGLE_USE_HINT}</p>
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
