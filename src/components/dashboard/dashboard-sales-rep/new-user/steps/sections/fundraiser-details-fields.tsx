"use client"

import { type Control, useWatch } from "react-hook-form"
import { z } from "zod"

import { type FormField, FormFieldWrapper } from "@/components/ui/form-field-wrapper"

// Shared schema + fields for the "Create Fundraiser" step. Used by the FC onboarding Step 2 and the
// Add-Fundraiser popup so the form stays identical in both places.
export const fundraiserDetailsSchema = z
  .object({
    name: z.string({ error: "Fundraiser name is required" }).trim().min(1, "Fundraiser name is required"),
    startDate: z.date({ error: "Please select a date" }),
    endDate: z.date({ error: "Please select a date" }),
  })
  .refine(data => data.endDate >= data.startDate, {
    message: "End date must be on or after start date",
    path: ["endDate"],
  })

export type FundraiserDetailsValues = z.infer<typeof fundraiserDetailsSchema>

export function FundraiserDetailsFields({ control }: { control: Control<FundraiserDetailsValues> }) {
  // End date can't precede the start date — clamp the picker as soon as a start date is chosen.
  const startDate = useWatch({ control, name: "startDate" })

  const fields: FormField<FundraiserDetailsValues>[] = [
    { name: "name", label: "Fundraiser Name", type: "text", required: true, className: "sm:col-span-2" },
    { name: "startDate", label: "Start date", type: "date", required: true, className: "col-span-1" },
    {
      name: "endDate",
      label: "End date",
      type: "date",
      required: true,
      className: "col-span-1",
      fromDate: startDate ?? undefined,
    },
  ]

  return (
    <>
      {fields.map(field => (
        <FormFieldWrapper key={field.name} {...field} control={control} />
      ))}
    </>
  )
}
