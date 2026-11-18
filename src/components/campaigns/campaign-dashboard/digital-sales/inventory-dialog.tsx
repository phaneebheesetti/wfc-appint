"use client"

import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/modal"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { BARS_PER_CASE } from "@/constants/inventory"
import { useIsMobile } from "@/hooks"
import { api } from "@/trpc/react"

import { InventoryStepperRow } from "./inventory-stepper-row"
import { useCasesCheckedOutStepper } from "./use-cases-checked-out-stepper"

interface InventoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fundraiserId: string
  participantId: string
  initialCasesCheckedOut: number
  /** Preserved as-is by this dialog — needed only to enforce the same sold-based floor as Manage Inventory. */
  soldInPerson: number
  soldOnline: number
}

const TITLE = "Inventory Setup"
const DESCRIPTION = "Enter the number of cases you received from the organization."

export function InventoryDialog({
  open,
  onOpenChange,
  fundraiserId,
  participantId,
  initialCasesCheckedOut,
  soldInPerson,
  soldOnline,
}: InventoryDialogProps) {
  const isMobile = useIsMobile()
  const utils = api.useUtils()

  const { casesCheckedOut, decrementCases, incrementCases, decrementBlocked } = useCasesCheckedOutStepper({
    open,
    initialCasesCheckedOut,
    barsPerCase: BARS_PER_CASE,
    soldInPerson,
    soldOnline,
  })

  const saveInventory = api.digitalSalesInformation.saveInventory.useMutation({
    onSuccess: async () => {
      await utils.digitalSalesInformation.getByParticipantAndFundraiser.invalidate({ participantId, fundraiserId })
      onOpenChange(false)
    },
    onError: () => toast.error("Could not save the inventory details"),
  })

  const totalBars = casesCheckedOut * BARS_PER_CASE

  const body = (
    <div className="flex flex-col gap-5">
      <div className="rounded-control border bg-[#fbf6eb] px-3">
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
      </div>

      <div className="flex items-center justify-between px-1">
        <span className="text-sm font-medium text-foreground">Bars Available to Sell</span>
        <span className="text-xl font-bold text-foreground">{totalBars} bars</span>
      </div>

      <Button
        className="w-full"
        disabled={saveInventory.isPending}
        onClick={() => saveInventory.mutate({ participantId, fundraiserId, casesCheckedOut, source: "setup" })}
      >
        Save
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
