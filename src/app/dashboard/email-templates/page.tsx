"use client"

import { EmailsList } from "@/components/emails/emails-list"
import { PageTitle } from "@/components/page-title"

export default function EmailTemplatesPage() {
  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <PageTitle
        title="Email Templates"
        description="This special page is only accessible by admins and displays all email templates in the app"
      />
      <EmailsList />
    </div>
  )
}
