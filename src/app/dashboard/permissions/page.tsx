"use client"

import { PageTitle } from "@/components/page-title"
import { PermissionsList } from "@/components/permissions"

export default function PermissionsPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageTitle
        title="Permissions Matrix"
        description="This special page is only accessible by admins and displays a technical overview of every permission assigned to each role within the app. Intended for advanced users, this matrix is not optimized for general user-friendliness."
      />

      <PermissionsList />
    </div>
  )
}
