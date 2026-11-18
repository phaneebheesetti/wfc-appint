"use client"

import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/modal"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { BARS_PER_CASE } from "@/constants/inventory"
import { useIsMobile } from "@/hooks"
import { api } from "@/trpc/react"

import { InventoryStepperRow } from "./inventory-stepper-row"
import { useCasesCheckedOutStepper } from "./use-cases-checked-out-stepper"

interface ManageInventoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fundraiserId: string
  participantId: string
  initialCasesCheckedOut: number
  initialSoldInPerson: number
  /** Read-only in this dialog — driven by online orders, not editable by the parent. */
  soldOnline: number
}

const TITLE = "Manage Inventory"
const DESCRIPTION = "Update your inventory as bars are sold."
const SOLD_IN_PERSON_CEILING_WARNING = "Bars sold in-person cannot exceed the bars available to sell"

export function ManageInventoryDialog({
  open,
  onOpenChange,
  fundraiserId,
  participantId,
  initialCasesCheckedOut,
  initialSoldInPerson,
  soldOnline,
}: ManageInventoryDialogProps) {
  const isMobile = useIsMobile()
  const utils = api.useUtils()

  const [soldInPerson, setSoldInPerson] = useState(initialSoldInPerson)
  // One-shot guard so repeatedly clicking a blocked stepper doesn't stack duplicate toasts.
  const [soldInPersonCeilingWarned, setSoldInPersonCeilingWarned] = useState(false)

  const { casesCheckedOut, decrementCases, incrementCases, decrementBlocked } = useCasesCheckedOutStepper({
    open,
    initialCasesCheckedOut,
    barsPerCase: BARS_PER_CASE,
    soldInPerson,
    soldOnline,
  })

  // Reset to the saved value each time the dialog opens. Adjusted during render (rather than in
  // an effect) so the value is already settled before anything else in this render reads it.
  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setSoldInPerson(initialSoldInPerson)
      setSoldInPersonCeilingWarned(false)
    }
  }

  const saveInventory = api.digitalSalesInformation.saveInventory.useMutation({
    onSuccess: async () => {
      await utils.digitalSalesInformation.getByParticipantAndFundraiser.invalidate({ participantId, fundraiserId })
      onOpenChange(false)
    },
    onError: () => toast.error("Could not update the inventory details"),
  })

  const totalBars = casesCheckedOut * BARS_PER_CASE
  // totalBars can never be less than soldInPerson + soldOnline — enforced by the save guard and
  // by the stepper guards below — so no clamp is needed here.
  const availableBars = totalBars - soldInPerson - soldOnline
  const soldInPersonAtFloor = soldInPerson <= 0
  const soldInPersonAtCeiling = soldInPerson + soldOnline >= totalBars

  const decrementSoldInPerson = () => {
    if (soldInPersonAtFloor) return // no explanation needed for the hard floor of 0

    setSoldInPerson(soldInPerson - 1)
  }

  const incrementSoldInPerson = () => {
    if (soldInPersonAtCeiling) {
      if (!soldInPersonCeilingWarned) {
        toast.warning(SOLD_IN_PERSON_CEILING_WARNING)
        setSoldInPersonCeilingWarned(true)
      }
      return
    }

    setSoldInPersonCeilingWarned(false)
    setSoldInPerson(soldInPerson + 1)
  }

  const body = (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col rounded-control border bg-[#fbf6eb] px-3">
        <InventoryStepperRow
          label="Cases Checked Out"
          sublabel={`1 case = ${BARS_PER_CASE} bars`}
          value={casesCheckedOut}
          onDecrement={decrementCases}
          onIncrement={incrementCases}
          decrementBlocked={decrementBlocked}
          decrementLabel="Decrease cases checked out"
          incrementLabel="Increase cases checked out"
        />
        <InventoryStepperRow
          label="Bars Sold In Person"
          sublabel="Sold outside the app"
          value={soldInPerson}
          onDecrement={decrementSoldInPerson}
          onIncrement={incrementSoldInPerson}
          decrementBlocked={soldInPersonAtFloor}
          incrementBlocked={soldInPersonAtCeiling}
          decrementLabel="Decrease bars sold in person"
          incrementLabel="Increase bars sold in person"
        />
        <div className="flex items-center justify-between gap-4 py-3">
          <div>
            <div className="text-sm font-medium text-foreground">Bars Sold Online</div>
            <div className="mt-0.5 text-xs text-muted-foreground">Auto-updated from online orders</div>
          </div>
          <div className="text-lg font-semibold text-foreground">{soldOnline}</div>
        </div>
      </div>

      <div className="flex items-center justify-between px-1">
        <span className="text-sm font-medium text-foreground">Bars Available to Sell</span>
        <span className="text-xl font-bold text-foreground">{availableBars} bars</span>
      </div>

      <Button
        className="w-full"
        disabled={saveInventory.isPending}
        onClick={() =>
          saveInventory.mutate({ participantId, fundraiserId, casesCheckedOut, soldInPerson, source: "update" })
        }
      >
        Done
      </Button>
    </div>
  )

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>{TITLE}</SheetTitle>
            <SheetDescription>{DESCRIPTION}</SheetDescription>
          </SheetHeader>
          <div className="mt-4">{body}</div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={TITLE} description={DESCRIPTION}>
      {body}
    </Modal>
  )
}
