"use client"

import parsePhoneNumberFromString from "libphonenumber-js"
import { useEffect, useRef, useState } from "react"

import { cn } from "@/utils/cn"

type User = {
  id: string
  fullName: string
  email: string
  phone: string
}

type Props = {
  value: User | null
  onChange: (val: User | null) => void
  options: User[]
  onInputChange: (val: string) => void
  error?: boolean
}

export function Combobox({ value, onChange, options, onInputChange, error }: Props) {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const formatPhoneNumber = (phoneNumber: string) => {
    let formattedFCPhoneNumber = null
    if (!!phoneNumber) {
      const phone = parsePhoneNumberFromString(phoneNumber)
      if (phone?.isValid()) {
        formattedFCPhoneNumber = phone.formatNational()
      } else {
        formattedFCPhoneNumber = phoneNumber
      }
      return formattedFCPhoneNumber
    } else {
      return false
    }
  }

  useEffect(() => {
    if (value && !isTyping) {
      setQuery(value.fullName)
    }
  }, [value, isTyping])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) {
        // This validates whether the value in input field matches name in options
        onInputChange(query)
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [query])

  // Filter the options based on the text in input field
  const filtered = options.filter(
    opt =>
      opt.fullName.toLowerCase().includes(query.toLowerCase()) || opt.email.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div ref={ref} className="relative col-span-2 -mt-3">
      <input
        value={query}
        placeholder="Search by Name or Email"
        onFocus={() => setOpen(true)}
        onChange={e => {
          setIsTyping(true)
          setQuery(e.target.value)
          if (!e.target.value) {
            onChange(null)
          }
        }}
        className={cn(
          "w-full border-[1px] border-input rounded-control px-3 py-[7px] placeholder:text-sm focus:border-[1.5px] focus:outline-none focus:ring-0",
          error ? "border-destructive focus:border-destructive" : "border-input focus:border-input-background-active"
        )}
      />

      {open && (
        <div className="absolute z-50 mt-1 w-full border rounded bg-white shadow-elev-2 max-h-[160px] overflow-y-auto">
          {filtered.length === 0 && <div className="p-2 text-sm text-gray-500">No results found</div>}

          {filtered.map(opt => {
            const isSelected = query !== "" && value?.id === opt.id && query === value.fullName

            return (
              <div
                key={opt.id}
                onClick={() => {
                  onChange(opt)
                  setQuery(opt.fullName)
                  setIsTyping(false)
                  setOpen(false)
                }}
                className={`p-3 cursor-pointer hover:bg-accent hover:text-accent-foreground ${
                  isSelected ? "bg-accent" : ""
                }`}
              >
                <div className="font-medium">{opt.fullName}</div>
                <div className="text-sm text-gray-500">{opt.email}</div>
                <div className="text-sm text-gray-500">
                  {!!formatPhoneNumber(opt.phone) && <div className="text-sm">{formatPhoneNumber(opt.phone)}</div>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
