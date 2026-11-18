"use client"

import { SignupStepEnum, type SignupUser } from "../signup"
import { SignupOrganizationAdminContactForm } from "../signup-organization-admin-contact-form"
import { SignupTitle } from "../signup-title"

interface SignupOrganizationAdminContactStepProps {
  user: SignupUser | null
  setUser: React.Dispatch<React.SetStateAction<SignupUser | null>>
  onStepChange: (step: SignupStepEnum) => void
}

export function SignupOrganizationAdminContactStep({
  user,
  setUser,
  onStepChange,
}: SignupOrganizationAdminContactStepProps) {
  return (
    <div className="flex flex-col gap-6 w-full max-w-md mb-4">
      <SignupTitle
        title="Need Help Connecting Your Child?"
        description="If you're having trouble finding your child, let us know below and we'll reach out to your organization's admin to make sure you get the support you need."
        onGoBack={() => onStepChange(SignupStepEnum.CHILDREN_SELECTION)}
      />

      <SignupOrganizationAdminContactForm
        user={user}
        setUser={setUser}
        onSuccess={() => onStepChange(SignupStepEnum.FINISHED_FAILURE_ORGANIZATION_ADMIN_NOTIFIED)}
      />
    </div>
  )
}
