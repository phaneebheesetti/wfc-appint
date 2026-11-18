"use client"

import { ArrowRight, CheckCircle2, Pencil } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { usePrizeTemplates } from "@/components/prizes/use-prize-templates"
import { Button } from "@/components/ui/button"
import { CREATE_MY_OWN_LABEL, type PrizeTemplateSelection } from "@/constants/prize-selection"
import { useLoggedInUser } from "@/hooks/use-logged-in-user"
import { api } from "@/trpc/react"

import { FeatureSelectionFields } from "./sections/feature-selection-fields"

type Step4PrizePaymentProps = {
  campaignId: string
  initialPrizeTemplateSlug: PrizeTemplateSelection
  initialDigitalPayment: boolean
  isSaved: boolean
  onSavedAndContinue: () => Promise<void> | void
  onSkip: () => void
}

export function Step4PrizePayment({
  campaignId,
  initialPrizeTemplateSlug,
  initialDigitalPayment,
  isSaved,
  onSavedAndContinue,
  onSkip,
}: Step4PrizePaymentProps) {
  const [prizeTemplateSlug, setPrizeTemplateSlug] = useState<PrizeTemplateSelection>(initialPrizeTemplateSlug)
  const [digitalPayment, setDigitalPayment] = useState(initialDigitalPayment)
  const [submitting, setSubmitting] = useState(false)
  // When the step is already saved we show a summary; "Edit" reveals the controls again.
  const [editing, setEditing] = useState(false)

  const { loggedInUserId } = useLoggedInUser()

  const { mutateAsync: updateCampaign } = api.campaigns.update.useMutation()
  const { mutateAsync: applyPrizeTemplate } = api.prizes.applyTemplate.useMutation()
  const { mutateAsync: setOnboardingStep } = api.users.setOnboardingStep.useMutation()

  const { options } = usePrizeTemplates()
  const selectedLabel = options.find(option => option.id === prizeTemplateSlug)?.name ?? CREATE_MY_OWN_LABEL

  const onSave = async () => {
    if (!loggedInUserId) {
      toast.error("User not found")
      return
    }
    setSubmitting(true)
    try {
      await updateCampaign({
        id: campaignId,
        digitalPayment,
      })

      await setOnboardingStep({
        userId: loggedInUserId,
        campaignId,
        step: "prizePaymentSavedAt",
        savedAt: new Date().toISOString(),
      })

      if (prizeTemplateSlug !== initialPrizeTemplateSlug) {
        await applyPrizeTemplate({ campaignId, prizeTemplateSlug })
      }

      toast.success("Feature Selection saved")
      setEditing(false)
      await onSavedAndContinue()
    } catch {
      toast.error("Failed to save Feature Selection")
    } finally {
      setSubmitting(false)
    }
  }

  const onCancelEdit = () => {
    // Discard unsaved changes and collapse back to the summary.
    setPrizeTemplateSlug(initialPrizeTemplateSlug)
    setDigitalPayment(initialDigitalPayment)
    setEditing(false)
  }

  if (isSaved && !editing) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-card border border-green-200 bg-green-50 px-4 py-3 text-sm">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
          <div>
            <div className="text-green-900/80">Prize Program - {selectedLabel}</div>
            <div className="text-green-900/80">Digital Payment - {digitalPayment ? "Enabled" : "Disabled"}</div>
          </div>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
          <Pencil /> Edit
        </Button>
      </div>
    )
  }

  return (
    <div>
      <p className="mb-4 text-sm text-muted-foreground">Reward top participants and turn on online payments.</p>

      <FeatureSelectionFields
        prizeTemplateSlug={prizeTemplateSlug}
        digitalPayment={digitalPayment}
        onPrizeTemplateChange={setPrizeTemplateSlug}
        onDigitalPaymentChange={setDigitalPayment}
        disabled={submitting}
      />

      <div className="mt-5 flex items-center gap-3">
        <Button type="button" onClick={onSave} disabled={submitting}>
          {submitting ? "Saving..." : editing ? "Save Changes" : "Save & Continue"} <ArrowRight />
        </Button>
        {editing ? (
          <Button type="button" variant="ghost" onClick={onCancelEdit} disabled={submitting}>
            Cancel
          </Button>
        ) : (
          <Button type="button" variant="ghost" onClick={onSkip}>
            Skip for now <ArrowRight />
          </Button>
        )}
      </div>
    </div>
  )
}
