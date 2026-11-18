"use client"

import { Building2, CheckCircle2, Pencil } from "lucide-react"
import { useState } from "react"

import { OrganizationsCreate } from "@/components/organizations/organizations-create"
import { Button } from "@/components/ui/button"
import { OrganizationsVisibilityEnum } from "@/constants/organizations"
import type { Organization } from "@/server/db/schema"

type Step1CreateOrganizationProps = {
  organization?: Organization | null
  onCreated: () => Promise<void> | void
}

export function Step1CreateOrganization({ organization, onCreated }: Step1CreateOrganizationProps) {
  const [open, setOpen] = useState(false)

  // Once the organization exists this step is complete — show a summary instead of the create form,
  // so the FC can't create a second organization from onboarding. Editing the existing draft is still
  // allowed via the same popup (opened in edit mode).
  if (organization) {
    const address = [organization.street, organization.city, organization.state, organization.postalCode]
      .filter(Boolean)
      .join(", ")
    return (
      <>
        <div className="flex items-center gap-3 rounded-card border border-green-200 bg-green-50 px-4 py-3 text-sm">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
          <div className="flex-1 space-y-0.5 text-green-900">
            <div>
              <span className="font-semibold">Organization Name</span> - {organization.name}
            </div>
            <div>
              <span className="font-semibold">Organization Address</span> - {address}
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
            <Pencil /> Edit
          </Button>
        </div>

        <OrganizationsCreate
          open={open}
          onOpenChange={setOpen}
          organization={organization}
          updateSuccessMessage="Organization updated"
          onUpdated={() => void onCreated()}
          disableNameTypeahead
        />
      </>
    )
  }

  return (
    <>
      <p className="mb-4 text-sm text-muted-foreground">Add the school, club, or team you&apos;ll fundraise for.</p>
      <Button type="button" onClick={() => setOpen(true)}>
        <Building2 /> Create Organization
      </Button>

      <OrganizationsCreate
        open={open}
        onOpenChange={setOpen}
        visibility={OrganizationsVisibilityEnum.DRAFT}
        redirectOnCreate={false}
        createSuccessMessage="Organization saved as draft"
        onCreated={() => void onCreated()}
      />
    </>
  )
}
