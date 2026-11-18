"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowRight, CheckCircle2, Megaphone, Pencil } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form } from "@/components/ui/form"
import { CampaignsStatusEnum, CampaignsVisibilityEnum } from "@/constants/campaigns"
import { useLoggedInUser } from "@/hooks/use-logged-in-user"
import type { Campaign } from "@/server/db/schema"
import { api } from "@/trpc/react"
import { formatDate } from "@/utils/date"
import { firstLetterUpperCase } from "@/utils/string"

import {
  FundraiserDetailsFields,
  type FundraiserDetailsValues,
  fundraiserDetailsSchema,
} from "./sections/fundraiser-details-fields"

type FormValues = FundraiserDetailsValues

type Step2CreateFundraiserProps = {
  organizationId: string
  campaign?: Campaign | null
  onCreated: () => Promise<void> | void
}

export function Step2CreateFundraiser({ organizationId, campaign, onCreated }: Step2CreateFundraiserProps) {
  const { loggedInUserId } = useLoggedInUser()
  const { mutateAsync: createCampaign } = api.campaigns.create.useMutation()
  const { mutateAsync: updateCampaign } = api.campaigns.update.useMutation()

  const [open, setOpen] = useState(false)

  const isEditing = Boolean(campaign)

  const form = useForm<FormValues>({
    resolver: zodResolver(fundraiserDetailsSchema),
    mode: "onChange",
  })

  // Open the dialog for a fresh fundraiser.
  const openForCreate = () => {
    form.reset({ name: "", startDate: undefined, endDate: undefined })
    setOpen(true)
  }

  // Open the dialog prefilled with the existing draft so the FC can edit it before launching.
  const openForEdit = () => {
    if (campaign) {
      form.reset({
        name: campaign.name,
        startDate: new Date(campaign.startDate),
        endDate: new Date(campaign.endDate),
      })
    }
    setOpen(true)
  }

  const onSubmit = async (data: FormValues) => {
    if (!loggedInUserId) {
      toast.error("User not found")
      return
    }

    if (campaign) {
      await updateCampaign({
        id: campaign.id,
        name: firstLetterUpperCase(data.name),
        startDate: data.startDate,
        endDate: data.endDate,
      })
      toast.success("Fundraiser updated")
    } else {
      // sponsorId is NOT NULL — use the FC as a placeholder; Step 5 overwrites with the real sponsor.
      await createCampaign({
        name: firstLetterUpperCase(data.name),
        startDate: data.startDate,
        endDate: data.endDate,
        organizationId,
        createdByUserId: loggedInUserId,
        sponsorId: loggedInUserId,
        profitSharePercentage: 0,
        status: CampaignsStatusEnum.INACTIVE,
        visibility: CampaignsVisibilityEnum.DRAFT,
      })
      toast.success("Fundraiser saved as draft")
    }

    setOpen(false)
    form.reset()
    await onCreated()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* Once the fundraiser exists, show a summary with an Edit action (drafts stay editable
          until the FC launches) instead of allowing a second fundraiser to be created. */}
      {campaign ? (
        <div className="flex items-center justify-between gap-3 rounded-card border border-green-200 bg-green-50 px-4 py-3 text-sm">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
            <div className="space-y-0.5 text-green-900">
              <div>
                <span className="font-semibold">Fundraiser Name</span> - {campaign.name}
              </div>
              <div>
                <span className="font-semibold">Start Date</span> - {formatDate(new Date(campaign.startDate))}
              </div>
              <div>
                <span className="font-semibold">End Date</span> - {formatDate(new Date(campaign.endDate))}
              </div>
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={openForEdit}>
            <Pencil /> Edit
          </Button>
        </div>
      ) : (
        <>
          <p className="mb-4 text-sm text-muted-foreground">Name your fundraiser and set the dates.</p>
          <Button type="button" onClick={openForCreate}>
            <Megaphone /> Create Fundraiser
          </Button>
        </>
      )}

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Fundraiser" : "Create Fundraiser"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FundraiserDetailsFields control={form.control} />

            <div className="flex justify-end sm:col-span-2">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving..." : isEditing ? "Save Changes" : "Save & Continue"}{" "}
                <ArrowRight />
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
