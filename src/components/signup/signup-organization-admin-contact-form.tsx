"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useSearchParams } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Form } from "@/components/ui/form"
import { FormFieldWrapper } from "@/components/ui/form-field-wrapper"
import { toastError } from "@/utils/errors"
import { usersFormFields, usersFormSchema } from "@/utils/users"

import { type SignupUser } from "../signup"

const formSchema = usersFormSchema.extend({
  lastName: z.string("Required").min(1, "Required"),
  email: z.email("Required").min(1, "Required"),
  message: z.string().min(1, "Required"),
})

type FormValues = z.infer<typeof formSchema>

interface SignupOrganizationAdminContactFormProps {
  user: SignupUser | null
  setUser: React.Dispatch<React.SetStateAction<SignupUser | null>>
  onSuccess: () => void
}

export function SignupOrganizationAdminContactForm({
  user,
  setUser,
  onSuccess,
}: SignupOrganizationAdminContactFormProps) {
  const searchParams = useSearchParams()
  const organizationId = searchParams.get("organizationId")

  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      message: "Hello!\nI need help connecting to my child's fundraiser account.\nThe system couldn't find a match.",
    },
  })

  const onSubmit = async (data: FormValues) => {
    if (!organizationId) {
      toastError({ error: new Error("Organization ID is missing") })
      return
    }

    try {
      setIsLoading(true)

      setUser(user => ({
        ...user,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
      }))

      const response = await fetch("/api/signup/contact-organization-admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organizationId,
          parentName: `${data.firstName} ${data.lastName}`,
          parentEmail: data.email,
          parentPhone: data.phone ?? null,
          childrenAttempted: user?.children ?? [],
          message: data.message,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error ?? "Failed to send message")
      }

      onSuccess()
    } catch (error) {
      toastError({ error, fallbackMessage: "Failed to send message. Please try again." })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
        {usersFormFields({
          fieldsProps: {
            firstName: {
              required: true,
              className: "col-span-2 md:col-span-1",
              label: "Your first name",
            },
            lastName: {
              required: true,
              className: "col-span-2 md:col-span-1",
              label: "Your last name",
            },
            email: {
              required: true,
              label: "Your email",
            },
            phone: {
              label: "Your phone number",
              labelSmall: " (optional)",
            },
          },
          hiddenFields: ["grade", "teacherName"],
        }).map(field => (
          <FormFieldWrapper key={field.name} {...field} control={form.control} />
        ))}
        <FormFieldWrapper
          name="message"
          label="Message"
          type="textarea"
          control={form.control}
          className="col-span-2"
          rows={5}
        />
        <Button type="submit" disabled={isLoading} className="w-full col-span-2">
          {isLoading ? "Sending..." : "Continue"}
        </Button>
      </form>
    </Form>
  )
}
