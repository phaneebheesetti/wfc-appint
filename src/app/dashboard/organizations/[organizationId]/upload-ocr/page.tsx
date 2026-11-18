"use client"

import { useParams } from "next/navigation"

import { NotFound } from "@/components/not-found"
import { OrganizationsHeader } from "@/components/organizations/organizations-header"
import { UsersUpload } from "@/components/users/users-upload"

export default function UploadOcrPage() {
  const { organizationId } = useParams<{ organizationId: string }>()

  if (!organizationId) {
    return <NotFound />
  }

  return (
    <div className="flex flex-col gap-4">
      <OrganizationsHeader organizationId={organizationId} goBackHref={`/dashboard/organizations/${organizationId}`} />
      <UsersUpload title="Upload Images" organizationId={organizationId} />
    </div>
  )
}
