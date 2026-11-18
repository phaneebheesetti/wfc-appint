import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeft, Mail, Save } from "lucide-react"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Form } from "@/components/ui/form"
import { type FormField, FormFieldWrapper } from "@/components/ui/form-field-wrapper"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { GRADE_LABEL, TEACHER_LABEL } from "@/constants/participant-labels"
import { RolesEnum } from "@/constants/roles"
import { UsersStatusEnum } from "@/constants/users"
import { useLoggedInUser } from "@/hooks"
import { phoneType } from "@/lib/zod/types"
import { type User } from "@/server/db/schema"
import { api } from "@/trpc/react"
import { cn } from "@/utils/cn"
import { toastError } from "@/utils/errors"
import { filterOutObjectUndefinedAndNull } from "@/utils/object"
import { optionalEmail, usersFormFields, usersFormSchema } from "@/utils/users"

import { ParentEmailsField } from "./parent-emails-field"

const formSchema = usersFormSchema.extend({
  firstName: z.string().trim().min(1, "First Name is required"),
  lastName: z.string().trim().min(1, "Last Name is required"),
  grade: z.string().trim().min(1, `${GRADE_LABEL} is required`),
  teacherName: z.string().trim().min(1, `${TEACHER_LABEL} Name is required`),
  eligible: z.boolean().optional(),
  email: optionalEmail,
  phone: phoneType.optional().nullable(),
  parentEmails: z
    .array(
      z.string().refine(val => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim()), {
        message: "Invalid email address",
      })
    )
    .optional(),
  parentPhone: phoneType.optional().nullable(),
})

type FormValues = z.infer<typeof formSchema>

interface OrganizationUsersFormProps {
  organizationId: string
  campaignId?: string
  user?: User
  onCreate?: (user: User) => void
  onUpdate?: () => void
  onBack?: () => void
}

export function OrganizationUsersForm({
  organizationId,
  campaignId,
  user,
  onUpdate,
  onCreate,
  onBack,
}: OrganizationUsersFormProps) {
  const { loggedInUserId, loggedInRole } = useLoggedInUser()
  const canManageSecondaryEmails = loggedInRole === RolesEnum.ORGANIZATION_ADMIN
  const utils = api.useUtils()

  const { mutateAsync: createUser } = api.users.create.useMutation()
  const { mutateAsync: createOrInviteParent } = api.users.findUpdateOrCreate.useMutation()
  const { mutateAsync: updateUser } = api.users.update.useMutation()

  const { mutateAsync: createOrganizationUser } = api.organizationsUsers.create.useMutation()
  const { mutateAsync: updateOrganizationUser } = api.organizationsUsers.update.useMutation()

  const { mutateAsync: createCampaignUser } = api.campaignsUsers.create.useMutation()

  const { mutateAsync: createParentMapping } = api.participantParentMapping.create.useMutation()
  const { mutateAsync: deleteParentMappingByParticipantAndParent } =
    api.participantParentMapping.deleteByParticipantAndParent.useMutation()

  const { data: organization } = api.organizations.getById.useQuery({ id: organizationId })

  const { data: organizationUserData, isLoading: isLoadingOrganizationUserData } =
    api.organizationsUsers.getByUserAndOrganizationId.useQuery(
      {
        organizationId,
        userId: user?.id ?? "",
      },
      { enabled: !!user?.id }
    )

  const { data: existingMappings } = api.participantParentMapping.listByParticipantId.useQuery(
    { participantUserId: user?.id ?? "" },
    { enabled: !!user?.id }
  )

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      firstName: "",
      lastName: "",
      grade: "",
      teacherName: "",
      ...(user ? (filterOutObjectUndefinedAndNull(user ?? {}) as Partial<FormValues>) : {}),
      phone: user?.phone === "" ? null : user?.phone,
      email: user?.email === "" ? undefined : (user?.email ?? undefined),
      eligible: true,
      parentEmails: user?.parentUser?.email ? [user.parentUser.email] : [],
      parentPhone: user?.parentUser?.phone ?? undefined,
    },
  })

  useEffect(() => {
    if (isLoadingOrganizationUserData) return

    form.setValue("eligible", organizationUserData?.eligible ?? true)
  }, [isLoadingOrganizationUserData])

  useEffect(() => {
    if (!existingMappings) return

    // Unified email list: legacy parent first (if present), then all mapping parent emails
    const legacyEmail = user?.parentUser?.email ?? null
    const mappingEmails = existingMappings.map(m => m.parentUser?.email ?? "").filter(Boolean)
    const allEmails = [...(legacyEmail ? [legacyEmail] : []), ...mappingEmails]
    const dedupedEmails = Array.from(new Set(allEmails.map(e => e.toLowerCase()))).map(
      lower => allEmails.find(e => e.toLowerCase() === lower) ?? lower
    )

    // For non-admin, only include the first email (legacy primary) — secondaries stay invisible
    const merged = canManageSecondaryEmails ? dedupedEmails : dedupedEmails.slice(0, 1)

    form.setValue("parentEmails", merged)
  }, [existingMappings])

  const parentEmails = form.watch("parentEmails") ?? []
  const [hasSecondaryEmailError, setHasSecondaryEmailError] = useState(false)

  const formFields: FormField<FormValues>[] = [
    {
      name: "eligible",
      label: "Eligible",
      placeholder: "Select if the participant is eligible",
      type: "checkbox",
      disabled: isLoadingOrganizationUserData,
    },
  ]

  const onSubmit = async (data: FormValues) => {
    if (user) {
      await handleUpdate(data)
    } else {
      await handleCreate(data)
    }
  }

  const handleCreateUser = async (data: FormValues) => {
    const createdUser = await createUser({
      status: UsersStatusEnum.ACTIVE,
      invitedByUserId: loggedInUserId,
      role: RolesEnum.PARTICIPANT,
      encryptionKeySecretId: organization?.encryptionKeySecretId,
      ...data,
      fullName: `${data.firstName} ${data.lastName}`,
      encrypted: true,
    })

    return createdUser
  }

  const handleCreate = async (data: FormValues) => {
    try {
      let userId: string | null = null
      let organizationUserId: string | null = null
      let campaignUserId: string | null = null

      const existingUsers = await utils.users.listByEmailOrPhone.fetch({ emails: data?.email ? [data.email] : [] })
      userId = existingUsers[0]?.id ?? null

      const existingOrganizationUser = await utils.organizationsUsers.getParticipantByEmailOrPhone.fetch({
        email: data.email ?? undefined,
        phone: data.phone ?? undefined,
        organizationId,
      })
      organizationUserId = existingOrganizationUser?.id ?? null

      if (campaignId) {
        const existingCampaignUser = await utils.campaignsUsers.getByEmailOrPhone.fetch({
          email: data.email ?? undefined,
          phone: data.phone ?? undefined,
          campaignId,
        })
        campaignUserId = existingCampaignUser?.id ?? null
      }

      if (!userId) {
        const createdUser = await handleCreateUser(data)
        if (!createdUser) throw new Error("Error creating user.")

        userId = createdUser.id

        // Non org admin can add 1 email during create; org admin can add unlimited
        const emails = canManageSecondaryEmails ? (data.parentEmails ?? []) : (data.parentEmails ?? []).slice(0, 1)

        // If only phone provided (no emails), create a single phone-only parent mapping
        if (emails.length === 0 && data.parentPhone) {
          const parent = await handleGetParentUser({
            parentId: null,
            parentEmail: null,
            parentPhone: data.parentPhone,
          })
          if (parent) {
            await createParentMapping({
              parentUserId: parent.id,
              participantUserId: userId,
              createdByUserId: loggedInUserId ?? undefined,
            })
          }
        }

        // Create a mapping per email. Phone attaches to the first email's parent (if any).
        // Each iteration is isolated so a conflict on one email does not skip the rest —
        // the global tRPC onError toasts each failure individually so org admin sees
        // every problem at once instead of stopping at the first.
        let parentEmailFailures = 0
        for (let i = 0; i < emails.length; i++) {
          try {
            const parent = await handleGetParentUser({
              parentId: null,
              parentEmail: emails[i],
              parentPhone: i === 0 ? data.parentPhone : null,
            })
            if (parent) {
              await createParentMapping({
                parentUserId: parent.id,
                participantUserId: userId,
                createdByUserId: loggedInUserId ?? undefined,
              })
            }
          } catch {
            parentEmailFailures++
          }
        }
        if (parentEmailFailures > 0) return
      }

      if (!organizationUserId) {
        const createdOrganizationUser = await createOrganizationUser({
          userId,
          organizationId,
          eligible: data.eligible,
        })
        if (!createdOrganizationUser) throw new Error("Error creating organization user.")

        organizationUserId = createdOrganizationUser.id
      }

      if (campaignId && !campaignUserId) {
        const createdCampaignUser = await createCampaignUser({
          userId,
          campaignId,
          organizationId,
        })
        if (!createdCampaignUser) throw new Error("Error creating fundraiser user.")

        campaignUserId = createdCampaignUser.id
      }

      const user = await utils.users.getById.fetch({ id: userId })
      if (!user) throw new Error("Error getting user.")

      onCreate?.(user)
    } catch (error) {
      toastError({ error, fallbackMessage: "Error creating user." })
    }
  }

  const handleUpdate = async (data: FormValues) => {
    try {
      if (!user) throw new Error("User not found.")

      await updateUser({
        id: user?.id,
        ...data,
        fullName: `${data.firstName} ${data.lastName}`,
      })

      const eligibleChanged = !!data?.eligible !== organizationUserData?.eligible

      await updateOrganizationUser({
        userId: user.id,
        organizationId,
        eligible: data.eligible,
        ...(eligibleChanged && {
          eligibleUpdatedAt: new Date(),
          eligibleUpdatedByUserId: loggedInUserId ?? null,
        }),
      })

      // Flat email diff — no primary/secondary distinction, all emails equal
      if (canManageSecondaryEmails) {
        const newEmails = (data.parentEmails ?? []).map(e => e.trim().toLowerCase()).filter(Boolean)

        // Collect all existing parent emails (legacy + mappings)
        const legacyEmail = user.parentUserId ? user.parentUser?.email?.toLowerCase() : null
        const mappingEmails = (existingMappings ?? [])
          .map(m => m.parentUser?.email?.toLowerCase())
          .filter((e): e is string => !!e)
        const existingEmailsSet = new Set<string>([...(legacyEmail ? [legacyEmail] : []), ...mappingEmails])

        const addedEmails = newEmails.filter(e => !existingEmailsSet.has(e))
        const removedEmails = Array.from(existingEmailsSet).filter(e => !newEmails.includes(e))

        // --- PHASE 1: Delete removed emails ---
        for (const email of removedEmails) {
          // If it's the legacy primary, clear parentUserId
          if (legacyEmail === email) {
            await updateUser({ id: user.id, parentUserId: null })
          }
          // Delete from mapping table if present
          const mapping = (existingMappings ?? []).find(m => m.parentUser?.email?.toLowerCase() === email)
          if (mapping) {
            await deleteParentMappingByParticipantAndParent({
              participantUserId: user.id,
              parentUserId: mapping.parentUserId,
            })
          }
        }

        // --- PHASE 2: Add new emails ---
        // Each iteration is isolated so a conflict on one email does not skip the rest;
        // the global tRPC onError toasts each failure so org admin sees every problem.
        let parentEmailFailures = 0
        for (const email of addedEmails) {
          try {
            const parent = await handleGetParentUser({
              parentId: null,
              parentEmail: email,
              parentPhone: null,
            })
            if (parent) {
              await createParentMapping({
                parentUserId: parent.id,
                participantUserId: user.id,
                createdByUserId: loggedInUserId ?? undefined,
              })
            }
          } catch {
            parentEmailFailures++
          }
        }
        if (parentEmailFailures > 0) return
      }

      onUpdate?.()
    } catch (error) {
      toastError({ error, fallbackMessage: "Error updating user." })
    }
  }

  const handleGetParentUser = async ({
    parentEmail,
    parentPhone,
  }: {
    parentId?: string | null
    parentEmail?: string | null
    parentPhone?: string | null
  }): Promise<User | null> => {
    if (!parentEmail && !parentPhone) return null

    let parentUser: User | null = null

    const existingParentUser = await utils.users.listByEmailOrPhone.fetch({
      emails: parentEmail ? [parentEmail] : [],
      phones: parentPhone ? [parentPhone] : [],
      roles: [RolesEnum.PARENT],
    })

    if (existingParentUser?.[0]?.id) {
      parentUser = existingParentUser[0]
    } else {
      const firstName = parentEmail?.split("@")[0] ?? ""
      const createdParentUser = await createOrInviteParent({
        status: UsersStatusEnum.PENDING,
        invitedByUserId: loggedInUserId,
        role: RolesEnum.PARENT,
        email: parentEmail ?? undefined,
        phone: parentPhone ?? undefined,
        firstName: firstName,
        fullName: firstName,
      })
      if (!createdParentUser) throw new Error("Error creating parent user.")

      parentUser = createdParentUser
    }

    // The welcome-parent email is fired server-side by usersCreate /
    // usersInvite / usersCloneForRole when the PARENT row is first created,
    // so this UI layer no longer needs to send it (doing so caused duplicate
    // emails when both the server-side fire and this fetch ran).

    return parentUser
  }

  if (isLoadingOrganizationUserData) {
    return (
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-[100px]" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-[100px]" />
          <Skeleton className="h-10 w-full" />
        </div>

        <div className="col-span-2 space-y-2">
          <Skeleton className="h-4 w-[100px]" />
          <Skeleton className="h-10 w-full" />
        </div>

        <div className="col-span-2 space-y-2">
          <Skeleton className="h-4 w-[120px]" />
          <Skeleton className="h-10 w-full" />
        </div>

        <div className="space-y-2">
          <Skeleton className="h-4 w-[80px]" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-[120px]" />
          <Skeleton className="h-10 w-full" />
        </div>

        <div className="col-span-2 flex items-center space-x-2 pt-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-4 w-[80px]" />
        </div>

        <div className="col-span-2 flex gap-2 justify-start pt-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
        {(
          usersFormFields({
            fieldsProps: {
              lastName: { required: true },
              grade: { required: true, maxLength: 25 },
              teacherName: { required: true, maxLength: 25 },
            },
            hiddenFields: ["email", "phone"],
          }) as FormField<FormValues>[]
        ).map(field => (
          <FormFieldWrapper key={field.name} {...field} control={form.control} />
        ))}

        {canManageSecondaryEmails ? (
          <ParentEmailsField
            value={parentEmails}
            onChange={emails => form.setValue("parentEmails", emails, { shouldValidate: true })}
            canAdd
            canRemove
            error={form.formState.errors.parentEmails?.message}
            disabled={form.formState.isSubmitting}
            onErrorChange={setHasSecondaryEmailError}
          />
        ) : (
          <div className="col-span-2 flex flex-col gap-2">
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium leading-none">Parent / Guardian email</span>
              <small className="text-muted-foreground"> (optional)</small>
            </div>
            {(() => {
              const emailError =
                (
                  form.formState.errors.parentEmails as unknown as { [key: number]: { message?: string } } | undefined
                )?.[0]?.message ?? form.formState.errors.parentEmails?.message
              return (
                <>
                  <Input
                    type="text"
                    placeholder="Add email address"
                    value={parentEmails[0] ?? ""}
                    onChange={e => {
                      const v = e.target.value
                      form.setValue("parentEmails", v ? [v] : [])
                      // Clear the email error when user edits; will re-validate on submit
                      if (emailError) form.clearErrors("parentEmails")
                    }}
                    disabled={form.formState.isSubmitting}
                    className={cn(emailError && "border-destructive")}
                  />
                  {emailError && <p className="text-[0.8rem] font-medium text-destructive">{emailError}</p>}
                </>
              )
            })()}
          </div>
        )}

        {formFields.map(field => (
          <FormFieldWrapper key={field.name} {...field} control={form.control} />
        ))}

        {!user && (
          <div className="col-span-2 flex items-start gap-2 rounded-card border border-brown-200 bg-[#fdf8ee] px-4 py-3 text-sm text-brown-900">
            <Mail className="h-4 w-4 mt-[1px] shrink-0 text-brown-200" />
            <span>
              If a parent/guardian email is provided above, they will receive a welcome email with login instructions
              when you click <b>Add</b>.
            </span>
          </div>
        )}

        <div className={cn("col-span-2 flex gap-2 justify-end", user && "justify-start")}>
          {onBack && (
            <Button variant="secondary" onClick={onBack}>
              <ArrowLeft />
              Back
            </Button>
          )}

          <Button type="submit" disabled={form.formState.isSubmitting || hasSecondaryEmailError}>
            {user && <Save />}

            {user
              ? form.formState.isSubmitting
                ? "Saving..."
                : "Save"
              : form.formState.isSubmitting
                ? "Adding..."
                : "Add"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
