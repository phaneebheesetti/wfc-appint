import { useState } from "react"
import { toast } from "sonner"

export const MIN_CASES_CHECKED_OUT = 1

const CASES_FLOOR_WARNING = "Total bars cannot be less than the bars already sold in-person and online"

interface UseCasesCheckedOutStepperArgs {
  /** Reset the stepper to `initialCasesCheckedOut` each time this flips to true. */
  open: boolean
  initialCasesCheckedOut: number
  soldInPerson: number
  soldOnline: number
  barsPerCase: number
}

/**
 * Shared Cases Checked Out stepper behavior for both the initial setup and the ongoing Manage
 * Inventory dialogs — same restrictions, same feedback, so the two flows can't drift apart:
 *   - Hard floor of 1 case. No upper limit — parents can add as many cases as they like.
 *   - Can't decrement below whatever's needed to cover bars already sold in-person/online.
 *   - The decrement stepper stays clickable even while blocked, so a click always explains why
 *     via a toast (deduped so it doesn't stack on repeat clicks) — except at the hard floor of 1,
 *     which is self-explanatory and needs no toast.
 */
export function useCasesCheckedOutStepper({
  open,
  initialCasesCheckedOut,
  barsPerCase,
  soldInPerson,
  soldOnline,
}: UseCasesCheckedOutStepperArgs) {
  const [casesCheckedOut, setCasesCheckedOut] = useState(initialCasesCheckedOut)
  const [casesFloorWarned, setCasesFloorWarned] = useState(false)

  // Reset to the saved value, clamped to the valid range, each time the dialog opens. Adjusted
  // during render (rather than in an effect) so the value is already settled before anything else
  // in this render reads it.
  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setCasesCheckedOut(Math.max(initialCasesCheckedOut, MIN_CASES_CHECKED_OUT))
      setCasesFloorWarned(false)
    }
  }

  const casesAtAbsoluteFloor = casesCheckedOut <= MIN_CASES_CHECKED_OUT
  const casesAtSoldFloor = !casesAtAbsoluteFloor && (casesCheckedOut - 1) * barsPerCase < soldInPerson + soldOnline

  const decrementCases = () => {
    if (casesAtAbsoluteFloor) return // no explanation needed for the hard floor of 1

    if (casesAtSoldFloor) {
      if (!casesFloorWarned) {
        toast.warning(CASES_FLOOR_WARNING)
        setCasesFloorWarned(true)
      }
      return
    }

    setCasesFloorWarned(false)
    setCasesCheckedOut(casesCheckedOut - 1)
  }

  const incrementCases = () => {
    setCasesCheckedOut(casesCheckedOut + 1)
  }

  return {
    casesCheckedOut,
    decrementCases,
    incrementCases,
    decrementBlocked: casesAtAbsoluteFloor || casesAtSoldFloor,
  }
}
