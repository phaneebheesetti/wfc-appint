import { Building } from "lucide-react"

import { OrganizationsForm } from "@/components/organizations/organizations-form"
import { Modal } from "@/components/ui/modal"
import { type OrganizationsVisibilityEnum } from "@/constants/organizations"
import { type Organization } from "@/server/db/schema"

interface OrganizationsCreateProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When provided, the popup opens in edit mode for this organization instead of creating a new one. */
  organization?: Organization
  /** Persist the new organization with a specific visibility (e.g. DRAFT during onboarding). */
  visibility?: OrganizationsVisibilityEnum
  /** When false, stay on the current page after creating instead of navigating to the org dashboard. Defaults to true. */
  redirectOnCreate?: boolean
  /** Called after the organization is created (in addition to closing the modal). */
  onCreated?: () => void
  /** Called after the organization is updated (in addition to closing the modal). */
  onUpdated?: () => void
  /** Overrides the success toast shown after creating (e.g. onboarding draft wording). */
  createSuccessMessage?: string
  /** Overrides the success toast shown after updating (e.g. onboarding draft wording). */
  updateSuccessMessage?: string
  /** When true, the Name field is a plain text input instead of the Salesforce org search typeahead (e.g. FC onboarding step 1 edit). */
  disableNameTypeahead?: boolean
}

export function OrganizationsCreate({
  open,
  onOpenChange,
  organization,
  visibility,
  redirectOnCreate,
  onCreated,
  onUpdated,
  createSuccessMessage,
  updateSuccessMessage,
  disableNameTypeahead,
}: OrganizationsCreateProps) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={organization ? "Edit Organization" : "Find Organization"}
      icon={Building}
      iconClassName="text-green-500"
    >
      <OrganizationsForm
        organization={organization}
        visibility={visibility}
        redirectOnCreate={redirectOnCreate}
        createSuccessMessage={createSuccessMessage}
        updateSuccessMessage={updateSuccessMessage}
        disableNameTypeahead={disableNameTypeahead}
        onCancel={() => onOpenChange(false)}
        onCreate={() => {
          onOpenChange(false)
          onCreated?.()
        }}
        onUpdate={() => {
          onOpenChange(false)
          onUpdated?.()
        }}
      />
    </Modal>
  )
}
