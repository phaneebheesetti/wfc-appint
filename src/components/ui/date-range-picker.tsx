"use client"

import { CalendarX } from "lucide-react"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useIsMobile } from "@/hooks/use-mobile"

interface DateRange {
  from: Date | undefined
  to: Date | undefined
}

interface Preset {
  name: string
  label: string
  from: Date
  to: Date
}

export interface DateRangePickerProps {
  initialDateFrom?: Date
  initialDateTo?: Date
  onChange?: (range: DateRange) => void
  onClear?: () => void
}

const PRESETS: Preset[] = [
  { name: "today", label: "Today" },
  { name: "yesterday", label: "Yesterday" },
  { name: "last7", label: "Last 7 days" },
  { name: "last14", label: "Last 14 days" },
  { name: "last30", label: "Last 30 days" },
  { name: "thisWeek", label: "This Week" },
  { name: "lastWeek", label: "Last Week" },
  { name: "thisMonth", label: "This Month" },
  { name: "lastMonth", label: "Last Month" },
].map(preset => {
  const from = new Date()
  const to = new Date()
  const first = from.getDate() - from.getDay()

  switch (preset.name) {
    case "today":
      from.setHours(0, 0, 0, 0)
      to.setHours(23, 59, 59, 999)
      break
    case "yesterday":
      from.setDate(from.getDate() - 1)
      from.setHours(0, 0, 0, 0)
      to.setDate(to.getDate() - 1)
      to.setHours(23, 59, 59, 999)
      break
    case "last7":
      from.setDate(from.getDate() - 6)
      from.setHours(0, 0, 0, 0)
      to.setHours(23, 59, 59, 999)
      break
    case "last14":
      from.setDate(from.getDate() - 13)
      from.setHours(0, 0, 0, 0)
      to.setHours(23, 59, 59, 999)
      break
    case "last30":
      from.setDate(from.getDate() - 29)
      from.setHours(0, 0, 0, 0)
      to.setHours(23, 59, 59, 999)
      break
    case "thisWeek":
      from.setDate(first)
      from.setHours(0, 0, 0, 0)
      to.setHours(23, 59, 59, 999)
      break
    case "lastWeek":
      from.setDate(from.getDate() - 7 - from.getDay())
      to.setDate(to.getDate() - to.getDay() - 1)
      from.setHours(0, 0, 0, 0)
      to.setHours(23, 59, 59, 999)
      break
    case "thisMonth":
      from.setDate(1)
      from.setHours(0, 0, 0, 0)
      to.setHours(23, 59, 59, 999)
      break
    case "lastMonth":
      from.setMonth(from.getMonth() - 1)
      from.setDate(1)
      from.setHours(0, 0, 0, 0)
      to.setDate(0)
      to.setHours(23, 59, 59, 999)
      break
  }

  return { from, to, name: preset.name, label: preset.label }
})

export const DateRangePicker = ({ initialDateFrom, initialDateTo, onChange, onClear }: DateRangePickerProps) => {
  const isMobile = useIsMobile()

  const [range, setRange] = useState<DateRange>({
    from: initialDateFrom ?? undefined,
    to: initialDateTo ?? undefined,
  })
  const [selectedPreset, setSelectedPreset] = useState<string | undefined>(undefined)

  const setPreset = (preset: string): void => {
    const presetRange = PRESETS.find(p => p.name === preset)
    if (!presetRange) return

    setRange({ from: presetRange.from, to: presetRange.to })
  }

  const checkPreset = (): void => {
    if (range.from === undefined || range.to === undefined) return

    const presetRange = PRESETS.find(p => {
      return (
        p.from.getDate() === range.from?.getDate() &&
        p.from.getMonth() === range.from?.getMonth() &&
        p.from.getFullYear() === range.from?.getFullYear() &&
        p.to.getDate() === range.to?.getDate() &&
        p.to.getMonth() === range.to?.getMonth() &&
        p.to.getFullYear() === range.to?.getFullYear()
      )
    })

    if (presetRange) {
      setSelectedPreset(presetRange.name)
    } else {
      setSelectedPreset(undefined)
    }
  }

  useEffect(() => {
    checkPreset()
    onChange?.(range)
  }, [range])

  return (
    <div className="flex flex-col">
      <div className="flex justify-center items-center p-3">
        <Select value={selectedPreset} onValueChange={setPreset}>
          <SelectTrigger>
            <SelectValue placeholder="Choose a date range preset..." />
          </SelectTrigger>
          <SelectContent>
            {PRESETS.map(preset => (
              <SelectItem key={preset.name} value={preset.name}>
                {preset.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Calendar
          mode="range"
          onSelect={(value, day) =>
            setRange(prevRange => {
              if (prevRange.from && prevRange.to) return { from: day, to: undefined }

              const from = value?.from ? new Date(value.from) : undefined
              const to = value?.to ? new Date(value.to) : undefined
              to?.setHours(23, 59, 59, 999)

              return { from, to } as DateRange
            })
          }
          selected={range}
          numberOfMonths={isMobile ? 1 : 2}
          defaultMonth={new Date(new Date().setMonth(new Date().getMonth() - (isMobile ? 0 : 1)))}
        />
      </div>

      {range.from && range.to && (
        <div className="flex justify-center items-center pb-3">
          <Button
            variant="outline"
            onClick={() => {
              setRange({ from: undefined, to: undefined })
              onClear?.()
            }}
          >
            <CalendarX />
            Clear Selection
          </Button>
        </div>
      )}
    </div>
  )
}
