"use client"

import { useSignIn } from "@clerk/nextjs/legacy"
import { zodResolver } from "@hookform/resolvers/zod"
import { useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Form } from "@/components/ui/form"
import { FormFieldWrapper } from "@/components/ui/form-field-wrapper"
import { GRADE_LABEL } from "@/constants/participant-labels"
import { toastError } from "@/utils/errors"
import { usersFormFields, usersFormSchema } from "@/utils/users"

import { SignupRoleEnum, SignupStepEnum, type SignupUser } from "../signup"
import { SignupTitle } from "../signup-title"

// Thrown when the parent signup API rejects the submitted phone as already
// in use by a different person. We treat it differently from other signup
// failures: keep the user on the form so they can edit the phone field,
// rather than routing them to FINISHED_FAILURE.
class PhoneAlreadyInUseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "PhoneAlreadyInUseError"
  }
}

const formSchema = usersFormSchema.extend({
  lastName: z.string("Required").min(1, "Required"),
  email: z.email("Required").min(1, "Required"),
})

type FormValues = z.infer<typeof formSchema>

interface SignupFormStepProps {
  user: SignupUser | null
  role: SignupRoleEnum | null
  onStepChange: (step: SignupStepEnum) => void
  setUser: (user: SignupUser) => void
}

export function SignupFormStep({ user, role, onStepChange, setUser }: SignupFormStepProps) {
  const { signIn, setActive, isLoaded } = useSignIn()

  const searchParams = useSearchParams()
  const organizationId = searchParams.get("organizationId")
  const campaignId = searchParams.get("campaignId")

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: user?.firstName ?? undefined,
      lastName: user?.lastName ?? undefined,
      email: user?.email ?? undefined,
      phone: user?.phone ?? undefined,
    },
  })

  const createAndSignInParticipant = async (data: FormValues) => {
    if (!isLoaded) {
      throw new Error("Failed to complete signup, please contact support.")
    }

    const signupResponse = await fetch(`/api/signup/participant`, {
      method: "POST",
      body: JSON.stringify({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data?.phone ?? null,
      }),
    })
    const signupData = (await signupResponse.json()) as { data?: { token: string }; error?: string }

    if (!signupResponse.ok) {
      throw new Error(signupData.error)
    }

    const signInResult = await signIn.create({
      strategy: "ticket",
      ticket: signupData.data!.token,
    })
    await setActive({ session: signInResult.createdSessionId })

    return onStepChange(SignupStepEnum.FINISHED_SUCCESS)
  }

  const createAndSignInParent = async (data: FormValues) => {
    if (!isLoaded || !user) {
      throw new Error("Failed to complete signup, please contact support.")
    }

    const childrenWithId = user?.children?.filter(child => child.id !== "") ?? []

    if (childrenWithId.length === 0) {
      throw new Error("At least one child is required to sign up as a parent")
    }

    const signupResponse = await fetch(`/api/signup/parent`, {
      method: "POST",
      body: JSON.stringify({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone ?? null,
        participantsIds: childrenWithId.map(child => child.id),
        organizationId,
        campaignId,
      }),
    })
    const signupData = (await signupResponse.json()) as {
      data?: {
        token: string
        skippedChildren?: Array<{ name: string | null; grade: string | null }>
      }
      error?: string
      code?: string
    }

    if (!signupResponse.ok) {
      if (signupResponse.status === 409 && signupData.code === "PHONE_CONFLICT") {
        throw new PhoneAlreadyInUseError(
          signupData.error ?? "This phone number is already being used by another account, please use a different one."
        )
      }
      throw new Error(signupData.error)
    }

    const skipped = signupData.data?.skippedChildren ?? []
    if (skipped.length > 0) {
      const names = skipped
        .map(c => `${c.name ?? "Unknown"}${c.grade ? ` (${GRADE_LABEL}: ${c.grade})` : ""}`)
        .join(", ")
      toast.info(`Already associated with: ${names}`)
    }

    const signInResult = await signIn.create({
      strategy: "ticket",
      ticket: signupData.data!.token,
    })
    await setActive({ session: signInResult.createdSessionId })

    return onStepChange(SignupStepEnum.FINISHED_SUCCESS)
  }

  const onSubmit = async (data: FormValues) => {
    try {
      setUser({
        ...user,
        firstName: data.firstName,
        lastName: data.lastName,
        fullName: `${data.firstName} ${data.lastName}`,
        email: data.email,
        phone: data?.phone ?? null,
      })

      if (role === SignupRoleEnum.PARENT) {
        await createAndSignInParent(data)
      } else {
        await createAndSignInParticipant(data)
      }
    } catch (error) {
      if (error instanceof PhoneAlreadyInUseError) {
        form.setError("phone", { message: error.message })
        toast.error(error.message)
        return
      }
      toastError({ error, fallbackMessage: "Failed to complete signup, please contact support." })
      return onStepChange(SignupStepEnum.FINISHED_FAILURE)
    }
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-md mb-4">
      <SignupTitle
        title="Tell Us About Yourself"
        description={
          <>
            We’re excited to have you join us! Please fill out your details below so we can set up your account and get
            you started.{" "}
          </>
        }
        onGoBack={() => onStepChange(SignupStepEnum.CHILDREN_SELECTION)}
      />

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
              email: {
                required: true,
              },
              phone: {
                labelSmall: " (optional)",
              },
            },
            hiddenFields: ["grade", "teacherName"],
          }).map(field => (
            <FormFieldWrapper key={field.name} {...field} control={form.control} />
          ))}

          <Button type="submit" disabled={form.formState.isSubmitting} className="w-full col-span-2">
            {form.formState.isSubmitting ? "Continuing..." : "Continue"}
          </Button>
        </form>
      </Form>

      <div id="clerk-captcha" />
    </div>
  )
}
