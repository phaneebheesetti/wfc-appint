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
import { Separator } from "@/components/ui/separator"
import { EVENT_GOAL_TYPE_DETAILS, EventGoalTypeEnum } from "@/constants/events"
import { numberType } from "@/lib/zod"
import { type Event } from "@/server/db/schema"
import { api } from "@/trpc/react"
import { cn } from "@/utils/cn"
import { filterOutObjectUndefinedAndNull } from "@/utils/object"

const formSchema = z.object({
  name: z.string("Required"),
  description: z.string().max(200).optional(),
  imageUrl: z.string().optional(),
  prizeId: z.string().optional(),
  casesGoal: numberType.optional(),
  goalType: z.enum(EventGoalTypeEnum),
  date: z.date().optional(),
  street: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  active: z.boolean().optional(),
  isOnlineEvent: z.boolean().optional(),
  onlineEventUrl: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface EventsFormProps {
  campaignId: string
  organizationId: string
  event?: Event
  onCreate?: () => void
  onUpdate?: () => void
  onBack?: () => void
}

export function EventsForm({ campaignId, organizationId, event, onCreate, onUpdate, onBack }: EventsFormProps) {
  const utils = api.useUtils()
  const { mutateAsync: createEvent } = api.events.create.useMutation()
  const { mutateAsync: updateEvent } = api.events.update.useMutation()

  const { data: prizes } = api.prizes.listByCampaignId.useQuery({
    campaignId,
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ...(event ? (filterOutObjectUndefinedAndNull(event) as Partial<FormValues>) : {}),
      active: event?.active ?? true,
    },
  })

  const onSubmit = async (data: FormValues) => {
    if (event) {
      await handleUpdateEvent(data)
    } else {
      await handleCreateEvent(data)
    }
  }

  const handleCreateEvent = async (data: FormValues) => {
    await createEvent({
      ...data,
      organizationId,
      campaignId,
    })
    toast.success("Event created successfully")
    void utils.events.listByCampaignId.invalidate()
    onCreate?.()
  }

  const handleUpdateEvent = async (data: FormValues) => {
    await updateEvent({
      ...data,
      id: event?.id,
    })
    toast.success("Event updated successfully")
    void utils.events.listByCampaignId.invalidate()
    onUpdate?.()
  }

  const watchGoalType = form.watch("goalType")
  const watchCaseLevel = form.watch("casesGoal")
  const watchIsOnlineEvent = form.watch("isOnlineEvent")

  const predefinedCasesLevel = [1, 2, 3, 4, 5]

  const handleImageUpload = (url: string) => {
    form.setValue("imageUrl", url)
    void form.trigger("imageUrl")
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
        <FormFieldWrapper
          name="name"
          control={form.control}
          label="Event Name"
          className="col-span-2"
          type="text"
          description="This will be visible to participants."
          required
        />

        <div className="col-span-2">
          <ImageUpload
            label="Upload Event Image"
            bucketName="events_images"
            folderPath={`${campaignId}/`}
            onUploadComplete={handleImageUpload}
            width={240}
            height={240}
            previewUrl={event?.imageUrl ?? undefined}
            description="Image must be a square (1:1) PNG or JPG, at least 240×240 pixels, and under 5MB."
          />
          <ErrorMessage
            errors={form.formState.errors}
            name="imageUrl"
            render={({ message }) => <FormMessage>{message}</FormMessage>}
          />
        </div>

        <Separator className="col-span-2" />

        <FormFieldWrapper
          name="goalType"
          control={form.control}
          label="Set Participant Eligibility"
          type="select"
          options={Object.values(EventGoalTypeEnum)
            .filter(goalType => goalType !== EventGoalTypeEnum.PRIZE_QUALIFICATION)
            .map(goalType => ({
              value: goalType,
              label: EVENT_GOAL_TYPE_DETAILS[goalType].label,
            }))}
          onChange={() => {
            form.setValue("prizeId", undefined)
          }}
          description="Choose the eligibility rules for participants in this event."
          className="col-span-2"
          required
        />

        {watchGoalType === EventGoalTypeEnum.CASE_PAYMENT && (
          <div className="mt-2 col-span-2">
            <h3 className="text-sm font-medium">Select the number of Cases</h3>
            <div className="flex gap-3 items-center">
              {predefinedCasesLevel.map(casesGoalQuantity => (
                <button
                  key={casesGoalQuantity}
                  type="button"
                  onClick={() => form.setValue("casesGoal", casesGoalQuantity)}
                  className={`mt-auto flex h-10 w-12 items-center justify-center rounded-control border ${
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
                className="flex-1"
              />
            </div>
          </div>
        )}

        {watchGoalType === EventGoalTypeEnum.PRIZE_QUALIFICATION && (
          <FormFieldWrapper
            name="prizeId"
            control={form.control}
            label="Prize"
            type="select"
            options={[
              ...(prizes?.map(prize => ({
                value: prize.id,
                label: `${prize.name}`,
              })) ?? []),
            ]}
          />
        )}

        <Separator className="col-span-2" />

        <FormFieldWrapper
          name="date"
          control={form.control}
          label="Event Date"
          type="date"
          className="col-span-2"
          fromDate={new Date()}
        />

        <FormFieldWrapper
          name="description"
          control={form.control}
          label="Event Description"
          className="col-span-2"
          type="textarea"
          maxLength={200}
        />

        <FormFieldWrapper
          name="isOnlineEvent"
          control={form.control}
          label="Is Online Event"
          type="checkbox"
          className="col-span-2"
        />

        {watchIsOnlineEvent && (
          <FormFieldWrapper
            name="onlineEventUrl"
            control={form.control}
            className="col-span-2"
            label="Online Event URL"
            type="text"
            required
          />
        )}

        {!watchIsOnlineEvent && (
          <>
            <FormFieldWrapper name="street" control={form.control} label="Street address" type="text" />

            <FormFieldWrapper name="city" control={form.control} label="City" type="text" />

            <FormFieldWrapper name="postalCode" control={form.control} label="Postal code" type="text" />

            <FormFieldWrapper name="state" control={form.control} label="State / Province" type="text" />
          </>
        )}

        <FormFieldWrapper
          name="active"
          control={form.control}
          label="Active Event"
          type="checkbox"
          className="col-span-2"
        />

        <div className={cn("col-span-2 flex justify-end gap-2", event && "justify-start")}>
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
            {event && <Save />}
            {event
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
