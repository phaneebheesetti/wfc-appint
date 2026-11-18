"use client"

import { useRouter } from "next/navigation"

import { PageTitle } from "@/components/page-title"
import { UsersProfileForm } from "@/components/users/users-profile/users-profile-form"

export default function UsersProfilePage() {
  const router = useRouter()

  return (
    <div className="flex flex-col gap-4">
      <PageTitle title="Your Profile" description="View and update your profile" />

      <UsersProfileForm
        onSuccess={() => {
          return router.replace("/dashboard")
        }}
      />
    </div>
  )
}
