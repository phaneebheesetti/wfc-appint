"use client"

import { OrganizationsList } from "@/components/organizations"
import { PageTitle } from "@/components/page-title"

export default function OrganizationsPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageTitle title="Organizations" description="View, create and manage organizations" />

      <OrganizationsList />
    </div>
  )
}
