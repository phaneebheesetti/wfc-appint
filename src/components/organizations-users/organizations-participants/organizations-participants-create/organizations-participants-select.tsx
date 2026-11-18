import { zodResolver } from "@hookform/resolvers/zod"
import { useMemo } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Form } from "@/components/ui/form"
import { FormFieldWrapper } from "@/components/ui/form-field-wrapper"
import { api } from "@/trpc/react"
import { getUserDisplayName } from "@/utils/users"

const formSchema = z.object({
  userId: z.string(),
})

type FormValues = z.infer<typeof formSchema>

interface OrganizationsParticipantsSelectProps {
  organizationId: string
  campaignId: string
  onSubmit: () => void
}

export function OrganizationsParticipantsSelect({
  organizationId,
  campaignId,
  onSubmit,
}: OrganizationsParticipantsSelectProps) {
  const { data: organizationsUsers, isLoading: isOrganizationsUsersLoading } =
    api.organizationsUsers.getAllParticipants.useQuery({ organizationId })
  const { data: campaignsUsers, isLoading: isCampaignsUsersLoading } = api.campaignsUsers.listByCampaignId.useQuery({
    campaignId,
  })

  const { mutateAsync: createCampaignUser } = api.campaignsUsers.create.useMutation()
  const utils = api.useUtils()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userId: "",
    },
  })

  const participantsOptions = useMemo(() => {
    const campaignsUsersIds = campaignsUsers?.map(option => option.userId)

    const filteredOrganizationsUsers = organizationsUsers?.filter(option => !campaignsUsersIds?.includes(option.userId))

    return filteredOrganizationsUsers?.map(option => ({
      label: getUserDisplayName(option.user, option.user?.email ?? ""),
      value: option.userId,
    }))
  }, [organizationsUsers, campaignsUsers])

  const handleSubmit = async (data: FormValues) => {
    const campaign = await utils.campaigns.getById.fetch({ id: campaignId })
    if (!campaign || campaign.status !== "active") {
      toast.error("You can't add participants to a fundraiser after it's closed.")
      return
    }

    if (data.userId === "") {
      toast.error("Please select a participant")
      return
    }
    await createCampaignUser({
      organizationId,
      campaignId,
      userId: data.userId,
    })

    onSubmit()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
        <FormFieldWrapper
          name="userId"
          control={form.control}
          label="Participant"
          placeholder={isOrganizationsUsersLoading || isCampaignsUsersLoading ? "Loading..." : ""}
          type="select"
          options={participantsOptions}
          disabled={isOrganizationsUsersLoading || isCampaignsUsersLoading}
          required
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Adding..." : "Add"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
