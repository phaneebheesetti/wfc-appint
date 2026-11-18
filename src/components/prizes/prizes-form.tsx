"use client"

import { ErrorMessage } from "@hookform/error-message"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeft, Save } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { ImageUpload } from "@/components/file-upload/image-upload"
import { Button } from "@/components/ui/button"
import { Form, FormMessage } from "@/components/ui/form"
import { FormFieldWrapper } from "@/components/ui/form-field-wrapper"
import { PRIZE_GOAL_TYPE_DETAILS, PrizeGoalTypeEnum } from "@/constants/prize"
import { PRIZE_PREVIOUS_CHANGE_WARNING, PRIZE_SEQUENCE_INVALID_ERROR } from "@/constants/prize-sequence"
import { numberType } from "@/lib/zod"
import { type Prize } from "@/server/db/schema"
import { api } from "@/trpc/react"
import { cn } from "@/utils/cn"
import { toastError } from "@/utils/errors"
import { filterOutObjectUndefinedAndNull } from "@/utils/object"

const formSchema = z.object({
  name: z.string("Required").max(50),
  description: z.string().max(200).optional(),
  active: z.boolean().optional(),
  casesGoal: numberType.optional(),
  imageUrl: z.string().optional(),
  goalType: z.enum(PrizeGoalTypeEnum),
  previousPrizeId: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

const NO_PREVIOUS_PRIZE = "none"

interface PrizesFormProps {
  organizationId: string
  campaignId: string
  prize?: Prize
  onCreate?: () => void
  onUpdate?: () => void
  onBack?: () => void
}

export function PrizesForm({ organizationId, campaignId, prize, onCreate, onUpdate, onBack }: PrizesFormProps) {
  const utils = api.useUtils()
  const { mutateAsync: createPrize } = api.prizes.create.useMutation()
  const { mutateAsync: updatePrize } = api.prizes.update.useMutation()

  const { data: prizes = [], isLoading: isLoadingPrizes } = api.prizes.listByCampaignId.useQuery({ campaignId })

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ...(prize ? (filterOutObjectUndefinedAndNull(prize) as Partial<FormValues>) : {}),
      ...(prize ? { previousPrizeId: prize.previousPrizeId ?? NO_PREVIOUS_PRIZE } : {}),
      active: prize?.active ?? true,
      goalType: (prize?.goalType as PrizeGoalTypeEnum) ?? PrizeGoalTypeEnum.FIRST_CASE_CHECKOUT,
      casesGoal: prize?.casesGoal ?? undefined,
    },
  })

  const isTemplatePrize = !!prize?.prizeTemplateSlug

  // Edit flow only: warn when the previous prize link changes, block save when it would create a duplicate chain
  const watchPreviousPrizeId = form.watch("previousPrizeId")
  const selectedPreviousId = watchPreviousPrizeId === NO_PREVIOUS_PRIZE ? null : (watchPreviousPrizeId ?? null)
  const previousPrizeChanged = !!prize && !isTemplatePrize && selectedPreviousId !== (prize.previousPrizeId ?? null)
  const selectedPreviousPrize = prizes.find(p => p.id === selectedPreviousId)
  const selectedPreviousNext = selectedPreviousPrize?.nextPrizeId
    ? prizes.find(p => p.id === selectedPreviousPrize.nextPrizeId)
    : undefined
  // The chosen previous prize is this prize's own next prize
  const previousPrizeIsDownstream = (() => {
    const visited = new Set<string>()
    let cursor = selectedPreviousPrize
    while (prize && cursor && !visited.has(cursor.id)) {
      if (cursor.id === prize.id || cursor.previousPrizeId === prize.id) return true
      visited.add(cursor.id)
      cursor = prizes.find(p => p.id === cursor?.previousPrizeId)
    }
    return false
  })()
  const previousPrizeHasNext =
    previousPrizeChanged &&
    (previousPrizeIsDownstream ||
      (!!selectedPreviousNext && selectedPreviousNext.active && selectedPreviousNext.id !== prize?.id))

  const watchCaseLevel = form.watch("casesGoal")
  const watchGoalType = form.watch("goalType")

  const onSubmit = async (data: FormValues) => {
    if (prize) {
      if (previousPrizeHasNext) return
      await handleUpdatePrize(data)
    } else {
      await handleCreatePrize(data)
    }
  }

  const handleCreatePrize = async (data: FormValues) => {
    if (data.previousPrizeId) {
      const previousPrize = prizes.find(prize => prize.id === data.previousPrizeId)

      if (previousPrize?.nextPrizeId) {
        toastError({ error: new Error("Error! Previous prize already has another prize associated with it.") })
        return
      }
    }

    const createdPrize = await createPrize({
      ...data,
      organizationId,
      campaignId,
    })
    if (!createdPrize) {
      toastError({ error: new Error("Failed to create prize") })
      return
    }

    if (data.previousPrizeId) {
      await updatePrize({
        id: data.previousPrizeId,
        nextPrizeId: createdPrize.id,
      })
    }

    toast.success(`Prize created successfully`)
    void utils.prizes.listByCampaignId.invalidate()
    onCreate?.()
  }

  const handleUpdatePrize = async (data: FormValues) => {
    await updatePrize({
      ...data,
      previousPrizeId: isTemplatePrize
        ? undefined
        : data.previousPrizeId === NO_PREVIOUS_PRIZE
          ? null
          : data.previousPrizeId,
      id: prize?.id,
    })
    toast.success(`Prize updated successfully`)
    void utils.prizes.listByCampaignId.invalidate()
    onUpdate?.()
  }

  const handleImageUpload = (url: string) => {
    form.setValue("imageUrl", url)
    void form.trigger("imageUrl")
  }

  const predefinedCasesLevel = [1, 2, 3, 4, 5]

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
        <FormFieldWrapper
          name="name"
          control={form.control}
          label="Name"
          className="col-span-2"
          type="text"
          maxLength={50}
          description="This will be visible to participants."
          required
        />

        <FormFieldWrapper
          name="description"
          control={form.control}
          label="Description"
          className="col-span-2"
          type="textarea"
          maxLength={200}
        />

        <div className="col-span-2">
          <ImageUpload
            label="Upload Image"
            bucketName="prizes_images"
            folderPath={`${campaignId}/`}
            onUploadComplete={handleImageUpload}
            width={240}
            height={240}
            previewUrl={prize?.imageUrl ?? undefined}
            description="Image must be a square (1:1) PNG or JPG, at least 240×240 pixels, and under 5MB."
          />
          <ErrorMessage
            errors={form.formState.errors}
            name="imageUrl"
            render={({ message }) => <FormMessage>{message}</FormMessage>}
          />
        </div>

        <FormFieldWrapper
          name="goalType"
          control={form.control}
          label="Participant Eligibility"
          type="select"
          options={Object.values(PrizeGoalTypeEnum).map(goalType => ({
            value: goalType,
            label: PRIZE_GOAL_TYPE_DETAILS[goalType].label,
          }))}
          description="Choose the eligibility rules for participants in this prize."
          className="col-span-2"
        />

        {watchGoalType === PrizeGoalTypeEnum.CASE_PAYMENT && (
          <div className="mt-2 col-span-2 w-full">
            <h3 className="text-sm font-medium">Number of Cases</h3>
            <div className="flex gap-2 items-center">
              {predefinedCasesLevel.map(casesGoalQuantity => (
                <button
                  key={casesGoalQuantity}
                  type="button"
                  onClick={() => form.setValue("casesGoal", casesGoalQuantity)}
                  className={`mt-auto flex h-10 w-12 items-center justify-center rounded-md border ${
                    watchCaseLevel == casesGoalQuantity ? "border-2 border-black" : "border-gray-200 bg-white"
                  }`}
                >
                  <span className={`text-base ${watchCaseLevel == casesGoalQuantity ? "font-semibold" : ""}`}>
                    {casesGoalQuantity}
                  </span>
                </button>
              ))}

              <FormFieldWrapper
                name="casesGoal"
                control={form.control}
                type="number"
                placeholder="Custom Quantity"
                className="flex-1 w-full"
              />
            </div>
          </div>
        )}

        <FormFieldWrapper
          name="previousPrizeId"
          control={form.control}
          label="Previous Prize"
          placeholder={isLoadingPrizes ? "Loading..." : prize ? "None" : ""}
          description={
            isTemplatePrize ? (
              <div>The Previous Prize cannot be changed for Home Run Prize templates.</div>
            ) : (
              <div>
                Note:
                <ul className="list-disc pl-4">
                  <li>
                    If you select a previous prize, participants will only receive the specific prize they qualify for
                    in the sequence, rather than all individual prizes
                  </li>
                  <li>
                    If participants get EVERY prize for every level, do NOT select a previous prize. (Sell Level C
                    cases, participant gets prizes for Level A, B and C)
                  </li>
                  <li>
                    If participants ONLY get the specific prize, you must select a previous prize. (Sell Level C cases,
                    participant gets only the Level C prize)
                  </li>
                </ul>
              </div>
            )
          }
          type="select"
          options={
            prize
              ? [
                  { value: NO_PREVIOUS_PRIZE, label: "None" },
                  ...prizes.filter(p => p.id !== prize.id).map(p => ({ value: p.id, label: p.name })),
                ]
              : prizes
                  .filter(p => !p.nextPrizeId)
                  .map(prize => ({
                    value: prize.id,
                    label: prize.name,
                  }))
          }
          disabled={isLoadingPrizes || isTemplatePrize}
          selectContentClassName={
            prize
              ? "max-h-[min(24rem,var(--radix-select-content-available-height))] [&_[data-radix-select-viewport]]:!h-auto [&_[data-radix-select-viewport]]:max-h-[min(24rem,var(--radix-select-content-available-height))] [&_[data-radix-select-viewport]]:overflow-y-auto"
              : undefined
          }
          className="col-span-2"
        />

        {previousPrizeHasNext && (
          <p className="col-span-2 -mt-3 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
            {PRIZE_SEQUENCE_INVALID_ERROR}
          </p>
        )}

        {previousPrizeChanged && !previousPrizeHasNext && (
          <p className="col-span-2 -mt-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            {PRIZE_PREVIOUS_CHANGE_WARNING}
          </p>
        )}

        <FormFieldWrapper name="active" control={form.control} label="Active" type="checkbox" className="col-span-2" />

        <div className={cn("col-span-2 flex justify-end gap-2", prize && "justify-start")}>
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

          <Button type="submit" disabled={form.formState.isSubmitting || previousPrizeHasNext}>
            {prize && <Save />}
            {prize
              ? form.formState.isSubmitting
                ? "Saving..."
                : "Save"
              : form.formState.isSubmitting
                ? "Creating..."
                : "Create"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
