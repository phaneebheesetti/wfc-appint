import { User as UserIcon } from "lucide-react"
import { toast } from "sonner"

import { Modal } from "@/components/ui/modal"

import { type SignupUser } from "./signup"
import { SignupOrganizationAdminContactForm } from "./signup-organization-admin-contact-form"

interface SignupOrganizationAdminContactModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: SignupUser | null
  setUser: React.Dispatch<React.SetStateAction<SignupUser | null>>
}

export function SignupOrganizationAdminContactModal({
  open,
  onOpenChange,
  user,
  setUser,
}: SignupOrganizationAdminContactModalProps) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Need Help Connecting Your Child?"
      description="If you're having trouble finding your child, let us know below and we'll reach out to your organization's admin to make sure you get the support you need."
      icon={UserIcon}
      iconClassName="text-green-500"
    >
      <SignupOrganizationAdminContactForm
        user={user}
        setUser={setUser}
        onSuccess={() => {
          toast.success(
            "Your message has been sent to the organization admin. They will contact you within 1-2 business days."
          )
          onOpenChange(false)
        }}
      />
    </Modal>
  )
}
