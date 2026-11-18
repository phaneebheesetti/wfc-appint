"use client"

import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/utils/cn"

interface ParentEmailsFieldProps {
  value: string[]
  onChange: (emails: string[]) => void
  canAdd?: boolean
  canRemove?: boolean
  error?: string
  disabled?: boolean
  onErrorChange?: (hasError: boolean) => void
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

export function ParentEmailsField({
  value = [],
  onChange,
  canAdd = true,
  canRemove = true,
  error,
  disabled,
  onErrorChange,
}: ParentEmailsFieldProps) {
  const [inputValue, setInputValue] = useState("")
  const [inputError, setInputError] = useState<string | null>(null)

  useEffect(() => {
    onErrorChange?.(!!inputError)
  }, [inputError])

  const handleAdd = () => {
    const trimmed = inputValue.trim()
    if (!trimmed) return

    if (!isValidEmail(trimmed)) {
      setInputError("Invalid email address")
      return
    }

    if (value.map(e => e.toLowerCase()).includes(trimmed.toLowerCase())) {
      setInputError("Email already added")
      return
    }

    setInputError(null)
    onChange([...value, trimmed])
    setInputValue("")
  }

  const handleRemove = (index: number) => {
    onChange(value.filter((_, i) => i !== index))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAdd()
    }
  }

  const displayError = inputError ?? error

  return (
    <div className="col-span-2 flex flex-col gap-2">
      <div className="flex items-center gap-1">
        <span className="text-sm font-medium leading-none">Parent / Guardian email(s)</span>
        <small className="text-muted-foreground"> (optional)</small>
      </div>

      {value.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {value.map((email, index) => (
            <div key={email} className="flex flex-col gap-0.5">
              <div className="flex items-center justify-between rounded-md border border-input bg-background px-3 py-2">
                <span className="truncate text-sm">{email}</span>
                {canRemove && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="ml-2 h-6 shrink-0 px-2 text-xs"
                    onClick={() => handleRemove(index)}
                    disabled={disabled}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {canAdd && (
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="Add email address"
            value={inputValue}
            onChange={e => {
              setInputValue(e.target.value)
              if (inputError) setInputError(null)
            }}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            className={cn(displayError && "border-destructive")}
          />
          <Button type="button" onClick={handleAdd} disabled={disabled || !inputValue.trim()} className="shrink-0">
            + Add
          </Button>
        </div>
      )}

      {displayError && <p className="text-[0.8rem] font-medium text-destructive">{displayError}</p>}
    </div>
  )
}
