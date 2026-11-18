import { z } from "zod"

import { type FormField } from "@/components/ui/form-field-wrapper"
import { GRADE_LABEL, TEACHER_LABEL } from "@/constants/participant-labels"
import { RolesEnum } from "@/constants/roles"
import { phoneType } from "@/lib/zod/types"
import { type User, type UserInsert } from "@/server/db/schema"

import { filterOutObjectUndefined } from "./object"
import { ENCRYPTED_STRING, capitalizeEveryWord } from "./string"

export const optionalEmail = z.email("Invalid email").or(z.literal("")).optional()

export function shouldMaskParticipantPii(role: RolesEnum | undefined, isGranted?: boolean): boolean {
  if (role === RolesEnum.WFC_ADMIN) {
    return true
  }
  if (role === RolesEnum.SALES_REPRESENTATIVE) {
    return !isGranted
  }
  return false
}

export function maskParticipantUserPii(user: User): User {
  return {
    ...user,
    email: user.email && user.email.trim() !== "" ? ENCRYPTED_STRING : user.email,
    firstName: user.firstName && user.firstName.trim() !== "" ? ENCRYPTED_STRING : user.firstName,
    fullName: user.fullName && user.fullName.trim() !== "" ? ENCRYPTED_STRING : user.fullName,
    lastName: user.lastName && user.lastName.trim() !== "" ? ENCRYPTED_STRING : user.lastName,
    phone: user.phone && user.phone.trim() !== "" ? ENCRYPTED_STRING : user.phone,
  }
}

export function getUserDisplayName(user?: User | null, fallback = "-") {
  const name = user?.fullName ?? user?.firstName
  if (!name) return fallback

  return name
}

export const usersFormSchema = z.object({
  firstName: z.string("Required").min(1, "Required"),
  lastName: z.string().optional(),
  email: z.email("Invalid").optional(),
  phone: phoneType.optional().nullable(),
  grade: z.string().optional(),
  teacherName: z.string().optional(),
})

export type UsersFormValues = z.infer<typeof usersFormSchema>

interface UsersFormFieldsProps {
  hiddenFields?: string[]
  fieldsProps?: Partial<Record<keyof UsersFormValues, Partial<FormField<UsersFormValues>>>>
}

export const usersFormFields = ({ hiddenFields, fieldsProps }: UsersFormFieldsProps): FormField<UsersFormValues>[] => {
  const fields: FormField<UsersFormValues>[] = [
    {
      name: "firstName",
      label: "First name",
      type: "text",
      required: true,
    },
    {
      name: "lastName",
      label: "Last name",
      type: "text",
    },
    {
      name: "email",
      label: "Email",
      type: "email",
      className: "col-span-2",
    },
    {
      name: "phone",
      label: "Phone number",
      type: "phone",
      className: "col-span-2",
      placeholder: "",
    },
    {
      name: "grade",
      label: GRADE_LABEL,
      type: "text",
    },
    {
      name: "teacherName",
      label: `${TEACHER_LABEL} name`,
      type: "text",
    },
  ]

  return fields
    .filter(field => !hiddenFields?.includes(field.name))
    .map(field => ({
      ...field,
      ...fieldsProps?.[field.name],
    })) as FormField<UsersFormValues>[]
}

export const normalizeUserInsert = (input: UserInsert) => {
  const capitalizedFirstName = input?.firstName ? capitalizeEveryWord(input.firstName.trim()) : input?.firstName
  const capitalizedLastName = input?.lastName ? capitalizeEveryWord(input.lastName.trim()) : input?.lastName
  const capitalizedFullName = capitalizedFirstName
    ? `${capitalizedFirstName} ${capitalizedLastName ?? ""}`.trim()
    : undefined

  const capitalizedTeacherName = input?.teacherName ? capitalizeEveryWord(input.teacherName.trim()) : input?.teacherName

  const normalizedEmail = input?.email ? input.email?.trim().toLowerCase() : input.email

  const normalizedInput = {
    ...input,
    email: normalizedEmail,
    firstName: capitalizedFirstName,
    lastName: capitalizedLastName,
    fullName: capitalizedFullName,
    teacherName: capitalizedTeacherName,
  }

  return filterOutObjectUndefined(normalizedInput)
}
