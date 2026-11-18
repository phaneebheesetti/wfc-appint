"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { InfoTooltip } from "@/components/ui/tooltip"
import { cn } from "@/utils/cn"

const pinSchema = z.object({
  pin: z
    .array(z.string())
    .length(4)
    .refine(val => val.every(char => /^[0-9a-zA-Z]$/.test(char)), {
      message: "PIN must contain 4 alphanumeric characters",
    }),
})

export interface CampaignOption {
  campaignId: string
  campaignName: string
  organizationId: string
  organizationName: string
  stripeAccount: string
}

type PinFormValues = z.infer<typeof pinSchema>

export interface ValidatedPinWithCampaigns {
  userId: string
  campaigns: CampaignOption[]
  pin: string
}

interface PaymentPinFormProps {
  onPinWithCampaignsValidated: (validatedPinWithCampaigns: ValidatedPinWithCampaigns) => void
  step: "pin" | "confirmation" | "form" | null
}

export function PaymentPinForm({ onPinWithCampaignsValidated, step }: PaymentPinFormProps) {
  const searchParams = useSearchParams()
  const [error, setError] = useState<string>("")
  const [participantName, setParticipantName] = useState<string | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const pin = searchParams.get("pin")

  const totalPinFields = 4

  const form = useForm<PinFormValues>({
    resolver: zodResolver(pinSchema),
    defaultValues: {
      pin: ["", "", "", ""],
    },
  })

  const onSubmit = async (data: PinFormValues) => {
    const combinedPin = data.pin.join("")
    setError("")
    setIsValidating(true)

    try {
      const response = await fetch("/api/payment/pin-validation", {
        method: "POST",
        body: JSON.stringify({ pin: combinedPin }),
      })

      const json = (await response.json()) as {
        data?: { isValid: boolean; userId?: string; campaigns: CampaignOption[]; participantName?: string }
        error?: string
      }

      if (!response.ok || !json.data?.isValid || !json.data.userId || !json.data.campaigns.length) {
        throw new Error(json.error ?? "Invalid PIN. Please check your PIN and try again.")
      }

      const { userId, campaigns, participantName } = json.data

      setParticipantName(participantName ?? null)

      onPinWithCampaignsValidated({
        userId,
        campaigns,
        pin: combinedPin,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid PIN. Please check your PIN and try again.")
    } finally {
      setIsValidating(false)
    }
  }

  useEffect(() => {
    if (!pin) return

    const isPinValid = pin.length === 4 && /^[0-9a-zA-Z]{4}$/.test(pin)

    if (isPinValid) {
      form.reset({ pin: pin.split("") })

      void form.handleSubmit(onSubmit)()
    }
  }, [pin, form])

  const readOnly = step !== "pin"

  const handlePinChange = (index: number, value: string) => {
    const newPin = [...form.getValues().pin]
    newPin[index] = value
    form.setValue("pin", newPin, { shouldValidate: true })
  }

  return (
    <div className="flex flex-col gap-6 text-left w-full">
      {step === "pin" && <div className="text-base font-semibold">Make a Payment</div>}
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6 w-full">
        <div className="flex flex-col gap-2">
          {step === "confirmation" && participantName && (
            <div className="text-sm font-medium">Participant Name: {participantName}</div>
          )}
          <div className="flex flex-row items-center gap-2">
            <div className="text-sm font-medium">
              {!readOnly && "Add"} Participant PIN
              {readOnly && `: ${form.getValues().pin.join("").toLocaleUpperCase()}`}
            </div>

            <InfoTooltip
              content="Participant PIN is a 4-digit code that is used to identify the participant in the payment process."
              side="top"
            />
          </div>

          <div className={cn("flex gap-0 w-full", readOnly && "hidden")}>
            {Array.from({ length: totalPinFields }).map((_, index) => {
              const isFirstField = index === 0
              const isLastField = index === totalPinFields - 1

              return (
                <Input
                  key={index}
                  type="text"
                  maxLength={1}
                  readOnly={readOnly}
                  value={form.getValues().pin[index] ?? ""}
                  className={cn(
                    "h-12 text-center text-xl w-full rounded-none border border-gray-300 border-r-0 uppercase",
                    isFirstField && "rounded-l-md",
                    isLastField && "rounded-r-md border-r-1",
                    error && "border-red-500",
                    readOnly && "bg-gray-100 cursor-not-allowed"
                  )}
                  onChange={e => {
                    const value = e.target.value.replace(/[^0-9a-zA-Z]/g, "")
                    handlePinChange(index, value)

                    if (value) {
                      const nextInput = e.currentTarget.parentElement?.querySelector(
                        `input:nth-child(${index + 2})`
                      ) as HTMLInputElement | null

                      if (nextInput) {
                        nextInput.focus()
                      }
                    }
                  }}
                  onKeyDown={e => {
                    if (e.key === "Backspace" && !e.currentTarget.value) {
                      handlePinChange(index, "")

                      const prevInput = e.currentTarget.parentElement?.querySelector(
                        `input:nth-child(${index})`
                      ) as HTMLInputElement | null

                      if (prevInput) {
                        prevInput.focus()
                      }
                    }
                  }}
                />
              )
            })}
          </div>
        </div>

        {!readOnly && (
          <>
            {error && <div className="text-sm text-red-500">{error}</div>}

            <Button className="w-full" disabled={!form.formState.isValid || isValidating || readOnly}>
              {isValidating ? "Validating..." : "Next"}
            </Button>
          </>
        )}
      </form>
    </div>
  )
}
