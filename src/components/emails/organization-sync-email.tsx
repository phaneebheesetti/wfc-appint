import { Row, Section, Text, render } from "@react-email/components"

import { EmailLayout } from "@/components/emails/email-layout"
import { NightlyJobStatusEnum } from "@/constants/nightly-jobs"

export interface OrganizationSyncEmailModification {
  modifiedFieldName: string
  from: string | null
  to: string | null
}

export interface OrganizationSyncEmailSuccessfulChange {
  organizationId: string
  accountNumber: string
  modifications: OrganizationSyncEmailModification[]
}

export interface OrganizationSyncEmailFailedModification {
  organizationId: string
  accountNumber: string
  error: string
}

export interface OrganizationSyncEmailProps {
  status: NightlyJobStatusEnum
  // Pre-formatted "YYYY-MM-DD HH:mm:ss" (UTC), matching NIGHTLY_JOBS.last_run.
  completedAt: string
  environment: string
  successfulChanges: OrganizationSyncEmailSuccessfulChange[]
  failedModifications: OrganizationSyncEmailFailedModification[]
}

const STATUS_DETAILS: Record<NightlyJobStatusEnum, { label: string; color: string }> = {
  [NightlyJobStatusEnum.SUCCESS]: { label: "Successful", color: "#16a34a" },
  [NightlyJobStatusEnum.PARTIAL_SUCCESS]: { label: "Partially Successful", color: "#f97316" },
  [NightlyJobStatusEnum.FAILURE]: { label: "Failed", color: "#dc2626" },
}

const formatValue = (value: string | null) => (value === null || value === "" ? "(none)" : value)

function SuccessfulChangesTable({ changes }: { changes: OrganizationSyncEmailSuccessfulChange[] }) {
  if (changes.length === 0) return null

  return (
    <Section className="my-6">
      <Text className="font-semibold mb-1">Successful Changes:</Text>
      <table className="w-full border-collapse text-sm" cellPadding={8}>
        <thead>
          <tr>
            <th className="border border-gray-300 bg-gray-50 text-left">Organization ID</th>
            <th className="border border-gray-300 bg-gray-50 text-left">Account Number</th>
            <th className="border border-gray-300 bg-gray-50 text-left">Modifications</th>
          </tr>
        </thead>
        <tbody>
          {changes.map(change => (
            <tr key={change.organizationId}>
              <td className="border border-gray-300 align-top">{change.organizationId}</td>
              <td className="border border-gray-300 align-top">{change.accountNumber}</td>
              <td className="border border-gray-300 align-top">
                {change.modifications.map(modification => (
                  <div key={modification.modifiedFieldName}>
                    {modification.modifiedFieldName}: {formatValue(modification.from)} -&gt;{" "}
                    {formatValue(modification.to)}
                  </div>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Section>
  )
}

function FailedModificationsTable({ failures }: { failures: OrganizationSyncEmailFailedModification[] }) {
  if (failures.length === 0) return null

  return (
    <Section className="my-6">
      <Text className="font-semibold mb-1">Failed Modifications:</Text>
      <table className="w-full border-collapse text-sm" cellPadding={8}>
        <thead>
          <tr>
            <th className="border border-gray-300 bg-gray-50 text-left">Organization ID</th>
            <th className="border border-gray-300 bg-gray-50 text-left">Account Number</th>
            <th className="border border-gray-300 bg-gray-50 text-left">Error</th>
          </tr>
        </thead>
        <tbody>
          {failures.map(failure => (
            <tr key={failure.organizationId}>
              <td className="border border-gray-300 align-top">{failure.organizationId}</td>
              <td className="border border-gray-300 align-top">{failure.accountNumber}</td>
              <td className="border border-gray-300 align-top">{failure.error}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Section>
  )
}

export function OrganizationSyncEmail({
  status,
  completedAt,
  environment,
  successfulChanges,
  failedModifications,
}: OrganizationSyncEmailProps) {
  const { label, color } = STATUS_DETAILS[status]

  return (
    <EmailLayout title="Organizations Sync from Salesforce" preview={`Organizations sync ${label.toLowerCase()}`}>
      <Section className="my-6">
        <Row>
          <Text>
            <strong>Status:</strong> <span style={{ color }}>{label}</span>
          </Text>
          <Text>
            <strong>Job completed at:</strong> {completedAt}
          </Text>
          <Text>
            <strong>Environment:</strong> {environment}
          </Text>
        </Row>
      </Section>

      <SuccessfulChangesTable changes={successfulChanges} />
      <FailedModificationsTable failures={failedModifications} />
    </EmailLayout>
  )
}

export default OrganizationSyncEmail

OrganizationSyncEmail.PreviewProps = {
  status: NightlyJobStatusEnum.PARTIAL_SUCCESS,
  completedAt: "2026-08-15 15:30:32",
  environment: "",
  successfulChanges: [
    {
      organizationId: "00000000-0000-0000-0000-000000000001",
      accountNumber: "12345",
      modifications: [{ modifiedFieldName: "name", from: "Old Name", to: "New Name" }],
    },
  ],
  failedModifications: [
    { organizationId: "00000000-0000-0000-0000-000000000002", accountNumber: "67890", error: "Update failed" },
  ],
} satisfies OrganizationSyncEmailProps

// Rendered from the (non-JSX) organization-sync script — kept here so the script never has to
// import React/JSX directly.
export const renderOrganizationSyncEmailHtml = (props: OrganizationSyncEmailProps) =>
  render(<OrganizationSyncEmail {...props} />)
