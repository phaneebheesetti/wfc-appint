import { X } from "lucide-react"

import { Button } from "./button"
import { WithTooltip } from "./tooltip"

interface SelectionBarProps {
  selectedCount: number
  onClearSelection: () => void
  children: React.ReactNode
}

export function SelectionBar({ selectedCount, onClearSelection, children }: SelectionBarProps) {
  if (selectedCount === 0) return null

  return (
    <div className="flex items-center p-2 rounded-md border w-fit mx-auto mt-4 sticky bottom-0 bg-white">
      <div className="flex flex-row items-center gap-2 bg-gray-100 p-2 rounded-md text-sm mr-2 h-10">
        <span className="mr-2">{selectedCount} selected</span>
        <WithTooltip
          content={"Unselect all"}
          side="top"
          trigger={
            <Button
              variant="secondary"
              onClick={() => {
                onClearSelection()
              }}
              className="mr-2 p-0 h-10 text-gray-600 hover:text-black"
            >
              <X />
            </Button>
          }
        />
      </div>

      {children}
    </div>
  )
}
