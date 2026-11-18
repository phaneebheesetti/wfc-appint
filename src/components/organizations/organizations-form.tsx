"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Label } from "@radix-ui/react-label"
import { ArrowLeft, Save } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Form, FormMessage } from "@/components/ui/form"
import { type FormField, FormFieldWrapper } from "@/components/ui/form-field-wrapper"
import { type SetEmptyMessage, type Suggestions, Typeahead, type UpdateSuggestions } from "@/components/ui/typeahead"
import { type OrganizationsVisibilityEnum } from "@/constants/organizations"
import { RolesEnum } from "@/constants/roles"
import { useLoggedInUser } from "@/hooks"
import { type Organization, type User } from "@/server/db/schema"
import { api } from "@/trpc/react"
import { cn } from "@/utils/cn"
import { toastError } from "@/utils/errors"
import { filterOutObjectUndefinedAndNull } from "@/utils/object"

import { Combobox } from "../ui/combobox"
import { type OrganizationDetails, OrganizationDetailsCard } from "./organization-details-card"
import { OrganizationSearch, type OrganizationSearchMode } from "./organization-search"

const userSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  email: z.string(),
  phone: z.string(),
})

const formSchema = z.object({
  name: z.string().trim().min(1, "Organization Name is required"),
  accountNumber: z.string().optional(),
  contactEmail: z.string().optional(),
  street: z.string().trim().min(1, "Street is required"),
  city: z.string().trim().min(1, "City is required"),
  postalCode: z.string().trim().min(1, "Postal code is required"),
  state: z.string().trim().min(1, "State is required"),
  fundraisingConsultantUser: userSchema.nullable(),
})

type FormValues = z.infer<typeof formSchema>

interface OrganizationsFormProps {
  organization?: Organization
  onCreate?: () => void
  onUpdate?: () => void
  onBack?: () => void
  onCancel?: () => void
  fundraisingConsultantUsers?: User[]
  /** Persist the new organization with a specific visibility (e.g. DRAFT during onboarding). */
  visibility?: OrganizationsVisibilityEnum
  /** When false, stay on the current page after creating instead of navigating to the org dashboard. Defaults to true. */
  redirectOnCreate?: boolean
  /** Overrides the success toast shown after creating (e.g. onboarding draft wording). */
  createSuccessMessage?: string
  /** Overrides the success toast shown after updating (e.g. onboarding draft wording). */
  updateSuccessMessage?: string
  /** When true, the Name field is a plain text input instead of the Salesforce org search typeahead (e.g. FC onboarding step 1 edit). */
  disableNameTypeahead?: boolean
}

let sfOrgsList: object[] = [] //Contains the list of all the SF orgs which are pulled in as a part of the suggestions.

export function OrganizationsForm({
  organization,
  onCreate,
  onUpdate,
  onBack,
  onCancel,
  fundraisingConsultantUsers,
  visibility,
  redirectOnCreate = true,
  createSuccessMessage = "Organization added successfully",
  updateSuccessMessage = "Organization updated successfully",
  disableNameTypeahead = false,
}: OrganizationsFormProps) {
  const utils = api.useUtils()
  const { loggedInUserId, loggedInRole } = useLoggedInUser()
  const router = useRouter()

  const [searchMode, setSearchMode] = useState<OrganizationSearchMode>("accountNumber")
  const [selectedOrganization, setSelectedOrganization] = useState<OrganizationDetails | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedSalesforceOrganization, setSelectedSalesforceOrganization] = useState<any | null>(null)
  const [searchValue, setSearchValue] = useState("")
  const [searchError, setSearchError] = useState(false)
  const [searching, setSearching] = useState(false)
  const { mutateAsync: createOrganization } = api.organizations.create.useMutation()
  const { mutateAsync: updateOrganization } = api.organizations.update.useMutation()

  const getFCDetails = () => {
    if (!!organization) {
      return {
        fullName: organization?.fundraisingConsultantUser?.fullName ?? "",
        email: organization?.fundraisingConsultantUser?.email ?? "",
        phone: organization?.fundraisingConsultantUser?.phone ?? "",
        id: organization?.fundraisingConsultantUser?.id,
      }
    } else {
      return null
    }
  }

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      name: "",
      street: "",
      city: "",
      postalCode: "",
      state: "",
      ...(organization ? (filterOutObjectUndefinedAndNull(organization ?? {}) as Partial<FormValues>) : {}),
      fundraisingConsultantUser: loggedInRole === RolesEnum.WFC_ADMIN ? getFCDetails() : null,
    },
  })

  const onOrgNameChange = useCallback(
    async (enteredOrgName: string, setEmptyMessage: SetEmptyMessage, setSuggestions: UpdateSuggestions) => {
      setSuggestions([])
      if (enteredOrgName.length < 3) {
        setEmptyMessage("Enter atleast 3 characters")
        return
      }

      setEmptyMessage("Searching...")
      sfOrgsList = await utils.organizations.getOrgsListfromSF.fetch({
        searchMode: "name",
        searchValue: enteredOrgName,
      })
      if (!sfOrgsList || sfOrgsList.length == 0) {
        setEmptyMessage("No organizations found")
        return
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const suggestions: Array<Suggestions> = sfOrgsList.map((currOrg: any) => ({
        key: currOrg.Id,
        val: currOrg.Name,
      }))
      setSuggestions(suggestions)
    },
    [utils]
  )

  const searchOrganization = useCallback(async () => {
    if (!searchValue.trim()) {
      return
    }

    setSearching(true)
    setSearchError(false)
    setSelectedOrganization(null)
    setSelectedSalesforceOrganization(null)

    try {
      const organizations = await utils.organizations.getOrgsListfromSF.fetch({
        searchMode,
        searchValue: searchValue.trim(),
      })

      sfOrgsList = organizations

      if (!organizations.length) {
        setSearchError(true)
        return
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const org = organizations[0] as any
      setSelectedSalesforceOrganization(org)
      const orgAddress = org.BillingAddress

      setSelectedOrganization({
        accountNumber: org.AccountNumber ?? "",
        name: org.Name ?? "",
        contactEmail: org.ContactEmail ?? "",
        street: orgAddress?.street ?? "",
        city: orgAddress?.city ?? "",
        state: orgAddress?.state ?? "",
        postalCode: orgAddress?.postalCode ?? "",
      })

      form.setValue("name", org.Name ?? "")
      form.setValue("contactEmail", org.ContactEmail ?? "")
      form.setValue("street", orgAddress?.street ?? "")
      form.setValue("city", orgAddress?.city ?? "")
      form.setValue("state", orgAddress?.state ?? "")
      form.setValue("postalCode", orgAddress?.postalCode ?? "")
    } finally {
      setSearching(false)
    }
  }, [searchMode, searchValue, utils])

  const onOrgSelect = useCallback((selectedData: Suggestions) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const selectedOrg = sfOrgsList.find((currOrg: any) => currOrg.Id === selectedData.key) as any

    if (!selectedOrg) return

    setSelectedSalesforceOrganization(selectedOrg)

    const orgAddress = selectedOrg.BillingAddress

    setSelectedOrganization({
      accountNumber: selectedOrg.AccountNumber ?? "",
      name: selectedOrg.Name ?? "",
      contactEmail: selectedOrg.ContactEmail ?? "",
      street: orgAddress?.street ?? "",
      city: orgAddress?.city ?? "",
      state: orgAddress?.state ?? "",
      postalCode: orgAddress?.postalCode ?? "",
    })

    form.setValue("name", selectedOrg.Name ?? "")
    form.setValue("contactEmail", selectedOrg.ContactEmail ?? "")
    form.setValue("street", orgAddress?.street ?? "")
    form.setValue("city", orgAddress?.city ?? "")
    form.setValue("state", orgAddress?.state ?? "")
    form.setValue("postalCode", orgAddress?.postalCode ?? "")
  }, [])

  const onSubmit = async (data: FormValues) => {
    if (organization) {
      await handleUpdateOrganization(data)
    } else {
      await handleCreateOrganization()
    }
  }

  const handleCreateOrganization = async () => {
    if (!selectedSalesforceOrganization) {
      toast.error("Please search and select an organization.")
      return
    }

    const existingOrganization = await utils.organizations.checkDuplicateByAccountNumber.fetch({
      accountNumber: selectedSalesforceOrganization.AccountNumber ?? "",
    })

    if (existingOrganization) {
      toastError({
        error: new Error("Account already exists"),
      })
      return
    }

    const orgAddress = selectedSalesforceOrganization.BillingAddress

    const createdOrganization = await createOrganization({
      createdByUserId: loggedInUserId ?? "",
      sfAccountId: selectedSalesforceOrganization.Id,
      accountNumber: selectedSalesforceOrganization.AccountNumber ?? "",
      name: selectedSalesforceOrganization.Name ?? "",
      contactEmail: selectedSalesforceOrganization.ContactEmail ?? "",
      street: orgAddress?.street ?? "",
      city: orgAddress?.city ?? "",
      state: orgAddress?.state ?? "",
      postalCode: orgAddress?.postalCode ?? "",
      fundraisingConsultantUserId: loggedInRole === RolesEnum.SALES_REPRESENTATIVE ? loggedInUserId : null,
      ...(visibility ? { visibility } : {}),
    })

    void utils.organizations.getById.invalidate()
    void utils.organizations.listPaginated.invalidate()
    void utils.organizations.listPaginatedFromUserId.invalidate()
    void utils.organizations.checkDuplicateByAccountNumber.invalidate()

    toast.success(
      createSuccessMessage,
      redirectOnCreate ? { description: "Redirecting to organization dashboard..." } : undefined
    )

    if (redirectOnCreate && createdOrganization?.id) {
      router.push(`/dashboard/organizations/${createdOrganization.id}`)
    }

    onCreate?.()
  }

  const handleUpdateOrganization = async (data: FormValues) => {
    await updateOrganization({
      id: organization?.id,
      fundraisingConsultantUserId: data.fundraisingConsultantUser?.id,
    })

    toast.success(updateSuccessMessage)
    void utils.organizations.getById.invalidate()
    onUpdate?.()
  }

  const nameField: FormField<FormValues> = disableNameTypeahead
    ? {
        name: "name" as const,
        label: "Name",
        type: "text",
        className: "col-span-2",
        required: true,
      }
    : {
        name: "name" as const,
        label: "Name",
        type: "typeahead",
        className: "col-span-2",
        required: true,
        onValueChange: (enteredOrgName, setEmptyMessage, setSuggestions) => {
          void onOrgNameChange(enteredOrgName, setEmptyMessage, setSuggestions)
        },
        onValueSelect: onOrgSelect,
        allowScrollWheelNav: true,
      }

  const formFields: FormField<FormValues>[] = [
    nameField,
    {
      name: "accountNumber",
      label: "Account Number",
      type: "text",
      className: "col-span-2",
      required: true,
    },
    {
      name: "contactEmail",
      label: "Contact Email",
      type: "text",
      className: "col-span-2",
      required: true,
    },
    {
      name: "street",
      label: "Street address",
      type: "text",
      className: "col-span-1",
      required: true,
    },
    {
      name: "city",
      label: "City",
      type: "text",
      className: "col-span-1",
      required: true,
    },
    {
      name: "postalCode",
      label: "Postal code",
      type: "text",
      required: true,
    },
    {
      name: "state",
      label: "State / Province",
      type: "text",
      required: true,
    },
  ]
  const fundraisingConsultantUsersList: { id: string; fullName: string; email: string; phone: string }[] =
    !!fundraisingConsultantUsers?.length
      ? fundraisingConsultantUsers.map(user => {
          return { id: user.id, fullName: user.fullName ?? "", email: user.email ?? "", phone: user.phone ?? "" }
        })
      : []

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
        {organization ? (
          formFields
            .filter(field => field.name !== "fundraisingConsultantUser")
            .map(field => (
              <FormFieldWrapper key={field.name} {...field} control={form.control} disabled={!!organization} />
            ))
        ) : (
          <>
            <OrganizationSearch
              mode={searchMode}
              value={searchValue}
              hasError={searchError}
              onValueChange={setSearchValue}
              onSearch={() => {
                void searchOrganization()
              }}
              searching={searching}
              onModeChange={newMode => {
                setSearchMode(newMode)

                setSearchValue("")
                setSearchError(false)
                setSelectedOrganization(null)
                setSelectedSalesforceOrganization(null)
                form.reset({
                  name: "",
                  contactEmail: "",
                  street: "",
                  city: "",
                  state: "",
                  postalCode: "",
                  fundraisingConsultantUser: null,
                })
              }}
              input={
                searchMode === "name" ? (
                  <Typeahead
                    value={searchValue}
                    placeholder="Enter organization name"
                    error={searchError}
                    onChange={(value, setEmptyMessage, setSuggestions) => {
                      setSearchValue(value)
                      setSelectedOrganization(null)
                      setSelectedSalesforceOrganization(null)
                      setSearchError(false)

                      void onOrgNameChange(value, setEmptyMessage, setSuggestions)
                    }}
                    onSelect={onOrgSelect}
                    className="pl-9"
                    allowScrollWheelNav
                  />
                ) : undefined
              }
            />
            {selectedOrganization && (
              <div className="col-span-2 w-full">
                <OrganizationDetailsCard organization={selectedOrganization} />
              </div>
            )}
          </>
        )}

        {loggedInRole === RolesEnum.WFC_ADMIN && !!organization && (
          <>
            <Label htmlFor="fundraisingConsultantUser" className="font-semibold text-sm text-gray-900 -mt-1">
              Fundraising Consultant <span className="text-red-500">*</span>
            </Label>
            <Controller
              control={form.control}
              name="fundraisingConsultantUser"
              render={({ field, fieldState }) => (
                <>
                  <Combobox
                    options={fundraisingConsultantUsersList}
                    value={field.value}
                    error={!!fieldState.error}
                    onInputChange={value => {
                      if (
                        !value &&
                        !!getFCDetails() &&
                        !!form.getValues("fundraisingConsultantUser")?.id &&
                        form.getValues("fundraisingConsultantUser")?.id === getFCDetails()?.id
                      ) {
                        form.clearErrors("fundraisingConsultantUser")
                        form.trigger("fundraisingConsultantUser")
                      }
                      if (value !== form.getValues("fundraisingConsultantUser")?.fullName) {
                        form.setValue("fundraisingConsultantUser", null)
                        form.setError("fundraisingConsultantUser", {
                          message: "Please select Fundraising Consultant",
                        })
                      } else {
                        form.clearErrors("fundraisingConsultantUser")
                        form.trigger("fundraisingConsultantUser")
                      }
                    }}
                    onChange={user => {
                      if (user) {
                        form.setValue("fundraisingConsultantUser", user)
                        form.clearErrors("fundraisingConsultantUser")
                        form.trigger("fundraisingConsultantUser")
                      } else {
                        form.setValue("fundraisingConsultantUser", null)
                        form.setError("fundraisingConsultantUser", {
                          message: "Please select Fundraising Consultant",
                        })
                      }
                    }}
                  />
                  {fieldState.error && (
                    <>
                      <FormMessage className="col-span-2 -mt-2">{fieldState.error?.message}</FormMessage>
                    </>
                  )}
                </>
              )}
            />
          </>
        )}

        <div
          className={cn(
            "col-span-2 flex gap-2",
            organization ? (onBack ? "justify-start" : "justify-end") : "justify-end"
          )}
        >
          {organization && onBack && (
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

          {!organization && (
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
          )}

          {(organization ?? selectedOrganization) && (
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {organization && <Save />}

              {organization
                ? form.formState.isSubmitting
                  ? "Saving..."
                  : "Save"
                : form.formState.isSubmitting
                  ? "Adding..."
                  : "Add to Organizations"}
            </Button>
          )}
        </div>
      </form>
    </Form>
  )
}
