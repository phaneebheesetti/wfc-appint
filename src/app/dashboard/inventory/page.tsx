"use client"

import { InventoryCasesList } from "@/components/inventory/inventory-cases-list"
import { PageTitle } from "@/components/page-title"

export default function InventoryPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageTitle title="Inventory" description="Track and manage cases" />

      <InventoryCasesList />
    </div>
  )
}
