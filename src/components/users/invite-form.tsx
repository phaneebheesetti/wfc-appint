"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Mail } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Form } from "@/components/ui/form"
import { type FormField, FormFieldWrapper } from "@/components/ui/form-field-wrapper"
import { RolesEnum } from "@/constants/roles"
import { getRolesSelectOptions } from "@/utils/roles"

const formSchema = z.object({
  email: z.email("Invalid email").min(1, "Required"),
  role: z.enum(RolesEnum, { error: "Required" }),
})

type FormValues = z.infer<typeof formSchema>

interface InviteFormProps {
  onSubmit: (data: FormValues) => Promise<void>
  roles?: RolesEnum[]
  defaultRole?: RolesEnum
}

export function InviteForm({ onSubmit, roles = [], defaultRole }: InviteFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      role: defaultRole,
    },
  })

  const formFields: FormField<FormValues>[] = [
    {
      name: "email",
      label: "Email",
      type: "email",
      required: true,
    },
    {
      name: "role",
      label: "Role",
      type: "select",
      description: "This will determine their permission level.",
      options: getRolesSelectOptions(roles),
      required: true,
    },
  ]

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {formFields.map(field => (
          <FormFieldWrapper key={field.name} {...field} control={form.control} />
        ))}

        <div className="flex justify-end">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            <Mail />
            {form.formState.isSubmitting ? "Sending..." : "Send invitation"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
