import { zodResolver } from "@hookform/resolvers/zod"
import { Save } from "lucide-react"
import { usePathname } from "next/navigation"
import { useEffect, useRef } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Form } from "@/components/ui/form"
import { FormFieldWrapper } from "@/components/ui/form-field-wrapper"
import { RolesEnum } from "@/constants/roles"
import { UsersStatusEnum } from "@/constants/users"
import { useLoggedInUser } from "@/hooks"
import { api } from "@/trpc/react"
import { cn } from "@/utils/cn"
import { filterOutObjectUndefinedAndNull } from "@/utils/object"
import { usersFormFields, usersFormSchema } from "@/utils/users"

const formSchema = usersFormSchema.extend({
  lastName: z.string("Required").min(1, "Required"),
  email: z.string().min(1, "Required").pipe(z.email("Invalid email format")),
})

type FormValues = z.infer<typeof formSchema>

interface UsersProfileFormProps {
  onSuccess?: () => void
}

export function UsersProfileForm({ onSuccess }: UsersProfileFormProps) {
  const { user, isSignedIn, loggedInUserId, loggedInClerkId } = useLoggedInUser()
  const { mutateAsync: updateUser } = api.users.update.useMutation()
  const utils = api.useUtils()
  const pathname = usePathname()
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
  })
  const initialValuesRef = useRef<FormValues | null>(null)
  const isProfilePage = pathname === "/dashboard/profile"
  const isFRConsultant = user?.publicMetadata?.role === RolesEnum.SALES_REPRESENTATIVE
  const isWFCAdmin = user?.publicMetadata?.role === RolesEnum.WFC_ADMIN
  const pendingEmailObj =
    isWFCAdmin || isFRConsultant ? undefined : user?.emailAddresses?.find(e => e.verification?.status !== "verified")
  const pendingEmail = pendingEmailObj?.emailAddress
  const userRef = useRef(user)
  const pendingEmailRef = useRef(pendingEmail)
  useEffect(() => {
    userRef.current = user
    pendingEmailRef.current = pendingEmail
  })
  const clerkUserId = user?.id

  //retrieve latest clerk user
  useEffect(() => {
    if (!clerkUserId || !isSignedIn) return

    async function checkExpiryAndReload() {
      const user = userRef.current
      if (!user?.id) return

      try {
        const res = await fetch(`/api/clerk/users/${user.id}`)
        const data = await res.json()
        const dbUser = data?.data

        const sentAt = dbUser?.emailVerificationSentAt

        if (
          sentAt &&
          new Date(sentAt).getTime() < Date.now() - 24 * 60 * 60 * 1000 //24hrs
        ) {
          //trigger report flow
          await fetch(`/api/clerk/users/${user.id}`, {
            method: "PUT",
            body: JSON.stringify({
              email: pendingEmailRef.current,
              reportEmail: true,
            }),
          })
        }

        await user.reload()
      } catch (err) {
        console.error("Error handling expiry:", err)
      }
    }

    checkExpiryAndReload()
  }, [clerkUserId, isSignedIn])

  // Reset the form only when the saved values actually change, not whenever the `user` object identity changes.
  const hasClerkUser = !!user
  const clerkFirstName = user?.firstName
  const clerkLastName = user?.lastName
  const clerkEmail = pendingEmail ?? user?.primaryEmailAddress?.emailAddress
  const clerkPhone = user?.primaryPhoneNumber?.phoneNumber

  useEffect(() => {
    if (!hasClerkUser || !isSignedIn) return

    const values = filterOutObjectUndefinedAndNull({
      ...(clerkFirstName && clerkLastName ? { firstName: clerkFirstName, lastName: clerkLastName } : {}),
      email: clerkEmail,
      phone: clerkPhone ?? undefined,
    }) as Partial<FormValues>

    form.reset(values)
    initialValuesRef.current = values as FormValues
  }, [hasClerkUser, isSignedIn, form, clerkFirstName, clerkLastName, clerkEmail, clerkPhone])

  const onSubmit = async (data: FormValues) => {
    await handleUpdateUser(data)
  }

  const handleUpdateUser = async (data: FormValues) => {
    if (!loggedInUserId) return

    //check if email already exists in db excepts the logged in clerkId
    if (data.email) {
      const existingUsers = await utils.users.listByEmailOrPhone.fetch({ emails: [data.email] })
      const existingUser = existingUsers?.find(user => user.clerkId !== loggedInClerkId)

      if (existingUser && existingUser.id !== loggedInUserId) {
        form.setError("email", {
          message: "This email is already being used by another account",
        })
        return
      }
    }
    //when email is changed
    const oldEmail = user?.primaryEmailAddress?.emailAddress
    const newEmail = data.email

    const isEmailChanged = newEmail !== oldEmail && newEmail !== pendingEmail
    //send email notification email
    if (isEmailChanged && newEmail) {
      await fetch("/api/email/send/email-change-notification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentEmail: oldEmail,
          newEmail: data?.email,
          clerkId: user?.id,
        }),
      })
      //add new email in Clerk
      await fetch(`/api/clerk/users/${user?.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: newEmail,
          databaseId: loggedInUserId,
        }),
      })
    }
    const restData = (({ email: _email, ...rest }) => rest)(data)
    const payload = {
      id: loggedInUserId,
      ...restData,
      phone: data.phone ?? null,
      firstName: data.firstName,
      lastName: data.lastName,
      fullName: `${data.firstName} ${data.lastName}`,
      status: UsersStatusEnum.ACTIVE,
    }

    await updateUser(payload)
    await user?.reload()

    if (isEmailChanged) {
      toast.success("Verification email sent")
    } else {
      toast.success("Profile updated successfully")
    }

    onSuccess?.()
  }
  const currentValues = form.watch()

  const normalize = (data: FormValues | null): FormValues | null => {
    if (!data) return null

    return {
      ...data,
      firstName: data.firstName?.trim(),
      lastName: data.lastName?.trim(),
      email: data.email?.trim(),
      phone: data.phone?.trim?.() ?? data.phone,
    }
  }

  const isUnchanged = JSON.stringify(normalize(currentValues)) === JSON.stringify(normalize(initialValuesRef.current))
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
        {usersFormFields({
          fieldsProps: {
            lastName: {
              required: true,
            },
            email: {
              disabled: !isProfilePage || isWFCAdmin || isFRConsultant,
              description: pendingEmail ? "Email Verification Pending" : undefined,
            },
            phone: {
              labelSmall: " (optional)",
            },
          },
          hiddenFields: ["grade", "teacherName"],
        }).map(field => (
          <FormFieldWrapper key={field.name} {...field} control={form.control} />
        ))}

        <div className={cn("col-span-2 flex gap-2 justify-end")}>
          <Button
            type="submit"
            disabled={form.formState.isSubmitting || !form.formState.isDirty || !form.formState.isValid || isUnchanged}
          >
            <Save />

            {form.formState.isSubmitting ? "Saving..." : "Save and continue"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
