import { useState } from "react"

import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command"
import { Input } from "@/components/ui/input"
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover"
import { cn } from "@/utils/cn"

export type Suggestions = {
  key: string | number
  val: string
}
export type SetEmptyMessage = (msg: string) => void
export type UpdateSuggestions = (suggestions: Suggestions[]) => void
export type TypeaheadProps = {
  value: string
  onChange: (enteredValue: string, setEmptyMessage: SetEmptyMessage, updateSuggestions: UpdateSuggestions) => void
  onSelect: (chosenOption: Suggestions) => void
  allowScrollWheelNav?: boolean
  error?: boolean
  className?: string
  placeholder?: string
}

export function Typeahead({
  value,
  onChange,
  onSelect,
  allowScrollWheelNav = false,
  error,
  className,
  placeholder,
}: TypeaheadProps) {
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [emptyMessage, setEmptyMessage] = useState("")
  const [suggestions, setSuggestions] = useState<Suggestions[]>([])

  return (
    <Popover open={popoverOpen}>
      <PopoverAnchor>
        <Input
          type="text"
          value={value}
          placeholder={placeholder}
          className={cn(
            error
              ? "border-destructive focus-visible:border-destructive"
              : "focus-visible:border-input-background-active",
            className
          )}
          onChange={e => {
            setPopoverOpen(e.target.value.length !== 0)
            onChange(e.target.value, setEmptyMessage, setSuggestions)
          }}
          onBlur={() => {
            setPopoverOpen(false)
          }}
        />
      </PopoverAnchor>
      <PopoverContent
        align="start"
        style={{ width: "var(--radix-popper-anchor-width)" }}
        onOpenAutoFocus={e => e.preventDefault()}
        onMouseDown={e => e.preventDefault()}
      >
        <Command>
          <CommandList
            className="max-h-[min(300px,calc(var(--radix-popper-available-height)-2rem))]"
            onWheel={e => (allowScrollWheelNav ? e.stopPropagation() : "")}
          >
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {suggestions?.map(currSuggestion => (
                <CommandItem
                  key={currSuggestion.key}
                  onSelect={() => {
                    onSelect(currSuggestion)
                    setPopoverOpen(false)
                  }}
                >
                  {currSuggestion.val}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
