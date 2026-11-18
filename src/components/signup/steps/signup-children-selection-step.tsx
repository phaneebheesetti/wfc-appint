"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Plus, Trash2, TriangleAlert } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { type Control, type UseFormWatch, useFieldArray, useForm } from "react-hook-form"
import { z } from "zod"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Form } from "@/components/ui/form"
import { type FormField, FormFieldWrapper } from "@/components/ui/form-field-wrapper"
import { Skeleton } from "@/components/ui/skeleton"
import { GRADE_LABEL, GRADE_LABEL_LOWERCASE } from "@/constants/participant-labels"
import { type SupabaseUser } from "@/lib/supabase/service-client"
import { cn } from "@/utils/cn"
import { toastError } from "@/utils/errors"
import { naturalSort, normalizeStringSpecialCharacters } from "@/utils/string"

import { SignupStepEnum, type SignupUser } from "../signup"
import { SignupOrganizationAdminContactModal } from "../signup-organization-admin-contact-modal"
import { SignupTitle } from "../signup-title"

const formSchema = z.object({
  children: z
    .array(
      z.object({
        id: z.string(),
        firstName: z.string(),
        lastName: z.string(),
        grade: z.string(),
        valid: z.boolean().optional(),
        validationError: z.string().optional(),
      })
    )
    .min(1, "At least one child is required"),
})

type FormValues = z.infer<typeof formSchema>

interface SignupChildrenSelectionStepProps {
  user: SignupUser | null
  setUser: React.Dispatch<React.SetStateAction<SignupUser | null>>
  onStepChange: (step: SignupStepEnum) => void
}

export function SignupChildrenSelectionStep({ user, setUser, onStepChange }: SignupChildrenSelectionStepProps) {
  const searchParams = useSearchParams()
  const organizationId = searchParams.get("organizationId")
  const campaignId = searchParams.get("campaignId")

  const [isLoadingParticipants, setIsLoadingParticipants] = useState(true)
  const [participants, setParticipants] = useState<SupabaseUser[]>([])
  const [childrenOpen, setChildrenOpen] = useState<string[]>(["child-0"])
  const [showOrganizationAdminContactModal, setShowOrganizationAdminContactModal] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      children: user?.children ?? [
        {
          id: "",
          firstName: "",
          lastName: "",
          grade: "",
        },
      ],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "children",
  })

  const children = form.watch("children")
  const invalidChildren = children.filter(child => "valid" in child && !child.valid)

  const gradeOptions = useMemo(() => {
    const uniqueGrades = [...new Set(participants.map(p => p.grade).filter(Boolean))] as string[]

    return uniqueGrades.sort((a, b) => naturalSort(a, b, "asc")).map(grade => ({ value: grade, label: grade }))
  }, [participants])

  useEffect(() => {
    const fetchParticipants = async () => {
      if (!campaignId || !organizationId) {
        setIsLoadingParticipants(false)
        return
      }

      try {
        const response = await fetch(
          `/api/signup/participants?campaignId=${campaignId}&organizationId=${organizationId}`
        )
        const result = await response.json()

        if (result.data) {
          setParticipants(result.data)
        }
      } catch (error) {
        toastError({ error })
      } finally {
        setIsLoadingParticipants(false)
      }
    }

    fetchParticipants()
  }, [campaignId, organizationId])

  const validateChild = async (index: number) => {
    const child = form.getValues(`children.${index}`)
    if (!child) return false

    const isValid = child.firstName !== "" && child.lastName !== "" && child.grade !== ""
    if (!isValid) {
      form.setValue(`children.${index}.valid`, false)
      form.setValue(`children.${index}.validationError`, "Missing required fields")
      return false
    }

    const enteredFullName = `${child.firstName.trim()} ${child.lastName.trim()}`

    const matchedParticipants = participants.filter(
      p =>
        normalizeStringSpecialCharacters(p.full_name ?? "") === normalizeStringSpecialCharacters(enteredFullName) &&
        normalizeStringSpecialCharacters(p.grade ?? "") === normalizeStringSpecialCharacters(child.grade ?? "")
    )

    if (matchedParticipants.length === 0) {
      form.setValue(`children.${index}.valid`, false)
      form.setValue(`children.${index}.validationError`, "Error: Not found!")
      return false
    }

    if (matchedParticipants.length > 1) {
      form.setValue(`children.${index}.valid`, false)
      form.setValue(`children.${index}.validationError`, "Error: Multiple children found!")
      return false
    }

    const matchedParticipant = matchedParticipants[0]!

    const otherChildren = children.filter((_, i) => i !== index)
    const alreadyAdded = otherChildren.some(c => c.id === matchedParticipant.id)
    if (alreadyAdded) {
      form.setValue(`children.${index}.valid`, false)
      form.setValue(`children.${index}.validationError`, "Error: Already added!")
      return false
    }

    form.setValue(`children.${index}.valid`, true)
    form.setValue(`children.${index}.validationError`, "")
    form.setValue(`children.${index}.id`, matchedParticipant.id)
    setChildrenOpen(prev => prev.filter(item => item !== `child-${index}`))

    return true
  }

  const handleAddChild = () => {
    append({
      id: "",
      firstName: "",
      lastName: "",
      grade: "",
    })

    setChildrenOpen(prev => prev.concat(`child-${fields.length}`))
  }

  const onSubmit = async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 500))

      const results = await Promise.all(children.map((_, index) => validateChild(index)))

      setUser(user => ({ ...user, children }))

      if (results.every(Boolean)) {
        await new Promise(resolve => setTimeout(resolve, 500))
        return onStepChange(SignupStepEnum.FORM)
      }
    } catch (error) {
      toastError({ error })
    }
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-md">
      <SignupTitle
        title="Let's Find Your Child!"
        description={
          <>
            Please add your child&apos;s name and {GRADE_LABEL_LOWERCASE} below so we can connect them to your account
            and the fundraiser.
            <br />
            If you have more than one child in the same fundraiser, you can add them all here!
          </>
        }
        onGoBack={() => onStepChange(SignupStepEnum.INITIAL)}
      />

      {isLoadingParticipants ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="w-full h-32" />
          <Skeleton className="w-full h-10" />
          <Skeleton className="w-full h-10" />
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Accordion type="multiple" value={childrenOpen} onValueChange={setChildrenOpen}>
              {fields.map((child, index) => (
                <ChildAccordionItem
                  key={child.id}
                  index={index}
                  control={form.control}
                  watch={form.watch}
                  gradeOptions={gradeOptions}
                  canRemove={fields.length > 1}
                  remove={remove}
                />
              ))}
            </Accordion>

            <Button type="button" variant="outline" onClick={handleAddChild}>
              <Plus />
              Add Child
            </Button>

            <Button type="submit" disabled={form.formState.isSubmitting} className="w-full col-span-2">
              {form.formState.isSubmitting ? "Validating..." : "Continue"}
            </Button>

            {invalidChildren.length > 0 && (
              <div className="flex flex-col gap-2 mt-10">
                <div className="text-sms text-muted-foreground">
                  We couldn&apos;t find your child in our system.
                  <br />
                  This might happen if:
                  <br />
                  <ul className="list-disc list-inside">
                    <li>Child&apos;s name is spelled differently in our records</li>
                    <li>Child is already associated with a parent account</li>
                    <li>There are multiple students with the same name/{GRADE_LABEL_LOWERCASE}</li>
                  </ul>
                  <br />
                  <span className="font-medium">Please contact us so we can help you out.</span>
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    setUser(user => ({ ...user, children }))

                    if (invalidChildren.length === children.length) {
                      onStepChange(SignupStepEnum.ORGANIZATION_ADMIN_CONTACT)
                    } else {
                      setShowOrganizationAdminContactModal(true)
                    }
                  }}
                >
                  <TriangleAlert />
                  Get Help
                </Button>
              </div>
            )}
          </form>
        </Form>
      )}

      <SignupOrganizationAdminContactModal
        open={showOrganizationAdminContactModal}
        onOpenChange={setShowOrganizationAdminContactModal}
        user={user}
        setUser={setUser}
      />
    </div>
  )
}

interface ChildAccordionItemProps {
  index: number
  control: Control<FormValues>
  watch: UseFormWatch<FormValues>
  gradeOptions: { value: string; label: string }[]
  canRemove: boolean
  remove: (index: number) => void
}

function ChildAccordionItem({ index, control, watch, gradeOptions, canRemove, remove }: ChildAccordionItemProps) {
  const childFields: FormField<FormValues>[] = [
    {
      name: `children.${index}.firstName`,
      label: "First Name",
      type: "text",
      required: true,
      className: "col-span-3",
    },
    {
      name: `children.${index}.lastName`,
      label: "Last Name",
      type: "text",
      required: true,
      className: "col-span-3",
    },
    {
      name: `children.${index}.grade`,
      label: GRADE_LABEL,
      type: "select",
      options: gradeOptions,
      required: true,
      className: "col-span-6",
    },
  ]

  const child = watch(`children.${index}`)
  const isValid = "valid" in child && child.valid
  const isInvalid = "valid" in child && !child.valid

  return (
    <AccordionItem
      value={`child-${index}`}
      className={cn(
        "rounded-lg border px-4 mb-2",
        "border-border bg-gray-50 text-card-foreground",
        isValid && "border-green-500 bg-green-50 text-green-900",
        isInvalid && "border-red-500 bg-red-50 text-red-900"
      )}
    >
      <AccordionTrigger className="group hover:no-underline">
        <div className="flex items-center gap-2">
          <span className="group-hover:underline">Child {index + 1}</span>

          {isValid && (
            <Badge variant="success">
              {child.firstName} {child.lastName}
            </Badge>
          )}

          {isInvalid && <Badge variant="destructive">{child.validationError}</Badge>}
        </div>
      </AccordionTrigger>
      <AccordionContent className="grid grid-cols-6 gap-4">
        {childFields.map(field => (
          <FormFieldWrapper key={field.name} {...field} control={control} disabled={isValid} />
        ))}

        {canRemove && (
          <div>
            <Button
              type="button"
              variant="outline"
              onClick={() => remove(index)}
              className="text-red-600 hover:text-red-600"
            >
              <Trash2 className="text-red-600" />
              Remove Child
            </Button>
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  )
}
