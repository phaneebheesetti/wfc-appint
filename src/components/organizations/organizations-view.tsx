import parsePhoneNumberFromString from "libphonenumber-js"

import { StripeConnectButton } from "@/components/stripe-connect"
import { Address } from "@/components/ui/address"
import { FieldText } from "@/components/ui/text"
import { RolesEnum } from "@/constants/roles"
import { UsersStatusEnum } from "@/constants/users"
import { useLoggedInUser } from "@/hooks"
import { type Organization, type User } from "@/server/db/schema"
import { formatDateAndTime } from "@/utils/date"
import { getUserDisplayName } from "@/utils/users"

interface OrganizationsViewProps {
  organization: Organization
  organizationFCDetails: User
}

export function OrganizationsView({ organization, organizationFCDetails }: OrganizationsViewProps) {
  const { loggedInRole: role } = useLoggedInUser()

  const formatPhoneNumber = () => {
    let formattedFCPhoneNumber = null
    if (!!organizationFCDetails && !!organizationFCDetails?.phone) {
      const phone = parsePhoneNumberFromString(organizationFCDetails.phone)
      if (phone?.isValid()) {
        formattedFCPhoneNumber = phone.formatNational()
      } else {
        formattedFCPhoneNumber = organizationFCDetails.phone
      }
      return formattedFCPhoneNumber
    } else {
      return false
    }
  }

  if (!role) {
    return null
  }

  return (
    <div className="flex flex-col gap-4">
      <FieldText label="Organization ID" value={organization.id} adminOnly />
      <FieldText label="Account Number" value={organization.accountNumber} />
      <FieldText label="Contact Email" value={organization.contactEmail} valueClassName="first-letter:normal-case" />
      <FieldText
        label="Address"
        value={
          <Address
            street={organization.street ?? ""}
            city={organization.city ?? ""}
            state={organization.state ?? ""}
            postalCode={organization.postalCode ?? ""}
          />
        }
      />

      <FieldText
        label="Stripe Connected Account ID"
        value={
          organization.stripeConnectedAccountId ?? (
            <StripeConnectButton organizationId={organization.id} className="items-start" />
          )
        }
        valueClassName="w-full first-letter:lowercase"
      />

      <FieldText
        label="Admin"
        value={
          <>
            <div>{getUserDisplayName(organization.adminUser)}</div>
            <div className="text-xs text-muted-foreground">{organization.adminUser?.email ?? ""}</div>
          </>
        }
      />
      <FieldText label="Admin ID" value={organization.adminUser?.id} adminOnly />

      <FieldText
        label="Created By"
        value={
          <>
            <div>{getUserDisplayName(organization.createdByUser)}</div>
            <div className="text-xs text-muted-foreground">{organization.createdByUser?.email ?? ""}</div>
          </>
        }
      />
      <FieldText label="Created By ID" value={organization.createdByUser?.id} adminOnly />

      <FieldText label="Created On" value={organization.createdAt ? formatDateAndTime(organization.createdAt) : ""} />

      {!!organizationFCDetails && (
        <div className="w-full max-w-2xl rounded-xl bg-blue-100/60 p-5 shadow-elev-1 border border-blue-200">
          <div>
            <div className="text-md text-blue-800 font-medium">Fundraising Consultant</div>

            {organizationFCDetails.role === RolesEnum.SALES_REPRESENTATIVE &&
              (organizationFCDetails.status === UsersStatusEnum.ACTIVE ||
                organizationFCDetails.status === UsersStatusEnum.PENDING) && (
                <h2 className="text-lg font-semibold text-blue-900">{organizationFCDetails?.fullName}</h2>
              )}
            {(organizationFCDetails.role !== RolesEnum.SALES_REPRESENTATIVE ||
              (organizationFCDetails.role === RolesEnum.SALES_REPRESENTATIVE &&
                organizationFCDetails.status !== UsersStatusEnum.ACTIVE &&
                organizationFCDetails.status !== UsersStatusEnum.PENDING)) && (
              <h2 className="text-lg font-semibold text-muted-foreground">Unassigned</h2>
            )}

            {organizationFCDetails.role === RolesEnum.SALES_REPRESENTATIVE &&
              (organizationFCDetails.status === UsersStatusEnum.ACTIVE ||
                organizationFCDetails.status === UsersStatusEnum.PENDING) && (
                <>
                  <div className="text-sm text-blue-700">{organizationFCDetails?.email}</div>
                  {!!formatPhoneNumber() && <div className="text-sm text-blue-700 mt-[3px]">{formatPhoneNumber()}</div>}
                </>
              )}
          </div>
        </div>
      )}
    </div>
  )
}
