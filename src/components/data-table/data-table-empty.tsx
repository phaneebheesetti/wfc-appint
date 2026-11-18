import { type LucideIcon, Package, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

import { type NewButtonProps } from "./data-table"

export interface DataTableEmptyProps {
  title: string
  description?: string
  icon?: LucideIcon
  newButton?: NewButtonProps
  proTip?: string
  searchTitle?: string
  buttonText?: string
}

export function DataTableEmpty({
  title,
  description,
  icon: Icon = Package,
  newButton,
  proTip,
  buttonText,
}: DataTableEmptyProps) {
  return (
    <Card className="border-none shadow-none min-h-96 flex flex-col items-center justify-center gap-4 p-8 bg-transparent">
      <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-stone-200">
        <Icon className="h-8 w-8" />
      </div>

      <p className="text-xl font-bold text-center">{title}</p>

      <p className="text-sm text-muted-foreground px-4 text-center max-w-xl whitespace-pre-line">{description}</p>

      {newButton && (
        <Button onClick={newButton.onClick} className="mt-4" disabled={newButton.disabled}>
          <Plus />
          {buttonText ?? newButton.text}
        </Button>
      )}

      {proTip && (
        <div className="mt-4 max-w-xl rounded-lg border p-4 text-center">
          <p className="text-sm text-muted-foreground">
            💡 <span className="font-bold text-foreground">Pro Tip:</span> {proTip}
          </p>
        </div>
      )}
    </Card>
  )
}
