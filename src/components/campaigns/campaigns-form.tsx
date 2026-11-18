"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeft, Plus, User } from "lucide-react"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { type Control, type UseFormWatch, useFieldArray, useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { OrganizationsMembersInviteForm } from "@/components/organizations-users/organizations-members/organizations-members-invite-form"
import { PrizeProgramSelect } from "@/components/prizes/prize-program-select"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Form, FormField as FormFieldControl, FormItem, FormLabel } from "@/components/ui/form"
import { type FormField, FormFieldWrapper } from "@/components/ui/form-field-wrapper"
import { Modal } from "@/components/ui/modal"
import { CampaignsStatusEnum } from "@/constants/campaigns"
import { CasesTransactionsTypeEnum } from "@/constants/cases-transactions"
import { RolesEnum } from "@/constants/roles"
import { useLoggedInUser } from "@/hooks"
import { currencyType, numberType } from "@/lib/zod"
import { type Campaign } from "@/server/db/schema"
import { api } from "@/trpc/react"
import { getCaseName } from "@/utils/cases-transactions"
import { cn } from "@/utils/cn"
import { formatCurrencyToCents } from "@/utils/money"
import { filterOutObjectUndefinedAndNull } from "@/utils/object"
import { firstLetterUpperCase } from "@/utils/string"
import { getUserDisplayName } from "@/utils/users"

const formSchema = z.object({
  name: z.string().trim().min(1, "Fundraiser name is required"),
  startDate: z.date({
    error: "Please select a date",
  }),
  endDate: z.date({
    error: "Please select a date",
  }),
  organizationId: z.string(),
  sponsorId: z.string().min(1, "Choose a Sponsor"),
  sameAsAdmin: z.boolean().optional(),
  digitalPayment: z.boolean().optional(),
  digitalPermissionSlip: z.boolean().optional(),
  prizeTemplateSlug: z.string().nullable(),
  products: z.array(
    z.object({
      casesBilled: numberType.int().nonnegative().optional(),
      casesFree: numberType.int().nonnegative().optional(),
      barsPerCase: numberType.int().positive(),
      pricePerCase: currencyType,
      profitPerCase: currencyType,
    })
  ),
})

type FormValues = z.infer<typeof formSchema>

type CampaignsFormProps = {
  organizationId: string
  campaign?: Campaign
  onCreate?: () => void
  onUpdate?: () => void
  onBack?: () => void
}

export function CampaignsForm({ organizationId, campaign, onCreate, onUpdate, onBack }: CampaignsFormProps) {
  const utils = api.useUtils()
  const { loggedInUserId } = useLoggedInUser()
  const router = useRouter()

  const [sponsorFormOpen, setSponsorFormOpen] = useState(false)
  const [productsOpen, setProductsOpen] = useState<string[]>(["product-0"])

  const { data: organizationAdmin } = api.organizationsUsers.getAdmin.useQuery({ organizationId })
  const { data: sponsors } = api.organizationsUsers.getAllMembers.useQuery({
    organizationId,
    roles: [RolesEnum.ORGANIZATION_ADMIN, RolesEnum.ORGANIZATION_STAFF],
    activeOnly: true,
  })

  const { mutateAsync: createCampaign } = api.campaigns.create.useMutation()
  const { mutateAsync: updateCampaign } = api.campaigns.update.useMutation()
  const { mutateAsync: applyPrizeTemplate } = api.prizes.applyTemplate.useMutation()
  const { mutateAsync: createCasesDeliveredRecord } = api.casesTransactions.create.useMutation()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      sponsorId: "",
      organizationId,
      sameAsAdmin: false,
      digitalPayment: false,
      digitalPermissionSlip: true,
      prizeTemplateSlug: campaign?.prizeTemplateSlug ?? null,
      ...(campaign ? (filterOutObjectUndefinedAndNull(campaign ?? {}) as Partial<FormValues>) : {}),
      products: [
        {
          barsPerCase: 40,
          pricePerCase: "$0",
          profitPerCase: "$0",
        },
      ],
    },
  })
  const { fields, append } = useFieldArray({ control: form.control, name: "products" })

  const onSubmit = async (data: FormValues) => {
    if (campaign) {
      await handleUpdateCampaign(data)
    } else {
      await handleCreateCampaign(data)
    }
  }

  const handleCreateCampaign = async (data: FormValues) => {
    if (!loggedInUserId) {
      toast.error("User not found")
      return
    }

    const startDate = new Date(data.startDate)
    const endDate = new Date(data.endDate)
    if (endDate < startDate) {
      toast.error("End date must be after start date.")
      return
    }
    const sponsorId = data.sameAsAdmin ? organizationAdmin?.id : data.sponsorId

    const createdCampaign = await createCampaign({
      name: firstLetterUpperCase(data.name),
      startDate: data.startDate,
      endDate: data.endDate,
      profitSharePercentage: 0,
      createdByUserId: loggedInUserId ?? "",
      organizationId: organizationId,
      sponsorId: sponsorId ?? "",
      status: CampaignsStatusEnum.ACTIVE,
      digitalPayment: data.digitalPayment,
      digitalPermissionSlip: data.digitalPermissionSlip,
    })
    if (!createdCampaign) {
      toast.error("Failed to create fundraiser")
      return
    }

    if (data.prizeTemplateSlug) {
      await applyPrizeTemplate({ campaignId: createdCampaign.id, prizeTemplateSlug: data.prizeTemplateSlug })
    }

    await Promise.all(
      data.products.map(product =>
        handleCreateCasesDeliveredRecord({
          casesBilled: product.casesBilled ?? 0,
          casesFree: product.casesFree ?? 0,
          barsPerCase: product.barsPerCase,
          pricePerCase: product.pricePerCase,
          profitPerCase: product.profitPerCase,
          campaignId: createdCampaign?.id ?? "",
        })
      )
    )

    void utils.campaigns.getByOrganizationId.invalidate()
    void utils.campaignsUsers.listByUserIds.invalidate()
    void utils.campaigns.getCampaignsByUserIdWithSponsor.invalidate()
    void utils.campaigns.getByCreatedByUserId.invalidate()
    void utils.campaigns.getCampaignsByUserId.invalidate()

    toast.success(`Fundraiser created successfully`, {
      description: "Redirecting to fundraiser dashboard...",
    })

    if (createdCampaign?.id) {
      router.push(`/dashboard/organizations/${organizationId}/campaigns/${createdCampaign.id}`)
    }

    onCreate?.()
  }

  const handleUpdateCampaign = async (data: FormValues) => {
    if (!campaign?.id) {
      throw new Error("Campaign ID is required")
    }

    const sponsorId = data.sameAsAdmin ? organizationAdmin?.id : data.sponsorId
    const previousTemplateSlug = campaign.prizeTemplateSlug ?? null

    try {
      if (data.prizeTemplateSlug !== previousTemplateSlug) {
        await applyPrizeTemplate({ campaignId: campaign.id, prizeTemplateSlug: data.prizeTemplateSlug })
      }

      await updateCampaign({
        id: campaign.id,
        name: data.name,
        startDate: data.startDate,
        endDate: data.endDate,
        profitSharePercentage: 0,
        sponsorId: sponsorId ?? "",
        status: campaign.status,
        digitalPayment: data.digitalPayment,
        digitalPermissionSlip: data.digitalPermissionSlip,
      })
    } catch {
      toast.error("Failed to update Fundraiser")
      form.setValue("prizeTemplateSlug", previousTemplateSlug)
      return
    }

    toast.success(`Fundraiser updated successfully`)
    void utils.campaigns.getByOrganizationId.invalidate()
    void utils.paymentLogs.getTotalByPaymentMethodAndWeekday.invalidate()
    void utils.campaignsUsers.listByUserIds.invalidate()
    void utils.campaigns.getCampaignsByUserIdWithSponsor.invalidate()
    void utils.campaigns.getByCreatedByUserId.invalidate()
    void utils.campaigns.getCampaignsByUserId.invalidate()
    void utils.campaigns.getHeaderMetrics.invalidate()
    void utils.prizes.listByCampaignId.invalidate()

    onUpdate?.()
  }

  const handleCreateCasesDeliveredRecord = async ({
    casesBilled,
    casesFree,
    barsPerCase,
    pricePerCase,
    profitPerCase,
    campaignId,
  }: {
    casesBilled: number
    casesFree: number
    barsPerCase: number
    pricePerCase: string
    profitPerCase: string
    campaignId: string
  }) => {
    if (!loggedInUserId) {
      toast.error("User not found")
      return
    }

    let profitPerCaseNum = parseFloat(profitPerCase) || 0
    let pricePerCaseNum = (parseFloat(pricePerCase) || 0) + profitPerCaseNum
    let costPerCaseNum = pricePerCaseNum - profitPerCaseNum

    if (casesBilled && casesBilled > 0) {
      // Convert to cents with proper rounding to avoid floating point precision issues
      const pricePerCaseCents = Math.round(pricePerCaseNum * 100)
      const totalPriceCents = Math.round(pricePerCaseCents * casesBilled)

      const profitPerCaseCents = Math.round(profitPerCaseNum * 100)
      const totalProfitCents = Math.round(profitPerCaseCents * casesBilled)

      const costPerCaseCents = Math.round(costPerCaseNum * 100)
      const totalCostCents = Math.round(costPerCaseCents * casesBilled)

      const pricePerBarCents = Math.round(pricePerCaseCents / barsPerCase)

      await createCasesDeliveredRecord({
        createdByUserId: loggedInUserId,
        organizationId: organizationId,
        campaignId,
        type: CasesTransactionsTypeEnum.DELIVERED,
        quantity: casesBilled,
        pricePerCaseCents,
        totalPriceCents,
        profitPerCaseCents,
        totalProfitCents,
        costPerCaseCents,
        totalCostCents,
        pricePerBarCents,
        barsPerCase,
      })
    }

    if (casesFree && casesFree > 0) {
      profitPerCaseNum = pricePerCaseNum
      pricePerCaseNum = pricePerCaseNum
      costPerCaseNum = pricePerCaseNum - profitPerCaseNum

      // Convert to cents with proper rounding to avoid floating point precision issues
      const pricePerCaseCents = Math.round(pricePerCaseNum * 100)
      const totalPriceCents = Math.round(pricePerCaseCents * casesFree)

      const profitPerCaseCents = Math.round(profitPerCaseNum * 100)
      const totalProfitCents = Math.round(profitPerCaseCents * casesFree)

      const costPerCaseCents = Math.round(costPerCaseNum * 100)
      const totalCostCents = Math.round(costPerCaseCents * casesFree)

      const pricePerBarCents = Math.round(pricePerCaseCents / barsPerCase)

      await createCasesDeliveredRecord({
        createdByUserId: loggedInUserId,
        organizationId: organizationId,
        campaignId,
        type: CasesTransactionsTypeEnum.DELIVERED,
        quantity: casesFree,
        pricePerCaseCents,
        totalPriceCents,
        profitPerCaseCents,
        totalProfitCents,
        costPerCaseCents,
        totalCostCents,
        pricePerBarCents,
        barsPerCase,
      })
    }
  }

  const baseFields: FormField<FormValues>[] = [
    {
      name: "name",
      label: "Fundraiser Name",
      description: "Add semester and year to help identify and organize fundraisers inside your organization",
      type: "text",
      className: "col-span-6",
      required: true,
    },
    {
      name: "startDate",
      label: "Start date",
      type: "date",
      required: true,
      className: "col-span-3",
    },
    {
      name: "endDate",
      label: "End date",
      type: "date",
      fromDate: form.watch("startDate") ?? undefined,
      required: true,
      className: "col-span-3",
    },
  ]

  const checkboxFields: FormField<FormValues>[] = [
    {
      name: "digitalPayment",
      label: "Enable Digital Payments",
      info: "Allow people to pay for their chocolate order using a card, ACH, or other digital payment.",
      type: "checkbox",
      className: "col-span-6",
    },
    // {
    //   name: "digitalPermissionSlip",
    //   label: "Enable Digital Permission Slips",
    //   info: "Allow people to sign a digital permission slip for the fundraiser.",
    //   type: "checkbox",
    //   className: "col-span-6",
    // },
  ]

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-6 gap-6">
          {baseFields.map(field => (
            <FormFieldWrapper key={field.name} {...field} control={form.control} />
          ))}

          {!campaign?.id && (
            <div className="col-span-6 flex flex-col gap-2">
              <FormLabel>Inventory</FormLabel>

              <Accordion type="multiple" value={productsOpen} onValueChange={setProductsOpen}>
                {fields.map((product, index) => (
                  <ProductAccordionItem key={product.id} index={index} control={form.control} watch={form.watch} />
                ))}
              </Accordion>

              <div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setProductsOpen([...productsOpen, `product-${fields.length}`])
                    append({
                      barsPerCase: 40,
                      pricePerCase: "$0",
                      profitPerCase: "$0",
                    })
                  }}
                >
                  <Plus />
                  Add Product
                </Button>
              </div>
            </div>
          )}

          {checkboxFields.map(field => (
            <FormFieldWrapper key={field.name} {...field} control={form.control} />
          ))}

          <FormFieldControl
            control={form.control}
            name="prizeTemplateSlug"
            render={({ field }) => (
              <FormItem className="col-span-6 flex flex-col gap-2 space-y-0">
                <PrizeProgramSelect
                  value={field.value ?? null}
                  onChange={field.onChange}
                  disabled={form.formState.isSubmitting}
                />
              </FormItem>
            )}
          />

          <div className="col-span-6">
            <FormFieldWrapper
              name="sponsorId"
              control={form.control}
              label="Sponsor"
              type="select"
              options={[
                {
                  value: "new",
                  label: "Invite New Sponsor",
                },
                ...(sponsors?.map(({ user }) => ({
                  value: user?.id ?? "",
                  label: getUserDisplayName(user),
                })) ?? []),
              ]}
              onChange={value => {
                if (value === "new") {
                  setSponsorFormOpen(true)
                  form.setValue("sameAsAdmin", false)
                }

                if (value === organizationAdmin?.id) {
                  form.setValue("sameAsAdmin", true)
                }
              }}
              className="col-span-6"
              required
            />

            {organizationAdmin && form.watch("sponsorId") !== organizationAdmin.id && (
              <FormFieldWrapper
                name="sameAsAdmin"
                control={form.control}
                label={`Use the Organization Admin (${getUserDisplayName(organizationAdmin)})`}
                type="checkbox"
                className="col-span-6 mt-2"
                onChange={() => {
                  form.setValue("sponsorId", organizationAdmin.id)
                }}
              />
            )}
          </div>

          <div className={cn("col-span-6 flex justify-end gap-2", campaign && "justify-start")}>
            {onBack && (
              <Button
                type="button"
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
              {campaign
                ? form.formState.isSubmitting
                  ? "Saving..."
                  : "Save"
                : form.formState.isSubmitting
                  ? "Creating..."
                  : "Create"}
            </Button>
          </div>
        </form>

        <Modal
          open={sponsorFormOpen}
          onOpenChange={() => {
            setSponsorFormOpen(false)

            const sponsor = form.getValues("sponsorId")

            if (sponsor === "new") {
              form.resetField("sponsorId")
            }
          }}
          title="Invite New Sponsor"
          description="Invite a sponsor to support this fundraiser and join your organization"
          icon={User}
          iconClassName="text-green-500"
        >
          <OrganizationsMembersInviteForm
            organizationId={organizationId}
            onCreate={async sponsor => {
              await utils.organizationsUsers.getAllMembers.refetch()
              await utils.organizationsUsers.getAdmin.refetch()

              setSponsorFormOpen(false)

              form.setValue("sponsorId", sponsor.id)
              form.setValue(
                "sameAsAdmin",
                (sponsor.role as RolesEnum) === RolesEnum.ORGANIZATION_ADMIN && !organizationAdmin?.id
              )
            }}
          />
        </Modal>
      </Form>
    </>
  )
}

interface ProductAccordionItemProps {
  index: number
  control: Control<FormValues>
  watch: UseFormWatch<FormValues>
}

function ProductAccordionItem({ index, control, watch }: ProductAccordionItemProps) {
  const productFields: FormField<FormValues>[] = [
    {
      name: `products.${index}.casesBilled`,
      label: "Cases to be delivered",
      labelSmall: " (billed)",
      type: "number",
      required: true,
      className: "col-span-3",
    },
    {
      name: `products.${index}.casesFree`,
      label: "Cases to be delivered",
      labelSmall: " (free)",
      type: "number",
      className: "col-span-3",
    },
    {
      name: `products.${index}.barsPerCase`,
      label: "Bars per Case",
      type: "number",
      required: true,
      className: "col-span-2",
    },
    {
      name: `products.${index}.pricePerCase`,
      label: "Cost per Case",
      type: "currency",
      required: true,
      className: "col-span-2",
    },
    {
      name: `products.${index}.profitPerCase`,
      label: "Profit per Case",
      type: "currency",
      required: true,
      className: "col-span-2",
    },
  ]

  const product = watch(`products.${index}`)

  const caseName = useMemo(() => {
    const barsPerCase = product.barsPerCase
    const profitPerCaseCents = formatCurrencyToCents(product.profitPerCase) || 0
    const pricePerCaseCents = (formatCurrencyToCents(product.pricePerCase) || 0) + profitPerCaseCents
    const pricePerBarCents = Math.round(pricePerCaseCents / barsPerCase)

    return getCaseName({ pricePerBarCents, barsPerCase })
  }, [product.barsPerCase, product.pricePerCase, product.profitPerCase])

  return (
    <AccordionItem
      value={`product-${index}`}
      className="rounded-card border bg-card bg-gray-50 text-card-foreground shadow-elev-1 px-4 mb-2"
    >
      <AccordionTrigger className="group hover:no-underline">
        <div className="flex items-center gap-2">
          <span className="group-hover:underline">Product {index + 1}</span>
          <small className="text-muted-foreground">({caseName})</small>
        </div>
      </AccordionTrigger>
      <AccordionContent className="grid grid-cols-6 gap-6">
        {productFields.map(field => (
          <FormFieldWrapper key={field.name} {...field} control={control} />
        ))}
      </AccordionContent>
    </AccordionItem>
  )
}
