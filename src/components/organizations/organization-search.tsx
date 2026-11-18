import { Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export type OrganizationSearchMode = "accountNumber" | "name" | "contactEmail"

interface OrganizationSearchProps {
  mode: OrganizationSearchMode
  value: string
  onValueChange: (value: string) => void
  onSearch: () => void
  onModeChange: (mode: OrganizationSearchMode) => void
  hasError: boolean
  searching: boolean
  input?: React.ReactNode
}

const MODE_CONFIG: Record<
  OrganizationSearchMode,
  { fieldLabel: string; placeholder: string; switchLabel: string; errorLabel: string }
> = {
  accountNumber: {
    fieldLabel: "Account Number",
    placeholder: "Enter account number",
    switchLabel: "Search by account number",
    errorLabel: "account number",
  },
  name: {
    fieldLabel: "Organization Name",
    placeholder: "Enter organization name",
    switchLabel: "Search by organization name",
    errorLabel: "organization name",
  },
  contactEmail: {
    fieldLabel: "Contact Email",
    placeholder: "Enter contact email",
    switchLabel: "Search by contact email",
    errorLabel: "contact email",
  },
}

const MODE_ORDER: OrganizationSearchMode[] = ["accountNumber", "name", "contactEmail"]

export function OrganizationSearch({
  mode,
  value,
  onValueChange,
  onSearch,
  onModeChange,
  hasError,
  searching,
  input,
}: OrganizationSearchProps) {
  const config = MODE_CONFIG[mode]
  const otherModes = MODE_ORDER.filter(m => m !== mode)

  return (
    <div className="col-span-2 w-full space-y-5">
      <div>
        {mode !== "accountNumber" && (
          <div className="mb-4 flex items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-1">
            <div>
              <div className="text-sm font-semibold text-yellow-900">Searching by {config.errorLabel}</div>
            </div>
          </div>
        )}
        <label className="mb-2 block text-sm font-medium">
          {config.fieldLabel}
          <span className="text-red-500"> *</span>
        </label>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />

            {input ?? (
              <Input
                value={value}
                onChange={e => onValueChange(e.target.value)}
                placeholder={config.placeholder}
                className="pl-9"
              />
            )}
          </div>

          <Button type="button" disabled={searching} onClick={onSearch}>
            {searching ? "Searching..." : "Search"}
          </Button>
        </div>

        <div className="mt-2 flex gap-4">
          {otherModes.map(otherMode => (
            <button
              key={otherMode}
              type="button"
              onClick={() => onModeChange(otherMode)}
              className="text-sm text-primary underline"
            >
              {MODE_CONFIG[otherMode].switchLabel}
            </button>
          ))}
        </div>
      </div>

      {hasError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm">
          <div className="flex items-center gap-2 font-medium">
            <span className="text-lg">⚠️</span>

            <span>No match found</span>
          </div>

          <div className="mt-1 text-muted-foreground">
            Please check the {config.errorLabel} and try searching again.
          </div>
        </div>
      )}
    </div>
  )
}
