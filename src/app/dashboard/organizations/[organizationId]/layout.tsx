import { type Metadata } from "next"

import { APP_NAME } from "@/constants/app"
import { createServiceClient } from "@/lib/supabase/service-client"

type LayoutProps = {
  params: Promise<{ organizationId: string }>
  children: React.ReactNode
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { organizationId } = await params

  const supabaseServiceClient = createServiceClient()
  const { data } = await supabaseServiceClient.from("organizations").select("name").eq("id", organizationId).single()

  const organizationName = data?.name ?? "Organization"

  return {
    title: `${organizationName} - ${APP_NAME}`,
  }
}

export default function OrganizationsLayout({ children }: LayoutProps) {
  return children
}
