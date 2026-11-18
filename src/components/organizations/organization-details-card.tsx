export interface OrganizationDetails {
  accountNumber: string
  name: string
  contactEmail: string
  street: string
  city: string
  state: string
  postalCode: string
}
interface OrganizationDetailsCardProps {
  organization: OrganizationDetails
}

export function OrganizationDetailsCard({ organization }: OrganizationDetailsCardProps) {
  return (
    <div className="w-full rounded-lg border bg-background">
      <div className="px-6 py-4">
        <h3 className="text-xs uppercase font-bold text-muted-foreground">Organization Details</h3>
      </div>

      <div className="space-y-5 px-6 pb-6">
        <Field label="Account Number" value={organization.accountNumber} />

        <Field label="Organization Name" value={organization.name} />

        <Field label="Street Address" value={organization.street} />

        <Field label="City" value={organization.city} />

        <Field label="State / Province" value={organization.state} />

        <Field label="Postal Code" value={organization.postalCode} />

        <Field label="Contact Email" value={organization.contactEmail} />
      </div>
    </div>
  )
}

interface FieldProps {
  label: string
  value?: string | null
}

function Field({ label, value }: FieldProps) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>

      <div className="text-sm font-medium break-words">{value?.trim() ? value : "-"}</div>
    </div>
  )
}
