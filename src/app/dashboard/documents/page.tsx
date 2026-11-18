"use client"

import { DocumentsUsersList } from "@/components/documents-users"
import { PageTitle } from "@/components/page-title"
import { TabsWithHash } from "@/components/ui/tabs"
import { DocumentsUsersStatusEnum } from "@/constants/documents-users"

export default function DocumentsPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageTitle title="Documents" description="Manage and track document signatures" />

      <TabsWithHash
        tabs={[
          {
            label: "Pending",
            value: "pending",
            content: <DocumentsUsersList status={DocumentsUsersStatusEnum.PENDING} />,
          },
          {
            label: "Signed",
            value: "signed",
            content: <DocumentsUsersList status={DocumentsUsersStatusEnum.SIGNED} />,
          },
        ]}
        tabsListClassName="flex-row"
      />
    </div>
  )
}
