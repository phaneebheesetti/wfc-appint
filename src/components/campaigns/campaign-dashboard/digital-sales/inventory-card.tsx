import { AlertCircle, Pencil } from "lucide-react"
import { useState } from "react"

import { type InventoryDetails } from "@/server/db/schema"

import { ManageInventoryDialog } from "./manage-inventory-dialog"

interface InventoryCardProps {
  fundraiserId: string
  participantId: string
  inventoryDetails?: InventoryDetails
}

export function InventoryCard({ fundraiserId, participantId, inventoryDetails }: InventoryCardProps) {
  const [manageOpen, setManageOpen] = useState(false)
  const totalBars = inventoryDetails?.total_bars ?? 0
  const casesCheckedOut = inventoryDetails?.cases_checked_out ?? 0
  const soldInPerson = inventoryDetails?.sold_in_person ?? 0
  const soldOnline = inventoryDetails?.sold_online ?? 0
  // totalBars can never be less than soldInPerson + soldOnline — enforced by the save guard — so
  // no clamp is needed here.
  const available = totalBars - soldInPerson - soldOnline

  const pct = (value: number) => (totalBars > 0 ? (value / totalBars) * 100 : 0)

  return (
    <>
      <div className="rounded-card border bg-card p-4 shadow-elev-1">
        <div className="mb-3 flex items-center justify-between">
          <div className="font-bold">Inventory</div>
          <button
            type="button"
            className="flex items-center gap-1 text-xs font-medium text-primary"
            onClick={() => setManageOpen(true)}
          >
            <Pencil className="h-3 w-3" /> Update
          </button>
        </div>

        <div className="pb-0.5 pt-1.5 text-center text-[44px] font-bold leading-none text-foreground">{available}</div>
        <div className="mb-2.5 text-center text-xs text-muted-foreground">Bars available to sell</div>

        <div className="mb-2 flex h-2.5 overflow-hidden rounded-full bg-[#efe6d2]">
          <div className="h-full bg-[#16a34a]" style={{ width: `${pct(available)}%` }} />
          <div className="h-full bg-[#bda898]" style={{ width: `${pct(soldInPerson)}%` }} />
          <div className="h-full bg-[#ffa004]" style={{ width: `${pct(soldOnline)}%` }} />
        </div>
        <div className="mb-2 flex justify-between text-[10px] text-[#bda898]">
          <span>0</span>
          <span>{totalBars}</span>
        </div>

        <div className="flex flex-wrap justify-center gap-2.5">
          <LegendItem color="#16a34a" label={`${available} available`} />
          <LegendItem color="#bda898" label={`${soldInPerson} sold in-person`} />
          <LegendItem color="#ffa004" label={`${soldOnline} sold online`} />
        </div>

        {available <= 0 && (
          <div className="mt-2 flex items-start gap-2 rounded-control border border-[#f3bcbc] bg-[#fdecec] p-2.5">
            <AlertCircle className="mt-0.5 h-[15px] w-[15px] shrink-0 text-[#b91c1c]" />
            <span className="text-xs text-[#b91c1c]">
              Inventory at zero — sales page will show as sold out. Add more cases to restock.
            </span>
          </div>
        )}
      </div>

      <ManageInventoryDialog
        open={manageOpen}
        onOpenChange={setManageOpen}
        fundraiserId={fundraiserId}
        participantId={participantId}
        initialCasesCheckedOut={casesCheckedOut}
        initialSoldInPerson={soldInPerson}
        soldOnline={soldOnline}
      />
    </>
  )
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
      <div className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <span>{label}</span>
    </div>
  )
}
