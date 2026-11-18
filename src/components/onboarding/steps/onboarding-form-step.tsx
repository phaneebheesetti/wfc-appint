"use client"

import { useAuth, useClerk } from "@clerk/nextjs"
import { isClerkAPIResponseError } from "@clerk/nextjs/errors"
import { useSignUp } from "@clerk/nextjs/legacy"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter, useSearchParams } from "next/navigation"
import { useCallback } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Form } from "@/components/ui/form"
import { FormFieldWrapper } from "@/components/ui/form-field-wrapper"
import { usersFormFields, usersFormSchema } from "@/utils/users"

import { OnboardingStepEnum } from "../onboarding"

const formSchema = usersFormSchema.extend({
  lastName: z.string("Required").min(1, "Required"),
})

type FormValues = z.infer<typeof formSchema>

interface OnboardingFormStepProps {
  onStepChange: (step: OnboardingStepEnum) => void
}

export function OnboardingFormStep({ onStepChange }: OnboardingFormStepProps) {
  const { signUp, setActive } = useSignUp()
  const { isSignedIn } = useAuth()
  const { signOut } = useClerk()
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get("__clerk_ticket")
  const invitedRole = searchParams.get("role")
  const invitedDatabaseId = searchParams.get("databaseId")

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  })

  const getClerkUserId = useCallback(async () => {
    try {
      if (!signUp || !token) throw new Error("Failed to create account, please contact support.")

      // Clerk rejects signUp.create with strategy=ticket while a session is
      // already active (error code session_exists / "You're already signed
      // in"). This can happen if the invitee clicks the link in a browser
      // that still has a Clerk cookie from another flow — sign them out
      // first so the ticket can be consumed.
      if (isSignedIn) {
        await signOut()
      }

      const signUpAttemptResult = await signUp.create({
        strategy: "ticket",
        ticket: token,
      })
      if (signUpAttemptResult.status !== "complete" || !signUpAttemptResult.createdUserId) {
        throw new Error("Failed to create account, please contact support.")
      }

      await setActive({ session: signUpAttemptResult.createdSessionId })

      return signUpAttemptResult.createdUserId
    } catch (error) {
      const clerkErrors = ["invitation_already_accepted", "invitation_account_exists"]

      if (isClerkAPIResponseError(error) && clerkErrors.includes(error?.errors?.[0]?.code ?? "")) {
        router.push(invitedRole ? `/dashboard?role=${invitedRole}` : "/dashboard")
        return
      }

      // Clerk rejects ticket signup if it sees an active session. Sign out
      // and reload so the ticket can be consumed on the next pass.
      const sessionErrors = ["session_exists", "client_session_exists", "you_are_already_signed_in"]
      if (isClerkAPIResponseError(error) && sessionErrors.includes(error?.errors?.[0]?.code ?? "")) {
        await signOut({ redirectUrl: window.location.href })
        return
      }

      return onStepChange(OnboardingStepEnum.FINISHED_FAILURE)
    }
  }, [signUp, token, invitedRole, onStepChange, setActive, router, isSignedIn, signOut])

  const onSubmit = async (data: FormValues) => {
    try {
      // Pre-check the phone BEFORE signUp.create runs. Otherwise the
      // invitation ticket gets consumed and a duplicate-phone error would
      // leave the user stuck — retrying after editing the phone would hit
      // `invitation_account_exists` and silently redirect them away.
      if (data.phone && invitedDatabaseId) {
        const preCheck = await fetch(`/api/users/validate-phone`, {
          method: "POST",
          body: JSON.stringify({ phone: data.phone, databaseId: invitedDatabaseId }),
        })
        if (!preCheck.ok) {
          const errorData = (await preCheck.json()) as { error?: string }
          throw new Error(errorData?.error ?? "Unable to validate phone number")
        }
      }

      const clerkUserId = await getClerkUserId()
      if (typeof clerkUserId !== "string") return

      const response = await fetch(`/api/accept-invitation`, {
        method: "POST",
        body: JSON.stringify({
          clerkUserId,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error)
      }

      const payload = (await response.json()) as { data?: { redirectTo?: string | null } }
      if (payload?.data?.redirectTo) {
        window.location.assign(payload.data.redirectTo)
        return
      }

      return onStepChange(OnboardingStepEnum.FINISHED_SUCCESS)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An unknown error occurred")
    }
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-md mb-4">
      <div className="flex flex-col gap-3 text-center md:text-left">
        <h2 className="text-2xl font-semibold">Complete Sign Up</h2>

        <p className="text-sm text-muted-foreground">
          To complete your sign up, please provide your information in the form below. This helps us create your account
          and ensure a smooth onboarding experience.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
          {usersFormFields({
            fieldsProps: {
              firstName: {
                required: true,
                className: "col-span-2 md:col-span-1",
              },
              lastName: {
                required: true,
                className: "col-span-2 md:col-span-1",
              },
              phone: {
                labelSmall: " (optional)",
              },
            },
            hiddenFields: ["email", "grade", "teacherName"],
          }).map(field => (
            <FormFieldWrapper key={field.name} {...field} control={form.control} />
          ))}

          <Button type="submit" disabled={form.formState.isSubmitting} className="w-full col-span-2">
            {form.formState.isSubmitting ? "Creating..." : "Create account"}
          </Button>
        </form>
      </Form>

      <div id="clerk-captcha" />
    </div>
  )
}
