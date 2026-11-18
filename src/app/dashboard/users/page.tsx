"use client"

import { PageTitle } from "@/components/page-title"
import { UsersList } from "@/components/users"

export default function UsersPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageTitle title="Members" description="View, invite and manage people" />

      <UsersList />
    </div>
  )
}
