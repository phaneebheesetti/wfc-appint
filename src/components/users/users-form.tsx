import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeft, Save } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Form } from "@/components/ui/form"
import { FormFieldWrapper } from "@/components/ui/form-field-wrapper"
import { RolesEnum } from "@/constants/roles"
import { type User } from "@/server/db/schema"
import { api } from "@/trpc/react"
import { cn } from "@/utils/cn"
import { filterOutObjectUndefinedAndNull } from "@/utils/object"
import { usersFormFields, usersFormSchema } from "@/utils/users"

const formSchema = usersFormSchema.extend({
  role: z.nativeEnum(RolesEnum),
})

type FormValues = z.infer<typeof formSchema>

interface UsersFormProps {
  user: User
  onUpdate?: () => void
  onBack?: () => void
}

export function UsersForm({ user, onUpdate, onBack }: UsersFormProps) {
  const { mutateAsync: updateUser } = api.users.update.useMutation()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ...(user ? (filterOutObjectUndefinedAndNull(user ?? {}) as Partial<FormValues>) : {}),
      role: (user?.role as RolesEnum) ?? RolesEnum.PARTICIPANT,
    },
  })

  const onSubmit = async (data: FormValues) => {
    await handleUpdateUser(data)
  }

  const handleUpdateUser = async (data: FormValues) => {
    await updateUser({
      id: user?.id,
      ...data,
      phone: data.phone ?? null,
      firstName: data.firstName,
      lastName: data.lastName,
      fullName: `${data.firstName} ${data.lastName}`,
    })

    toast.success("Member updated successfully")

    onUpdate?.()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
        {usersFormFields({
          fieldsProps: {
            email: {
              disabled: !!user,
              required: true,
            },
          },
          hiddenFields: ["grade", "teacherName"],
        }).map(field => (
          <FormFieldWrapper key={field.name} {...field} control={form.control} />
        ))}

        <div className={cn("col-span-2 flex gap-2 justify-end", user && "justify-start")}>
          {onBack && (
            <Button
              variant="secondary"
              onClick={e => {
                e.preventDefault()
                onBack()
              }}
              disabled={form.formState.isSubmitting}
            >
              <ArrowLeft />
              Back
            </Button>
          )}

          <Button type="submit" disabled={form.formState.isSubmitting}>
            <Save />

            {form.formState.isSubmitting ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
