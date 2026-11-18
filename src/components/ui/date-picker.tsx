import { CalendarIcon } from "lucide-react"
import { useRef } from "react"

import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/utils/cn"
import { formatDate } from "@/utils/date"

interface DatePickerProps {
  value?: Date
  fromDate?: Date
  placeholder?: string
  onChange?: (date: Date | null) => void
  className?: string
}

export const DatePicker = ({ value, fromDate, placeholder, onChange, className }: DatePickerProps) => {
  const calendarPopoverCloseRef = useRef<HTMLButtonElement | null>(null)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className="relative">
          <Input
            readOnly
            placeholder={placeholder}
            className={cn("w-full", !value && "text-muted-foreground", className)}
            value={value ? formatDate(value, { month: "short", day: "numeric", year: "numeric" }) : ""}
          />
          <CalendarIcon className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="center">
        <PopoverClose className="hidden" ref={calendarPopoverCloseRef} />
        <Calendar
          mode="single"
          selected={value}
          onSelect={day => {
            onChange?.(day ?? null)
            calendarPopoverCloseRef.current?.click()
          }}
          initialFocus
          fromDate={fromDate}
        />
      </PopoverContent>
    </Popover>
  )
}
