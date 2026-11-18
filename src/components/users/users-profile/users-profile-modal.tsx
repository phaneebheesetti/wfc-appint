import { User } from "lucide-react"

import { Modal } from "@/components/ui/modal"
import { useLoggedInUser } from "@/hooks"

import { UsersProfileForm } from "./users-profile-form"

export function UsersProfileModal() {
  const { isLoaded, isSignedIn, user } = useLoggedInUser()

  return (
    <Modal
      open={!!(isLoaded && isSignedIn && !user?.lastName)}
      onOpenChange={() => {}}
      title="Welcome! Let's Complete Your Profile!"
      description="Please fill out your details so we can personalize your experience"
      className="gap-4"
      icon={User}
      iconClassName="text-green-500"
      showCloseButton={false}
    >
      <UsersProfileForm />
    </Modal>
  )
}
