"use client"

import { Check } from "lucide-react"
import { useRouter } from "next/navigation"
import { type ReactNode, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { type DigitalSalesDetails } from "@/server/db/schema"
import { api } from "@/trpc/react"
import { cn } from "@/utils/cn"

import { InventoryDialog } from "./inventory-dialog"
import { MIN_CASES_CHECKED_OUT } from "./use-cases-checked-out-stepper"

interface SalesPageStepsProps {
  fundraiserId: string
  participantId: string
  details: DigitalSalesDetails
  onEditMessage: () => void
}

export function SalesPageSteps({ fundraiserId, participantId, details, onEditMessage }: SalesPageStepsProps) {
  const utils = api.useUtils()
  const [inventoryDialogOpen, setInventoryDialogOpen] = useState(false)

  const toggleSalesPage = api.digitalSalesInformation.toggleSalesPage.useMutation({
    onSuccess: async () => {
      await utils.digitalSalesInformation.getByParticipantAndFundraiser.invalidate({ participantId, fundraiserId })
    },
    onError: () => toast.error("Something went wrong. Please try again."),
  })
  const router = useRouter()
  const messageDone = !!details.personal_message?.created_at
  const inventoryDone = !!details.inventory_details?.marked_done
  const bothDone = messageDone && inventoryDone
  const salesPageEnabled = !!details.enable_sales_page?.is_active
  const goToSharePage = () => router.push(`/dashboard/campaigns/${fundraiserId}/share-page?userId=${participantId}`)

  const inventoryDescription = inventoryDone
    ? `${details.inventory_details?.cases_checked_out} ${details.inventory_details?.cases_checked_out === 1 ? "case" : "cases"} loaded (${details.inventory_details?.total_bars} bars)`
    : "Load your cases so packages can be sold on your page."

  return (
    <div className="flex flex-col">
      <StepShell
        number={1}
        title="Personal Message"
        description="Tell supporters what the fundraiser is for — keep it personal!"
        done={messageDone}
      >
        <MessagePreview text={details.personal_message?.message} />
        <div className="mt-3 flex justify-center">
          <Button variant="secondary" className="w-full sm:w-auto" onClick={onEditMessage}>
            {messageDone ? "Edit Message" : "Add Message"}
          </Button>
        </div>
      </StepShell>

      <StepShell number={2} title="Add Inventory" description={inventoryDescription} done={inventoryDone}>
        <div className="flex justify-center">
          <Button variant="secondary" className="w-full sm:w-auto" onClick={() => setInventoryDialogOpen(true)}>
            {inventoryDone ? "Edit Inventory" : "Add Inventory"}
          </Button>
        </div>
      </StepShell>

      <StepShell
        number={3}
        title="Enable Your Sales Page"
        description={
          salesPageEnabled
            ? "Your page is live! Continue below to share it."
            : bothDone
              ? "You're all set! Turn on your page to start accepting orders."
              : "Complete steps 1 & 2 to unlock this step."
        }
        done={salesPageEnabled}
        locked={!bothDone}
        required={false}
        isLast
      >
        <div className="flex items-center justify-between gap-4">
          <p className="text-muted-foreground">
            Once enabled, friends and family can buy online for you to deliver to them in-person.
          </p>
          <button
            type="button"
            disabled={!bothDone || toggleSalesPage.isPending}
            onClick={() =>
              toggleSalesPage.mutate({
                participantId,
                fundraiserId,
                isActive: !salesPageEnabled,
              })
            }
            className={cn(
              "relative h-8 w-14 shrink-0 rounded-full transition-colors duration-200 md:h-7 md:w-12",
              salesPageEnabled ? "bg-primary" : "bg-[#dfd0b3]"
            )}
          >
            <span
              className={cn(
                "absolute left-0.5 top-0.5 h-7 w-7 rounded-full bg-white shadow transition-transform duration-200 md:h-6 md:w-6",
                salesPageEnabled && "translate-x-6 md:translate-x-5"
              )}
            />
          </button>
        </div>
        {salesPageEnabled && (
          <div className="mt-3 flex justify-center">
            <Button className="w-full sm:w-auto bg-success" onClick={goToSharePage}>
              Share Your Page
            </Button>
          </div>
        )}
      </StepShell>

      <InventoryDialog
        open={inventoryDialogOpen}
        onOpenChange={setInventoryDialogOpen}
        fundraiserId={fundraiserId}
        participantId={participantId}
        initialCasesCheckedOut={details.inventory_details?.cases_checked_out ?? MIN_CASES_CHECKED_OUT}
        soldInPerson={details.inventory_details?.sold_in_person ?? 0}
        soldOnline={details.inventory_details?.sold_online ?? 0}
      />
    </div>
  )
}

interface StepShellProps {
  number: number
  title: string
  description: string
  done: boolean
  locked?: boolean
  required?: boolean
  isLast?: boolean
  children: ReactNode
}

function StepShell({ number, title, description, done, locked, required = true, isLast, children }: StepShellProps) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold",
            done ? "border-success bg-success text-success-foreground" : "border-input text-muted-foreground"
          )}
        >
          {done ? <Check className="h-5 w-5" /> : number}
        </div>
        {!isLast && <div className="my-1 w-px flex-1 bg-border" />}
      </div>

      <div className={cn("mb-4 flex-1 rounded-card border bg-card p-4 shadow-elev-1", locked && "opacity-70")}>
        <div className="flex items-start justify-between gap-2">
          <div className="text-[17px] font-bold text-foreground">{title}</div>
          {done ? (
            <StepBadge tone="success">Done</StepBadge>
          ) : required && !locked ? (
            <StepBadge tone="warning">Required</StepBadge>
          ) : null}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  )
}

function StepBadge({ tone, children }: { tone: "success" | "warning"; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold",
        tone === "success" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", tone === "success" ? "bg-success" : "bg-warning")} />
      {children}
    </span>
  )
}

function MessagePreview({ text }: { text?: string }) {
  const isEmpty = !text
  return (
    <div className="flex items-start gap-3 rounded-control border-l-4 border-primary bg-creamy-50 p-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#ffa004] text-sm">🐱</span>
      <p className={cn("text-sm italic", isEmpty ? "text-muted-foreground" : "text-primary")}>
        {isEmpty ? "Not added yet" : `"${text}"`}
      </p>
    </div>
  )
}
