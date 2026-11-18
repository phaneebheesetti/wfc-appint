"use client"

import { Chatbox } from "@/components/messaging/chat-box"
import { PageTitle } from "@/components/page-title"

export default function ChatPage() {
  return (
    <div className="flex flex-col gap-4 h-full">
      <PageTitle title="Messages" description="See all your messages and announcements" />

      <Chatbox />
    </div>
  )
}
